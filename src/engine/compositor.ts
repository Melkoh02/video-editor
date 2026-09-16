/**
 * Compositor — rAF-driven render loop.
 *
 * Renders video tracks (video clips, image clips, and text overlay clips)
 * with scale, rotation, translation, opacity transforms, CSS filters,
 * and fade-in / fade-out opacity transitions.
 */

import type { Project, Track, Clip, Transform, Filters } from "../types";
import { DEFAULT_FILTERS } from "../types";
import { sourceRegistry } from "./sourceRegistry";

export type CompositorOptions = {
  canvas: HTMLCanvasElement;
  getProject: () => Project;
  getCurrentTime: () => number;
};

const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

export class Compositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private getProject: () => Project;
  private getCurrentTime: () => number;
  private rafId: number | null = null;

  constructor(opts: CompositorOptions) {
    this.canvas = opts.canvas;
    this.ctx = opts.canvas.getContext("2d")!;
    this.getProject = opts.getProject;
    this.getCurrentTime = opts.getCurrentTime;
  }

  start() {
    if (this.rafId !== null) return;
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public render(customProject?: Project, customTime?: number) {
    const project = customProject || this.getProject();
    const currentTime = customTime !== undefined ? customTime : this.getCurrentTime();
    const { width, height } = project.resolution;

    // Resize canvas to match project resolution
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, width, height);

    // Filter video tracks & render in track order (bottom to top)
    const videoTracks = project.tracks.filter((t) => t.type === "video");
    const hasSoloed = videoTracks.some((t) => t.soloed);

    for (const track of videoTracks) {
      if (track.muted) continue;
      if (hasSoloed && !track.soloed) continue;
      this.renderTrack(track, currentTime, width, height);
    }
  }

  private renderTrack(track: Track, currentTime: number, projW: number, projH: number) {
    for (const clip of track.clips) {
      const clipDuration = clip.outPoint - clip.inPoint;
      const clipEnd = clip.timelineStart + clipDuration;

      if (currentTime < clip.timelineStart || currentTime >= clipEnd) continue;

      if (clip.mediaType === "text" || clip.text) {
        this.drawTextClip(clip, currentTime, projW, projH);
        continue;
      }

      const entry = sourceRegistry.get(clip.sourceId);
      if (!entry) continue;

      if (entry.type === "video") {
        const videoEl = entry.element as HTMLVideoElement;
        const sourceTime = clip.inPoint + (currentTime - clip.timelineStart);
        if (Math.abs(videoEl.currentTime - sourceTime) > 1 / 60) {
          videoEl.currentTime = sourceTime;
        }
        this.drawMediaClip(videoEl, clip, currentTime, entry.width, entry.height, projW, projH);
      } else if (entry.type === "image") {
        const imgEl = entry.element as HTMLImageElement;
        this.drawMediaClip(imgEl, clip, currentTime, entry.width, entry.height, projW, projH);
      }
    }
  }

  /** Compute interpolated transform for clip based on keyframe track */
  private computeAnimatedTransform(clip: Clip, currentTime: number): Transform {
    const base = { ...DEFAULT_TRANSFORM, ...clip.transform };
    if (!clip.keyframes || clip.keyframes.length === 0) return base;

    const relTime = currentTime - clip.timelineStart;
    const sorted = [...clip.keyframes].sort((a, b) => a.time - b.time);

    if (relTime <= sorted[0].time) {
      return {
        x: sorted[0].x ?? base.x,
        y: sorted[0].y ?? base.y,
        scaleX: sorted[0].scaleX ?? base.scaleX,
        scaleY: sorted[0].scaleY ?? base.scaleY,
        rotation: sorted[0].rotation ?? base.rotation,
      };
    }

    if (relTime >= sorted[sorted.length - 1].time) {
      const last = sorted[sorted.length - 1];
      return {
        x: last.x ?? base.x,
        y: last.y ?? base.y,
        scaleX: last.scaleX ?? base.scaleX,
        scaleY: last.scaleY ?? base.scaleY,
        rotation: last.rotation ?? base.rotation,
      };
    }

    // Find bounding keyframes
    let prev = sorted[0];
    let next = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (relTime >= sorted[i].time && relTime <= sorted[i + 1].time) {
        prev = sorted[i];
        next = sorted[i + 1];
        break;
      }
    }

    const duration = next.time - prev.time;
    const factor = duration > 0 ? (relTime - prev.time) / duration : 0;

    const interp = (a: number | undefined, b: number | undefined, fallback: number) => {
      const start = a ?? fallback;
      const end = b ?? fallback;
      return start + (end - start) * factor;
    };

    return {
      x: interp(prev.x, next.x, base.x),
      y: interp(prev.y, next.y, base.y),
      scaleX: interp(prev.scaleX, next.scaleX, base.scaleX),
      scaleY: interp(prev.scaleY, next.scaleY, base.scaleY),
      rotation: interp(prev.rotation, next.rotation, base.rotation),
    };
  }

  /** Compute effective opacity including fade-in / fade-out & cross-dissolve transitions */
  private computeFadedOpacity(clip: Clip, currentTime: number): number {
    let opacity = clip.opacity !== undefined ? clip.opacity : 1;
    if (opacity <= 0) return 0;

    const elapsed = currentTime - clip.timelineStart;
    const clipDuration = clip.outPoint - clip.inPoint;
    const remaining = clipDuration - elapsed;

    if (clip.fadeIn && clip.fadeIn > 0 && elapsed < clip.fadeIn) {
      opacity *= elapsed / clip.fadeIn;
    }
    if (clip.fadeOut && clip.fadeOut > 0 && remaining < clip.fadeOut) {
      opacity *= remaining / clip.fadeOut;
    }

    // Cross-dissolve blend transition
    if (clip.crossDissolve && clip.crossDissolve > 0) {
      if (elapsed < clip.crossDissolve) {
        opacity *= Math.sin((elapsed / clip.crossDissolve) * (Math.PI / 2));
      }
    }

    return Math.max(0, Math.min(1, opacity));
  }

  /** Build a CSS filter string from clip filters */
  private buildFilterString(filters?: Filters): string {
    if (!filters) return "none";
    const f = { ...DEFAULT_FILTERS, ...filters };
    if (
      f.brightness === 100 &&
      f.contrast === 100 &&
      f.saturation === 100 &&
      f.blur === 0 &&
      f.sepia === 0 &&
      f.hueRotate === 0 &&
      f.invert === 0 &&
      f.grayscale === 0
    ) {
      return "none";
    }
    return [
      `brightness(${f.brightness / 100})`,
      `contrast(${f.contrast / 100})`,
      `saturate(${f.saturation / 100})`,
      f.blur > 0 ? `blur(${f.blur}px)` : "",
      f.sepia > 0 ? `sepia(${f.sepia}%)` : "",
      f.hueRotate !== 0 ? `hue-rotate(${f.hueRotate}deg)` : "",
      f.invert > 0 ? `invert(${f.invert}%)` : "",
      f.grayscale > 0 ? `grayscale(${f.grayscale}%)` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private drawMediaClip(
    source: CanvasImageSource,
    clip: Clip,
    currentTime: number,
    srcW: number,
    srcH: number,
    projW: number,
    projH: number
  ) {
    const t = this.computeAnimatedTransform(clip, currentTime);
    const opacity = this.computeFadedOpacity(clip, currentTime);
    if (opacity <= 0) return;

    const ctx = this.ctx;
    const fitScale = Math.min(projW / (srcW || 1920), projH / (srcH || 1080));
    const drawW = (srcW || 1920) * fitScale * t.scaleX;
    const drawH = (srcH || 1080) * fitScale * t.scaleY;

    const cx = projW / 2 + t.x;
    const cy = projH / 2 + t.y;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.filter = this.buildFilterString(clip.filters);
    ctx.translate(cx, cy);
    if (t.rotation !== 0) ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  private drawTextClip(clip: Clip, currentTime: number, projW: number, projH: number) {
    const t = this.computeAnimatedTransform(clip, currentTime);
    const opacity = this.computeFadedOpacity(clip, currentTime);
    if (opacity <= 0 || !clip.text) return;

    const {
      content = "Text Overlay",
      fontSize = 64,
      fontFamily = "Inter",
      color = "#ffffff",
      backgroundColor,
      strokeColor,
      strokeWidth,
    } = clip.text;

    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.filter = this.buildFilterString(clip.filters);
    ctx.font = `600 ${fontSize}px ${fontFamily}, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const metrics = ctx.measureText(content);
    const textWidth = metrics.width || 200;
    const textHeight = fontSize * 1.2;

    const cx = projW / 2 + t.x;
    const cy = projH / 2 + t.y;

    ctx.translate(cx, cy);
    if (t.rotation !== 0) ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scaleX, t.scaleY);

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(-textWidth / 2 - 16, -textHeight / 2 - 8, textWidth + 32, textHeight + 16);
    }

    if (strokeColor && strokeWidth) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(content, 0, 0);
    }

    ctx.fillStyle = color;
    ctx.fillText(content, 0, 0);

    ctx.restore();
  }
}
