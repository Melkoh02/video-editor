/**
 * Layout helpers — compute transforms for common arrangements.
 *
 * These are applied once when clips are placed, stored in clip.transform.
 * The compositor uses whatever transform is on each clip, so these are
 * just convenience utilities, not runtime logic.
 */

import type { Transform } from "../types";
import { useAppStore } from "../state/store";

/**
 * Recompute side-by-side transforms for all video tracks.
 * Distributes clips evenly across the horizontal axis.
 *
 * Called after adding a clip to a new track so the layout adjusts.
 */
export function applySideBySideLayout() {
  const store = useAppStore.getState();
  const videoTracks = store.project.tracks.filter((t) => t.type === "video");
  const n = videoTracks.length;
  if (n <= 1) return; // single track: keep centered, full size

  // Each track gets 1/n of the width, scaled down accordingly
  const scaleX = 1 / n;
  const scaleY = 1 / n;

  videoTracks.forEach((track, i) => {
    // Offset: spread tracks from -0.5 to +0.5 (in project-space fraction)
    // We'll express x offset in project pixels later — compositor uses project coords.
    // For a 1920-wide project, track 0 of 2 → x = -480, track 1 → x = +480
    // General: x_fraction = (i / (n - 1) - 0.5)  (for n >= 2)
    const xFraction = n > 1 ? i / (n - 1) - 0.5 : 0;

    // We'll inject x in "project pixels from center" as the compositor uses it
    // The transform x is in project-resolution pixels. At scale 1/2, the clip
    // occupies half the width so we offset ±projW/4.
    // We don't have projW here, so we store a normalized value that the compositor
    // will multiply. Instead, store the actual pixel offset — we know project res.
    const { width: projW } = store.project.resolution;
    const x = xFraction * projW * (1 - scaleX); // leave a little margin

    const transform: Transform = { x, y: 0, scaleX, scaleY, rotation: 0 };

    // Apply to all clips in this track
    for (const clip of track.clips) {
      store.updateClip(track.id, clip.id, { transform });
    }
  });
}

/**
 * Reset all video track clips to full-screen centered transform.
 */
export function applyFullscreenLayout() {
  const store = useAppStore.getState();
  const videoTracks = store.project.tracks.filter((t) => t.type === "video");
  const fullTransform: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  for (const track of videoTracks) {
    for (const clip of track.clips) {
      store.updateClip(track.id, clip.id, { transform: fullTransform });
    }
  }
}
