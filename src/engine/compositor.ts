/**
 * Compositor — rAF-driven render loop.
 *
 * Each frame:
 *   1. Clear canvas to black.
 *   2. Walk video tracks in order (bottom → top).
 *   3. For each clip active at currentTime, seek its <video> element and
 *      drawImage with the clip's transform applied.
 *
 * currentTime is injected externally (from the store / playback controller).
 * The compositor itself is stateless w.r.t. time — it just draws whatever
 * time it's told.
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

    // Resize canvas to match project resolution (only when it changes)
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, width, height);

    for (const track of project.tracks) {
      if (track.type !== "video") continue;
      this.renderTrack(track, currentTime, width, height);
    }
  }

  private renderTrack(track: Track, currentTime: number, projW: number, projH: number) {
    for (const clip of track.clips) {
      const clipDuration = clip.outPoint - clip.inPoint;
      const clipEnd = clip.timelineStart + clipDuration;

      if (currentTime < clip.timelineStart || currentTime >= clipEnd) continue;

      const entry = sourceRegistry.get(clip.sourceId);
      if (!entry) continue;

      // Seek the video element to the source time for this clip
      const sourceTime = clip.inPoint + (currentTime - clip.timelineStart);
      // Only seek if more than 1 frame off to avoid thrashing
      if (Math.abs(entry.videoEl.currentTime - sourceTime) > 1 / 60) {
        entry.videoEl.currentTime = sourceTime;
      }

      this.drawClip(entry.videoEl, clip, entry.width, entry.height, projW, projH);
    }
  }

  private drawClip(
    source: HTMLVideoElement,
    clip: Clip,
    srcW: number,
    srcH: number,
    projW: number,
    projH: number,
  ) {
    const t = { ...DEFAULT_TRANSFORM, ...clip.transform };
    const ctx = this.ctx;

    // Compute draw size: fit source into project resolution by default
    const fitScale = Math.min(projW / srcW, projH / srcH);
    const drawW = srcW * fitScale * t.scaleX;
    const drawH = srcH * fitScale * t.scaleY;

    // Center + transform offset
    const cx = projW / 2 + t.x;
    const cy = projH / 2 + t.y;

    ctx.save();
    ctx.translate(cx, cy);
    if (t.rotation !== 0) ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}
