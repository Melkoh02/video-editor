/**
 * PlaybackController — manages play/pause/seek and advances currentTime.
 *
 * Synchronizes video and audio media elements with timeline time and track volume/mute states.
 */

import { useAppStore } from "../state/store";
import { sourceRegistry } from "./sourceRegistry";
import { audioEngine } from "./audioEngine";

class PlaybackController {
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;

  play() {
    audioEngine.resume();
    const store = useAppStore.getState();
    const totalDuration = this.projectDuration(store);
    const startBound = store.inPoint !== null ? Math.max(0, store.inPoint) : 0;
    const endBound = store.outPoint !== null ? Math.min(totalDuration, store.outPoint) : totalDuration;

    if (store.currentTime >= endBound) {
      store.setCurrentTime(startBound);
    }

    store.play();
    this.lastTimestamp = null;
    this.tick();
  }

  pause() {
    this.stopLoop();
    useAppStore.getState().pause();
    this.syncMediaElements(false);
  }

  stop() {
    this.stopLoop();
    const store = useAppStore.getState();
    const startBound = store.inPoint !== null ? Math.max(0, store.inPoint) : 0;
    store.stop();
    store.setCurrentTime(startBound);
    this.syncMediaElements(false);
  }

  seek(t: number) {
    useAppStore.getState().setCurrentTime(t);
    this.syncMediaElements(useAppStore.getState().playerState === "playing");
  }

  private tick() {
    this.rafId = requestAnimationFrame((ts) => {
      const store = useAppStore.getState();
      if (store.playerState !== "playing") return;

      if (this.lastTimestamp !== null) {
        const delta = (ts - this.lastTimestamp) / 1000;
        const next = store.currentTime + delta;

        // Compute total duration and work area bounds
        const totalDuration = this.projectDuration(store);
        const startBound = store.inPoint !== null ? Math.max(0, store.inPoint) : 0;
        const endBound = store.outPoint !== null ? Math.min(totalDuration, store.outPoint) : totalDuration;

        if (next >= endBound) {
          if (store.isLooping) {
            store.setCurrentTime(startBound);
          } else {
            store.setCurrentTime(endBound);
            store.pause();
            this.syncMediaElements(false);
            return;
          }
        } else {
          store.setCurrentTime(next);
        }
      }
      this.lastTimestamp = ts;
      this.syncMediaElements(true);
      this.tick();
    });
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
  }

  private projectDuration(store: ReturnType<typeof useAppStore.getState>): number {
    let max = 0;
    for (const track of store.project.tracks) {
      for (const clip of track.clips) {
        const end = clip.timelineStart + (clip.outPoint - clip.inPoint);
        if (end > max) max = end;
      }
    }
    return max || 10;
  }

  /** Sync all video and audio elements according to play state, current time, and volume. */
  public syncMediaElements(isPlaying: boolean) {
    const store = useAppStore.getState();
    const currentTime = store.currentTime;

    // Track active sources to pause non-active ones
    const activeSources = new Set<HTMLMediaElement>();
    let totalVolumePeak = 0;

    const hasSoloedTracks = store.project.tracks.some((t) => t.soloed);

    for (const track of store.project.tracks) {
      const isTrackMuted = track.muted || (hasSoloedTracks && !track.soloed);

      for (const clip of track.clips) {
        const entry = sourceRegistry.get(clip.sourceId);
        if (!entry || entry.type === "image") continue;

        const mediaEl = entry.element as HTMLMediaElement;
        const clipDuration = clip.outPoint - clip.inPoint;
        const clipEnd = clip.timelineStart + clipDuration;
        const isActive = currentTime >= clip.timelineStart && currentTime < clipEnd;

        if (isActive) {
          activeSources.add(mediaEl);

          // Volume & mute handling (including audio fade in / fade out)
          const elapsed = currentTime - clip.timelineStart;
          const remaining = clipDuration - elapsed;
          let fadeMultiplier = 1;
          if (clip.fadeIn && clip.fadeIn > 0 && elapsed < clip.fadeIn) {
            fadeMultiplier *= elapsed / clip.fadeIn;
          }
          if (clip.fadeOut && clip.fadeOut > 0 && remaining < clip.fadeOut) {
            fadeMultiplier *= remaining / clip.fadeOut;
          }

          const baseVol = clip.volume !== undefined ? clip.volume : 1;
          const clipVol = baseVol * Math.max(0, Math.min(1, fadeMultiplier));
          const finalVol = isTrackMuted ? 0 : Math.min(1, Math.max(0, clipVol));
          mediaEl.volume = finalVol;
          mediaEl.muted = track.muted || finalVol === 0;

          if (finalVol > 0 && isPlaying) {
            totalVolumePeak = Math.max(totalVolumePeak, finalVol);
          }

          // Set playback speed
          const speed = clip.speed || 1;
          if (mediaEl.playbackRate !== speed) {
            mediaEl.playbackRate = speed;
          }

          // Seek if desynchronized by more than 0.1s
          const sourceTime = clip.inPoint + (currentTime - clip.timelineStart) * speed;
          if (Math.abs(mediaEl.currentTime - sourceTime) > 0.1) {
            mediaEl.currentTime = sourceTime;
          }

          // Play / Pause state
          if (isPlaying) {
            if (mediaEl.paused) {
              mediaEl.play().catch(() => {});
            }
          } else {
            if (!mediaEl.paused) {
              mediaEl.pause();
            }
          }
        }
      }
    }

    // Pause any media elements not currently active
    for (const track of store.project.tracks) {
      for (const clip of track.clips) {
        const entry = sourceRegistry.get(clip.sourceId);
        if (!entry || entry.type === "image") continue;
        const mediaEl = entry.element as HTMLMediaElement;
        if (!activeSources.has(mediaEl) && !mediaEl.paused) {
          mediaEl.pause();
        }
      }
    }

    // Update peak meter approximation
    if (isPlaying && totalVolumePeak > 0) {
      const jitter = (Math.random() * 0.15 - 0.075);
      const level = Math.min(1, Math.max(0.05, totalVolumePeak * (0.85 + jitter)));
      audioEngine.setPeaks(level, Math.min(1, level * 0.95));
    } else {
      audioEngine.setPeaks(0, 0);
    }
  }
}

export const playbackController = new PlaybackController();
