/**
 * Multi-track Timeline component with:
 * - Track reordering (▲/▼)
 * - Cross-track clip dragging
 * - Dynamic zoom scaling
 * - Magnet snapping to clip edges, playhead, and time 0
 * - Fade-in / fade-out visual indicators on clips
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { useAppStore } from "../state/store";
import { playbackController } from "../engine/playback";
import { generateWaveformPeaks, getCachedWaveform } from "../engine/audioWaveforms";
import { sourceRegistry } from "../engine/sourceRegistry";
import type { Clip, Track } from "../types";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

const TRACK_HEIGHT = 48; // px per track lane
const RULER_HEIGHT = 24; // px
const HANDLE_WIDTH = 8; // px trim handle width
const MIN_CLIP_DURATION = 0.1; // seconds
const SNAP_THRESHOLD_PX = 8; // pixels proximity to trigger snap

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

/** Collect all snap targets from the timeline (clip edges + playhead + time 0) */
function collectSnapTargets(
  tracks: Track[],
  excludeClipId: string,
  currentTime: number
): number[] {
  const targets = new Set<number>();
  targets.add(0); // timeline start
  targets.add(currentTime); // playhead

  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.id === excludeClipId) continue;
      targets.add(clip.timelineStart);
      targets.add(clip.timelineStart + (clip.outPoint - clip.inPoint));
    }
  }

  return Array.from(targets);
}

/** Try to snap a value to any target, returning the snapped value or original */
function snapToTargets(
  value: number,
  targets: number[],
  thresholdSec: number
): { snapped: number; snapPoint: number | null } {
  let closest = Infinity;
  let snapPoint: number | null = null;

  for (const target of targets) {
    const dist = Math.abs(value - target);
    if (dist < closest && dist < thresholdSec) {
      closest = dist;
      snapPoint = target;
    }
  }

  return { snapped: snapPoint !== null ? snapPoint : value, snapPoint };
}

// ── Ruler ──────────────────────────────────────────────────────────────────

const EMPTY_MARKERS: import("../types").Marker[] = [];

