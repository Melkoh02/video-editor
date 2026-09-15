/**
 * Multi-track Timeline component with track reordering, cross-track clip dragging, and dynamic zoom scaling.
 */

import { useRef, useCallback, useEffect } from "react";
import { useAppStore } from "../state/store";
import { playbackController } from "../engine/playback";
import type { Clip, Track } from "../types";
import { Button } from "./ui/Button";

const TRACK_HEIGHT = 48; // px per track lane
const RULER_HEIGHT = 24; // px
const HANDLE_WIDTH = 8; // px trim handle width
const MIN_CLIP_DURATION = 0.1; // seconds

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

function totalDuration(tracks: Track[]): number {
  let max = 15;
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
  pxPerSec,
  onSeek,
}: {
  duration: number;
  pxPerSec: number;
  onSeek: (t: number) => void;
}) {
  const ticks: React.ReactNode[] = [];
  
  // Dynamic tick step based on zoom level
  let step = 1;
  if (pxPerSec < 25) step = 10;
  else if (pxPerSec < 50) step = 5;
  else if (pxPerSec < 100) step = 2;
  else if (pxPerSec >= 200) step = 0.5;

  for (let t = 0; t <= Math.ceil(duration) + 5; t += step) {
    ticks.push(
      <div key={t} className="ruler-tick" style={{ left: t * pxPerSec }}>
        <span className="ruler-label">{formatTime(t)}</span>
      </div>
    );
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek(Math.max(0, x / pxPerSec));
  }

  return (
    <div
      className="tl-ruler"
      style={{ width: (duration + 5) * pxPerSec, height: RULER_HEIGHT }}
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
  trackIndex,
  pxPerSec,
  isSelected,
}: {
  clip: Clip;
  track: Track;
  trackIndex: number;
  pxPerSec: number;
  isSelected: boolean;
}) {
  const updateClip = useAppStore((s) => s.updateClip);
  const selectClip = useAppStore((s) => s.selectClip);
  const moveClipToTrack = useAppStore((s) => s.moveClipToTrack);

  const duration = clip.outPoint - clip.inPoint;
  const left = clip.timelineStart * pxPerSec;
  const width = Math.max(duration * pxPerSec, HANDLE_WIDTH * 2 + 4);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startTimelineStart: number;
    startInPoint: number;
    startOutPoint: number;
    startTrackIndex: number;
    currentTrackId: string;
  } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      if (track.locked) return;
      e.stopPropagation();
      e.preventDefault();
      selectClip(clip.id);

      dragRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startTimelineStart: clip.timelineStart,
        startInPoint: clip.inPoint,
        startOutPoint: clip.outPoint,
        startTrackIndex: trackIndex,
        currentTrackId: track.id,
      };

      const onMove = (me: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = (me.clientX - d.startX) / pxPerSec;

        if (d.mode === "move") {
          const newStart = Math.max(0, d.startTimelineStart + dx);
          const dy = me.clientY - d.startY;
          const trackOffset = Math.round(dy / TRACK_HEIGHT);

          const allTracks = useAppStore.getState().project.tracks;
          const targetIndex = Math.min(
            Math.max(0, d.startTrackIndex + trackOffset),
            allTracks.length - 1
          );
          const targetTrack = allTracks[targetIndex];

          const targetCategory = targetTrack.type;
          const clipCategory = clip.mediaType === "audio" ? "audio" : "video";

          if (targetCategory === clipCategory && !targetTrack.locked) {
            if (targetTrack.id !== d.currentTrackId) {
              moveClipToTrack(d.currentTrackId, targetTrack.id, clip.id, newStart);
              d.currentTrackId = targetTrack.id;
            } else {
              updateClip(targetTrack.id, clip.id, { timelineStart: newStart });
            }
          } else {
            updateClip(d.currentTrackId, clip.id, { timelineStart: newStart });
          }
        } else if (d.mode === "trim-left") {
          const newIn = Math.min(d.startInPoint + dx, d.startOutPoint - MIN_CLIP_DURATION);
          const clampedIn = Math.max(0, newIn);
          const deltaClamped = clampedIn - d.startInPoint;
          updateClip(d.currentTrackId, clip.id, {
            inPoint: clampedIn,
            timelineStart: Math.max(0, d.startTimelineStart + deltaClamped),
          });
        } else if (d.mode === "trim-right") {
          const newOut = Math.max(d.startInPoint + MIN_CLIP_DURATION, d.startOutPoint + dx);
          updateClip(d.currentTrackId, clip.id, { outPoint: newOut });
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
    [clip, track, trackIndex, pxPerSec, selectClip, updateClip, moveClipToTrack]
  );

  let clipClass = "tl-clip";
  if (isSelected) clipClass += " tl-clip--selected";
  if (clip.mediaType === "audio" || track.type === "audio") clipClass += " tl-clip--audio";
  else if (clip.mediaType === "image") clipClass += " tl-clip--image";
  else if (clip.mediaType === "text") clipClass += " tl-clip--text";

  return (
    <div
      className={clipClass}
      style={{ left, width }}
      onMouseDown={(e) => onMouseDown(e, "move")}
    >
      <div
        className="tl-handle tl-handle--left"
        onMouseDown={(e) => onMouseDown(e, "trim-left")}
      />
      <span className="tl-clip-label" title={clip.name || clip.sourceId}>
        {clip.name || clip.sourceId.slice(0, 8)}
      </span>
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
  trackIndex,
  totalTracks,
  pxPerSec,
  selectedClipId,
}: {
  track: Track;
  trackIndex: number;
  totalTracks: number;
  pxPerSec: number;
  selectedClipId: string | null;
}) {
  const setTrackMuted = useAppStore((s) => s.setTrackMuted);
  const setTrackLocked = useAppStore((s) => s.setTrackLocked);
  const removeTrack = useAppStore((s) => s.removeTrack);
  const moveTrack = useAppStore((s) => s.moveTrack);

  return (
    <div className={`tl-lane ${track.muted ? "tl-lane--muted" : ""}`} style={{ height: TRACK_HEIGHT }}>
      <div className="tl-lane-header">
        <div className="tl-reorder-btns">
          <button
            className="reorder-btn"
            disabled={trackIndex === 0}
            title="Move track up"
            onClick={() => moveTrack(trackIndex, trackIndex - 1)}
          >
            ▲
          </button>
          <button
            className="reorder-btn"
            disabled={trackIndex === totalTracks - 1}
            title="Move track down"
            onClick={() => moveTrack(trackIndex, trackIndex + 1)}
          >
            ▼
          </button>
        </div>

        <span className="tl-track-type">{track.type === "video" ? "🎬" : "🔊"}</span>
        <span className="tl-track-name">{track.name}</span>

        <div className="tl-track-actions">
          <button
            className={`track-btn ${track.muted ? "track-btn--active-mute" : ""}`}
            title={track.muted ? "Unmute track" : "Mute track"}
            onClick={() => setTrackMuted(track.id, !track.muted)}
          >
            M
          </button>
          <button
            className={`track-btn ${track.locked ? "track-btn--active-lock" : ""}`}
            title={track.locked ? "Unlock track" : "Lock track"}
            onClick={() => setTrackLocked(track.id, !track.locked)}
          >
            🔒
          </button>
          <button
            className="track-btn track-btn--delete"
            title="Delete track"
            onClick={() => removeTrack(track.id)}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="tl-lane-clips">
        {track.clips.map((clip) => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            track={track}
            trackIndex={trackIndex}
            pxPerSec={pxPerSec}
            isSelected={clip.id === selectedClipId}
          />
        ))}
      </div>
    </div>
  );
}

