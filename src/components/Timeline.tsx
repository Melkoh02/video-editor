/**
 * Timeline component — core editing UI.
 *
 * Layout:
 *   - Time ruler at top
 *   - One lane per track, stacked vertically
 *   - Clip blocks sized by duration * pxPerSec
 *   - Playhead: vertical line at currentTime * pxPerSec
 *
 * Interactions:
 *   - Click ruler → seek
 *   - Drag clip body → move (timelineStart)
 *   - Drag left handle → trim inPoint / adjust timelineStart
 *   - Drag right handle → trim outPoint
 *   - Click clip → select
 */

import { useRef, useCallback } from "react";
import { useAppStore } from "../state/store";
import { playbackController } from "../engine/playback";
import type { Clip, Track } from "../types";

const PX_PER_SEC = 80;       // zoom: pixels per second
const TRACK_HEIGHT = 56;     // px per track lane
const RULER_HEIGHT = 24;     // px
const HANDLE_WIDTH = 8;      // px trim handle width
const MIN_CLIP_DURATION = 0.1; // seconds

// ── helpers ────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function totalDuration(tracks: Track[]): number {
  let max = 10;
  for (const t of tracks) {
    for (const c of t.clips) {
      const end = c.timelineStart + (c.outPoint - c.inPoint);
      if (end > max) max = end;
    }
  }
  return max;
}

// ── Ruler ──────────────────────────────────────────────────────────────────

function Ruler({
  duration,
  onSeek,
}: {
  duration: number;
  onSeek: (t: number) => void;
}) {
  const ticks: React.ReactNode[] = [];
  const step = PX_PER_SEC >= 60 ? 1 : PX_PER_SEC >= 30 ? 2 : 5;
  for (let t = 0; t <= Math.ceil(duration) + 1; t += step) {
    ticks.push(
      <div
        key={t}
        className="ruler-tick"
        style={{ left: t * PX_PER_SEC }}
      >
        <span className="ruler-label">{formatTime(t)}</span>
      </div>
    );
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek(Math.max(0, x / PX_PER_SEC));
  }

  return (
    <div
      className="tl-ruler"
      style={{ width: (duration + 2) * PX_PER_SEC, height: RULER_HEIGHT }}
      onClick={handleClick}
    >
      {ticks}
    </div>
  );
}

// ── ClipBlock ──────────────────────────────────────────────────────────────

type DragMode = "move" | "trim-left" | "trim-right";

function ClipBlock({
  clip,
  track,
  isSelected,
}: {
  clip: Clip;
  track: Track;
  isSelected: boolean;
}) {
  const updateClip = useAppStore((s) => s.updateClip);
  const selectClip = useAppStore((s) => s.selectClip);

  const duration = clip.outPoint - clip.inPoint;
  const left = clip.timelineStart * PX_PER_SEC;
  const width = Math.max(duration * PX_PER_SEC, HANDLE_WIDTH * 2 + 4);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startTimelineStart: number;
    startInPoint: number;
    startOutPoint: number;
  } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      e.stopPropagation();
      e.preventDefault();
      selectClip(clip.id);

      dragRef.current = {
        mode,
        startX: e.clientX,
        startTimelineStart: clip.timelineStart,
        startInPoint: clip.inPoint,
        startOutPoint: clip.outPoint,
      };

      const onMove = (me: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = (me.clientX - d.startX) / PX_PER_SEC;

        if (d.mode === "move") {
          const newStart = Math.max(0, d.startTimelineStart + dx);
          updateClip(track.id, clip.id, { timelineStart: newStart });
        } else if (d.mode === "trim-left") {
          const newIn = Math.min(d.startInPoint + dx, d.startOutPoint - MIN_CLIP_DURATION);
          const clampedIn = Math.max(0, newIn);
          const deltaClamped = clampedIn - d.startInPoint;
          updateClip(track.id, clip.id, {
            inPoint: clampedIn,
            timelineStart: Math.max(0, d.startTimelineStart + deltaClamped),
          });
        } else if (d.mode === "trim-right") {
          const newOut = Math.max(d.startInPoint + MIN_CLIP_DURATION, d.startOutPoint + dx);
          updateClip(track.id, clip.id, { outPoint: newOut });
        }
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [clip, track, selectClip, updateClip]
  );

  return (
    <div
      className={`tl-clip ${isSelected ? "tl-clip--selected" : ""} ${track.type === "audio" ? "tl-clip--audio" : ""}`}
      style={{ left, width }}
      onMouseDown={(e) => onMouseDown(e, "move")}
    >
      {/* Left trim handle */}
      <div
        className="tl-handle tl-handle--left"
        onMouseDown={(e) => onMouseDown(e, "trim-left")}
      />
      {/* Clip label */}
      <span className="tl-clip-label">{clip.sourceId.slice(0, 6)}</span>
      {/* Right trim handle */}
      <div
        className="tl-handle tl-handle--right"
        onMouseDown={(e) => onMouseDown(e, "trim-right")}
      />
    </div>
  );
}

// ── TrackLane ──────────────────────────────────────────────────────────────

function TrackLane({
  track,
  selectedClipId,
}: {
  track: Track;
  selectedClipId: string | null;
}) {
  return (
    <div className="tl-lane" style={{ height: TRACK_HEIGHT }}>
      <div className="tl-lane-label">{track.type === "video" ? "🎬" : "🔊"}</div>
      <div className="tl-lane-clips">
        {track.clips.map((clip) => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            track={track}
            isSelected={clip.id === selectedClipId}
          />
        ))}
      </div>
    </div>
  );
}

// ── Playhead ───────────────────────────────────────────────────────────────

function Playhead({ currentTime }: { currentTime: number }) {
  return (
    <div
      className="tl-playhead"
      style={{ left: currentTime * PX_PER_SEC + 48 }} // 48 = lane-label width
    />
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────

export function Timeline() {
  const tracks = useAppStore((s) => s.project.tracks);
  const currentTime = useAppStore((s) => s.currentTime);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const duration = totalDuration(tracks);

  function handleSeek(t: number) {
    playbackController.seek(t);
  }

  return (
    <div className="tl-root">
      <div className="tl-scroll" ref={scrollRef}>
        {/* Ruler */}
        <div className="tl-ruler-row">
          <div className="tl-lane-label" style={{ height: RULER_HEIGHT }} />
          <Ruler duration={duration} onSeek={handleSeek} />
        </div>

        {/* Track lanes */}
        <div className="tl-lanes" style={{ position: "relative" }}>
          {tracks.map((track) => (
            <TrackLane key={track.id} track={track} selectedClipId={selectedClipId} />
          ))}
          {tracks.length === 0 && (
            <div className="tl-empty">Open a video with "+ Video" to start</div>
          )}
          {/* Playhead overlays the lanes */}
          <Playhead currentTime={currentTime} />
        </div>
      </div>
    </div>
  );
}