function Ruler({
  duration,
  pxPerSec,
  onSeek,
}: {
  duration: number;
  pxPerSec: number;
  onSeek: (t: number) => void;
}) {
  const projectMarkers = useAppStore((s) => s.project.markers);
  const markers = projectMarkers || EMPTY_MARKERS;
  const removeMarker = useAppStore((s) => s.removeMarker);

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
      {markers.map((m) => (
        <div
          key={m.id}
          className="ruler-marker-flag"
          style={{ left: m.time * pxPerSec, backgroundColor: m.color }}
          title={`${m.label} (${m.time.toFixed(1)}s) • Double-click to remove`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            removeMarker(m.id);
          }}
        >
          <span className="marker-flag-label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── ClipBlock ──────────────────────────────────────────────────────────────

type DragMode = "move" | "trim-left" | "trim-right";

import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

function WaveformCanvas({ sourceId, width, height }: { sourceId: string; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(() => getCachedWaveform(sourceId) || null);

  useEffect(() => {
    if (peaks) return;
    const entry = sourceRegistry.get(sourceId);
    if (entry && entry.url && (entry.type === "audio" || entry.type === "video")) {
      generateWaveformPeaks(sourceId, entry.url).then((p) => {
        if (p) setPeaks(p);
      });
    }
  }, [sourceId, peaks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || peaks.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";

    const barWidth = width / peaks.length;
    const midY = height / 2;

    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const h = Math.max(2, p * (height - 6));
      ctx.fillRect(i * barWidth, midY - h / 2, Math.max(1, barWidth - 1), h);
    }
  }, [peaks, width, height]);

  if (!peaks) return null;

  return (
    <canvas
      ref={canvasRef}
      width={Math.max(10, Math.round(width))}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.8,
        zIndex: 1,
      }}
    />
  );
}

function ClipBlock({
  clip,
  track,
  trackIndex,
  pxPerSec,
  isSelected,
  onSnap,
  onContextMenu,
}: {
  clip: Clip;
  track: Track;
  trackIndex: number;
  pxPerSec: number;
  isSelected: boolean;
  onSnap: (snapX: number | null) => void;
  onContextMenu: (x: number, y: number, clipId: string) => void;
}) {
  const updateClip = useAppStore((s) => s.updateClip);
  const selectClip = useAppStore((s) => s.selectClip);
  const moveClipToTrack = useAppStore((s) => s.moveClipToTrack);

  const duration = clip.outPoint - clip.inPoint;
  const left = clip.timelineStart * pxPerSec;
  const width = Math.max(duration * pxPerSec, HANDLE_WIDTH * 2 + 4);

  // Fade indicator widths (clamped to clip width)
  const fadeInPx = Math.min((clip.fadeIn || 0) * pxPerSec, width);
  const fadeOutPx = Math.min((clip.fadeOut || 0) * pxPerSec, width);

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
          let newStart = Math.max(0, d.startTimelineStart + dx);
          const clipDur = clip.outPoint - clip.inPoint;

          // Snapping logic
          const snapping = useAppStore.getState().snappingEnabled;
          if (snapping) {
            const state = useAppStore.getState();
            const targets = collectSnapTargets(
              state.project.tracks,
              clip.id,
              state.currentTime
            );
            const thresholdSec = SNAP_THRESHOLD_PX / pxPerSec;

            // Try snapping left edge
            const leftSnap = snapToTargets(newStart, targets, thresholdSec);
            // Try snapping right edge
            const rightSnap = snapToTargets(newStart + clipDur, targets, thresholdSec);

            if (leftSnap.snapPoint !== null) {
              newStart = leftSnap.snapped;
              onSnap(leftSnap.snapPoint * pxPerSec);
            } else if (rightSnap.snapPoint !== null) {
              newStart = rightSnap.snapped - clipDur;
              onSnap(rightSnap.snapPoint * pxPerSec);
            } else {
              onSnap(null);
            }
          }

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
        onSnap(null); // Clear snap line
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [clip, track, trackIndex, pxPerSec, selectClip, updateClip, moveClipToTrack, onSnap]
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
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        selectClip(clip.id);
        onContextMenu(e.clientX, e.clientY, clip.id);
      }}
    >
      {/* Audio Waveform Canvas */}
      {(clip.mediaType === "audio" || clip.mediaType === "video") && (
        <WaveformCanvas sourceId={clip.sourceId} width={width} height={TRACK_HEIGHT} />
      )}

      {/* Fade-in indicator */}
      {fadeInPx > 0 && (
        <div
          className="tl-fade tl-fade--in"
          style={{ width: fadeInPx }}
          title={`Fade In: ${clip.fadeIn?.toFixed(1)}s`}
        />
      )}

      <div
        className="tl-handle tl-handle--left"
        onMouseDown={(e) => onMouseDown(e, "trim-left")}
      />
      <span className="tl-clip-label" title={clip.name || clip.sourceId} style={{ zIndex: 2 }}>
        {clip.name || clip.sourceId.slice(0, 8)}
      </span>
      <div
        className="tl-handle tl-handle--right"
        onMouseDown={(e) => onMouseDown(e, "trim-right")}
      />

      {/* Fade-out indicator */}
      {fadeOutPx > 0 && (
        <div
          className="tl-fade tl-fade--out"
          style={{ width: fadeOutPx }}
          title={`Fade Out: ${clip.fadeOut?.toFixed(1)}s`}
        />
      )}
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
  onSnap,
  onContextMenu,
}: {
  track: Track;
  trackIndex: number;
  totalTracks: number;
  pxPerSec: number;
  selectedClipId: string | null;
  onSnap: (snapX: number | null) => void;
  onContextMenu: (x: number, y: number, clipId: string) => void;
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
            <Icon name="chevron-up" size={8} />
          </button>
          <button
            className="reorder-btn"
            disabled={trackIndex === totalTracks - 1}
            title="Move track down"
            onClick={() => moveTrack(trackIndex, trackIndex + 1)}
          >
            <Icon name="chevron-down" size={8} />
          </button>
        </div>

        <span className="tl-track-type">
          {track.type === "video" ? <Icon name="video" size={14} /> : <Icon name="audio" size={14} />}
        </span>
        <span className="tl-track-name">{track.name}</span>

        <div className="tl-track-actions">
          <button
            className={`track-btn ${track.muted ? "track-btn--active-mute" : ""}`}
            title={track.muted ? "Unmute track" : "Mute track"}
            onClick={() => setTrackMuted(track.id, !track.muted)}
          >
            {track.muted ? <Icon name="volume-mute" size={10} /> : "M"}
          </button>
          <button
            className={`track-btn ${track.locked ? "track-btn--active-lock" : ""}`}
            title={track.locked ? "Unlock track" : "Lock track"}
            onClick={() => setTrackLocked(track.id, !track.locked)}
          >
            {track.locked ? <Icon name="lock" size={10} /> : <Icon name="unlock" size={10} />}
          </button>
          <button
            className="track-btn track-btn--delete"
            title="Delete track"
            onClick={() => removeTrack(track.id)}
          >
            <Icon name="close" size={10} />
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
            onSnap={onSnap}
            onContextMenu={onContextMenu}
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

// ── Timeline ────────────────────────────────────────────────────────────────

export function Timeline() {
  const tracks = useAppStore((s) => s.project.tracks);
  const zoom = useAppStore((s) => s.zoom);
  const zoomIn = useAppStore((s) => s.zoomIn);
  const zoomOut = useAppStore((s) => s.zoomOut);
  const zoomToFit = useAppStore((s) => s.zoomToFit);
  const setZoom = useAppStore((s) => s.setZoom);
  const currentTime = useAppStore((s) => s.currentTime);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const addTrack = useAppStore((s) => s.addTrack);
  const splitClipAtCurrentTime = useAppStore((s) => s.splitClipAtCurrentTime);
  const removeSelectedClip = useAppStore((s) => s.removeSelectedClip);
  const duplicateSelectedClip = useAppStore((s) => s.duplicateSelectedClip);
  const snappingEnabled = useAppStore((s) => s.snappingEnabled);
  const toggleSnapping = useAppStore((s) => s.toggleSnapping);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  const scrollRef = useRef<HTMLDivElement>(null);
  const duration = totalDuration(tracks);

  // Snap line state — the X pixel position of the active snap guide (null = hidden)
  const [snapLineX, setSnapLineX] = useState<number | null>(null);

  function handleSeek(t: number) {
    playbackController.seek(t);
  }

  // Wheel zoom handling (Alt + Wheel or Ctrl + Wheel)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        const currentZoom = useAppStore.getState().zoom;
        setZoom(currentZoom * factor);
      }
    },
    [setZoom]
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

  const handleSnap = useCallback((snapX: number | null) => {
    setSnapLineX(snapX);
  }, []);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);

  const handleClipContextMenu = useCallback((x: number, y: number, clipId: string) => {
    setContextMenu({ x, y, clipId });
  }, []);

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "Split Clip at Playhead",
      icon: "scissors",
      shortcut: "S",
      action: splitClipAtCurrentTime,
    },
    {
      label: "Duplicate Clip",
      icon: "copy",
      shortcut: "⌘D",
      action: duplicateSelectedClip,
    },
    {
      label: "Reset Transform",
      icon: "reset",
      action: () => {
        const sel = useAppStore.getState().selectedClipId;
        if (!sel) return;
        const res = useAppStore.getState().project.tracks.flatMap(t => t.clips).find(c => c.id === sel);
        const trk = useAppStore.getState().project.tracks.find(t => t.clips.some(c => c.id === sel));
        if (res && trk) {
          useAppStore.getState().updateClip(trk.id, res.id, {
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
          });
        }
      },
    },
    {
      label: "Delete Clip",
      icon: "trash",
      shortcut: "Del",
      danger: true,
      action: removeSelectedClip,
    },
  ];

  return (
    <div className="tl-root">
      <div className="tl-bar">
        <div className="tl-bar-group">
          <Button onClick={() => addTrack("video")} title="Add video track">
            <Icon name="plus" size={12} style={{ marginRight: 4 }} /> Video Track
          </Button>
          <Button onClick={() => addTrack("audio")} title="Add audio track">
            <Icon name="plus" size={12} style={{ marginRight: 4 }} /> Audio Track
          </Button>
        </div>

        {/* Undo / Redo */}
        <div className="tl-bar-group">
          <button className="tb-btn" onClick={undo} title="Undo (⌘Z)">
            <Icon name="undo" size={14} />
          </button>
          <button className="tb-btn" onClick={redo} title="Redo (⌘⇧Z)">
            <Icon name="redo" size={14} />
          </button>
        </div>

        {/* Snap Toggle */}
        <div className="tl-bar-group">
          <button
            className={`tb-btn ${snappingEnabled ? "tb-btn--active" : ""}`}
            onClick={toggleSnapping}
            title={`Magnet Snap ${snappingEnabled ? "ON" : "OFF"} (N)`}
          >
            <Icon name="magnet" size={14} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="tl-bar-group tl-zoom-controls">
          <button className="tb-btn" onClick={zoomOut} title="Zoom Out (⌘-)">
            <Icon name="zoom-out" size={14} />
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
            <Icon name="zoom-in" size={14} />
          </button>
          <button className="tb-btn" onClick={handleFit} title="Fit timeline to screen (⌘0)">
            <Icon name="zoom-fit" size={14} /> Fit
          </button>
        </div>

        <div className="tl-bar-group">
          <Button onClick={splitClipAtCurrentTime} title="Split clip at playhead (S)">
            <Icon name="scissors" size={12} style={{ marginRight: 4 }} /> Split (S)
          </Button>
          <Button disabled={!selectedClipId} onClick={duplicateSelectedClip} title="Duplicate selected clip (⌘D)">
            <Icon name="copy" size={12} style={{ marginRight: 4 }} /> Copy (⌘D)
          </Button>
          <Button variant="danger" disabled={!selectedClipId} onClick={removeSelectedClip} title="Delete selected clip (Del)">
            <Icon name="trash" size={12} style={{ marginRight: 4 }} /> Delete
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
              onSnap={handleSnap}
              onContextMenu={handleClipContextMenu}
            />
          ))}
          {tracks.length === 0 && (
            <div className="tl-empty">
              No tracks in timeline. Click "+ Video Track" or "+ Audio Track" to start editing.
            </div>
          )}

          {/* Snap guide line */}
          {snapLineX !== null && (
            <div
              className="tl-snap-line"
              style={{ left: snapLineX + 160 }}
            />
          )}

          {/* Playhead */}
          <Playhead currentTime={currentTime} pxPerSec={zoom} />
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