// ── Playhead ───────────────────────────────────────────────────────────────

function Playhead({ currentTime, pxPerSec }: { currentTime: number; pxPerSec: number }) {
  return (
    <div
      className="tl-playhead"
      style={{ left: currentTime * pxPerSec + 160 }} // 160 = track header width
    />
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────

export function Timeline() {
  const tracks = useAppStore((s) => s.project.tracks);
  const currentTime = useAppStore((s) => s.currentTime);
  const zoom = useAppStore((s) => s.zoom);
  const setZoom = useAppStore((s) => s.setZoom);
  const zoomIn = useAppStore((s) => s.zoomIn);
  const zoomOut = useAppStore((s) => s.zoomOut);
  const zoomToFit = useAppStore((s) => s.zoomToFit);

  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const addTrack = useAppStore((s) => s.addTrack);
  const splitClipAtCurrentTime = useAppStore((s) => s.splitClipAtCurrentTime);
  const removeSelectedClip = useAppStore((s) => s.removeSelectedClip);
  const duplicateSelectedClip = useAppStore((s) => s.duplicateSelectedClip);

  const scrollRef = useRef<HTMLDivElement>(null);
  const duration = totalDuration(tracks);

  function handleSeek(t: number) {
    playbackController.seek(t);
  }

  // Wheel zoom handling (Alt + Wheel or Ctrl + Wheel)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleFit = () => {
    if (scrollRef.current) {
      zoomToFit(scrollRef.current.clientWidth);
    }
  };

  return (
    <div className="tl-root">
      <div className="tl-bar">
        <div className="tl-bar-group">
          <Button onClick={() => addTrack("video")} title="Add video track">
            + Video Track
          </Button>
          <Button onClick={() => addTrack("audio")} title="Add audio track">
            + Audio Track
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="tl-bar-group tl-zoom-controls">
          <button className="tb-btn" onClick={zoomOut} title="Zoom Out (⌘-)">
            🔍−
          </button>
          <input
            type="range"
            min="10"
            max="300"
            className="prop-slider tl-zoom-slider"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            title={`Timeline Zoom: ${zoom}px/sec`}
          />
          <button className="tb-btn" onClick={zoomIn} title="Zoom In (⌘+)">
            🔍+
          </button>
          <button className="tb-btn" onClick={handleFit} title="Fit timeline to screen (⌘0)">
            ↔️ Fit
          </button>
        </div>

        <div className="tl-bar-group">
          <Button onClick={splitClipAtCurrentTime} title="Split clip at playhead (S)">
            ✂️ Split (S)
          </Button>
          <Button disabled={!selectedClipId} onClick={duplicateSelectedClip} title="Duplicate selected clip (⌘D)">
            📋 Copy (⌘D)
          </Button>
          <Button variant="danger" disabled={!selectedClipId} onClick={removeSelectedClip} title="Delete selected clip (Del)">
            🗑 Delete
          </Button>
        </div>
      </div>

      <div className="tl-scroll" ref={scrollRef}>
        {/* Ruler */}
        <div className="tl-ruler-row">
          <div className="tl-lane-header" style={{ height: RULER_HEIGHT, borderBottom: "none" }}>
            <span style={{ fontSize: "10px", color: "#666", paddingLeft: "6px" }}>TRACKS</span>
          </div>
          <Ruler duration={duration} pxPerSec={zoom} onSeek={handleSeek} />
        </div>

        {/* Track lanes */}
        <div className="tl-lanes" style={{ position: "relative" }}>
          {tracks.map((track, idx) => (
            <TrackLane
              key={track.id}
              track={track}
              trackIndex={idx}
              totalTracks={tracks.length}
              pxPerSec={zoom}
              selectedClipId={selectedClipId}
            />
          ))}
          {tracks.length === 0 && (
            <div className="tl-empty">
              No tracks in timeline. Click "+ Video Track" or "+ Audio Track" to start editing.
            </div>
          )}
          {/* Playhead */}
          <Playhead currentTime={currentTime} pxPerSec={zoom} />
        </div>
      </div>
    </div>
  );
}
