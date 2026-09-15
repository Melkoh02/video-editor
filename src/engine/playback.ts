/**
 * PlaybackController — manages play/pause/seek and advances currentTime.
 *
 * Uses a simple timestamp-delta loop so currentTime advances in wall-clock
 * time while playing. Pause/seek just update the store directly.
 */

import { useAppStore } from "../state/store";
import { sourceRegistry } from "./sourceRegistry";

class PlaybackController {
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;

  play() {
    const store = useAppStore.getState();
    store.play();
    this.lastTimestamp = null;
    this.tick();
  }

  pause() {
    this.stopLoop();
    useAppStore.getState().pause();
    this.syncVideoElements();
  }

  stop() {
    this.stopLoop();
    useAppStore.getState().stop();
    this.syncVideoElements();
  }

  seek(t: number) {
    useAppStore.getState().setCurrentTime(t);
    this.syncVideoElements();
  }

  private tick() {
    this.rafId = requestAnimationFrame((ts) => {
      const store = useAppStore.getState();
      if (store.playerState !== "playing") return;

      if (this.lastTimestamp !== null) {
        const delta = (ts - this.lastTimestamp) / 1000;
        const next = store.currentTime + delta;

        // Compute total duration from clips
        const duration = this.projectDuration(store);
        if (next >= duration) {
          store.setCurrentTime(duration);
          store.pause();
          return;
        }
        store.setCurrentTime(next);
      }
      this.lastTimestamp = ts;
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

  /** Pause all video elements so they don't play on their own. */
  private syncVideoElements() {
    const store = useAppStore.getState();
    for (const track of store.project.tracks) {
      for (const clip of track.clips) {
        const entry = sourceRegistry.get(clip.sourceId);
        if (entry) entry.videoEl.pause();
      }
    }
  }
}

export const playbackController = new PlaybackController();
