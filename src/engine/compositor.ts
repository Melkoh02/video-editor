/**
 * Compositor — rAF-driven render loop.
 *
 * Renders video tracks (video clips, image clips, and text overlay clips)
 * with scale, rotation, translation, and opacity transforms.
 */

import type { Project, Track, Clip, Transform } from "../types";
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

  private render() {
    const project = this.getProject();
    const currentTime = this.getCurrentTime();
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
    for (const track of videoTracks) {
      if (track.muted) continue;
      this.renderTrack(track, currentTime, width, height);
    }
  }

  private renderTrack(track: Track, currentTime: number, projW: number, projH: number) {
    for (const clip of track.clips) {
      const clipDuration = clip.outPoint - clip.inPoint;
      const clipEnd = clip.timelineStart + clipDuration;

      if (currentTime < clip.timelineStart || currentTime >= clipEnd) continue;

      if (clip.mediaType === "text" || clip.text) {
        this.drawTextClip(clip, projW, projH);
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
        this.drawMediaClip(videoEl, clip, entry.width, entry.height, projW, projH);
      } else if (entry.type === "image") {
        const imgEl = entry.element as HTMLImageElement;
        this.drawMediaClip(imgEl, clip, entry.width, entry.height, projW, projH);
      }
    }
  }

  private drawMediaClip(
    source: CanvasImageSource,
    clip: Clip,
    srcW: number,
    srcH: number,
    projW: number,
    projH: number
  ) {
    const t = { ...DEFAULT_TRANSFORM, ...clip.transform };
    const opacity = clip.opacity !== undefined ? clip.opacity : 1;
    if (opacity <= 0) return;

    const ctx = this.ctx;
    const fitScale = Math.min(projW / (srcW || 1920), projH / (srcH || 1080));
    const drawW = (srcW || 1920) * fitScale * t.scaleX;
    const drawH = (srcH || 1080) * fitScale * t.scaleY;

    const cx = projW / 2 + t.x;
    const cy = projH / 2 + t.y;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(cx, cy);
    if (t.rotation !== 0) ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  private drawTextClip(clip: Clip, projW: number, projH: number) {
    const t = { ...DEFAULT_TRANSFORM, ...clip.transform };
    const opacity = clip.opacity !== undefined ? clip.opacity : 1;
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
