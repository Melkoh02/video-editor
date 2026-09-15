import { useRef, useCallback } from "react";
import { useAppStore, findClipAndTrack } from "../state/store";
import { sourceRegistry } from "../engine/sourceRegistry";
import { computeClipBounds, isPointInsideClip } from "../utils/geometry";

type CanvasGizmoProps = {
  containerWidth: number; // DOM px width of preview viewport
};

export function CanvasGizmo({ containerWidth }: CanvasGizmoProps) {
  const project = useAppStore((s) => s.project);
  const currentTime = useAppStore((s) => s.currentTime);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const selectClip = useAppStore((s) => s.selectClip);
  const updateClip = useAppStore((s) => s.updateClip);

  const autoSelectCanvas = useAppStore((s) => s.autoSelectCanvas);
  const transformControlsCanvas = useAppStore((s) => s.transformControlsCanvas);

  const dragRef = useRef<{
    mode: "move" | "scale-tl" | "scale-tr" | "scale-bl" | "scale-br" | "rotate";
    startX: number; // mouse clientX
    startY: number; // mouse clientY
    startTransformX: number;
    startTransformY: number;
    startScaleX: number;
    startScaleY: number;
    startRotation: number;
    clipCenterX: number; // in project px
    clipCenterY: number; // in project px
    initialAngleRad: number;
  } | null>(null);

  const { width: projW, height: projH } = project.resolution;

  // Find selected clip and its track
  let selectedClip = null;
  let selectedTrack = null;
  if (selectedClipId) {
    const result = findClipAndTrack(project.tracks, selectedClipId);
    if (result) {
      selectedTrack = result.track;
      selectedClip = result.clip;
    }
  }

  // Check if selected clip is active at currentTime
  const isSelectedActive =
    selectedClip &&
    selectedTrack &&
    selectedTrack.type === "video" &&
    currentTime >= selectedClip.timelineStart &&
    currentTime < selectedClip.timelineStart + (selectedClip.outPoint - selectedClip.inPoint);

  // Convert project space point to DOM space percentage / px for gizmo overlay
  const scaleRatio = containerWidth / projW; // ratio from project coords to DOM preview coords

  const projToDom = (px: number, py: number) => ({
    x: px * scaleRatio,
    y: py * scaleRatio,
  });

  // Calculate clip bounds if active and transform controls enabled
  let bounds = null;
  let entry = null;
  if (isSelectedActive && selectedClip && transformControlsCanvas) {
    entry = sourceRegistry.get(selectedClip.sourceId);
    const srcW = entry?.width || 1920;
    const srcH = entry?.height || 1080;
    bounds = computeClipBounds(selectedClip, srcW, srcH, projW, projH);
  }

  // Click on canvas to select topmost clip under cursor
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!autoSelectCanvas) return;
    // If clicking directly on gizmo handles, handle Gizmo drag instead
    if ((e.target as HTMLElement).closest(".gizmo-handle")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const domX = e.clientX - rect.left;
    const domY = e.clientY - rect.top;

    // Convert DOM position to Project coordinates
    const projX = domX / scaleRatio;
    const projY = domY / scaleRatio;

    // Search video tracks from top to bottom
    const videoTracks = project.tracks.filter((t) => t.type === "video");
    let hitClipId: string | null = null;

    for (let i = videoTracks.length - 1; i >= 0; i--) {
      const track = videoTracks[i];
      if (track.muted) continue;

      for (const clip of track.clips) {
        const duration = clip.outPoint - clip.inPoint;
        if (currentTime >= clip.timelineStart && currentTime < clip.timelineStart + duration) {
          const sEntry = sourceRegistry.get(clip.sourceId);
          const srcW = sEntry?.width || 1920;
          const srcH = sEntry?.height || 1080;

          if (isPointInsideClip(projX, projY, clip, srcW, srcH, projW, projH)) {
            hitClipId = clip.id;
            break;
          }
        }
      }
      if (hitClipId) break;
    }

    if (hitClipId) {
      selectClip(hitClipId);
    } else {
      selectClip(null);
    }
  };

  // Start gizmo dragging
  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      mode: "move" | "scale-tl" | "scale-tr" | "scale-bl" | "scale-br" | "rotate"
    ) => {
      e.stopPropagation();
      e.preventDefault();
      if (!selectedClip || !selectedTrack || !bounds) return;

      const t = selectedClip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
      const centerDom = projToDom(bounds.cx, bounds.cy);
      const rect = (e.currentTarget as HTMLElement).closest(".gizmo-layer")?.getBoundingClientRect();

      const domCenterX = rect ? rect.left + centerDom.x : e.clientX;
      const domCenterY = rect ? rect.top + centerDom.y : e.clientY;

      const initialAngleRad = Math.atan2(e.clientY - domCenterY, e.clientX - domCenterX);

      dragRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startTransformX: t.x ?? 0,
        startTransformY: t.y ?? 0,
        startScaleX: t.scaleX ?? 1,
        startScaleY: t.scaleY ?? 1,
        startRotation: t.rotation ?? 0,
        clipCenterX: bounds.cx,
        clipCenterY: bounds.cy,
        initialAngleRad,
      };

      const trackId = selectedTrack.id;
      const clipId = selectedClip.id;

      const onMouseMove = (me: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;

        if (d.mode === "move") {
          const dxDom = me.clientX - d.startX;
          const dyDom = me.clientY - d.startY;
          const dxProj = dxDom / scaleRatio;
          const dyProj = dyDom / scaleRatio;

          updateClip(trackId, clipId, {
            transform: {
              x: d.startTransformX + dxProj,
              y: d.startTransformY + dyProj,
              scaleX: d.startScaleX,
              scaleY: d.startScaleY,
              rotation: d.startRotation,
            },
          });
        } else if (d.mode === "rotate") {
          const currentAngleRad = Math.atan2(me.clientY - domCenterY, me.clientX - domCenterX);
          const deltaAngleDeg = ((currentAngleRad - d.initialAngleRad) * 180) / Math.PI;
          let newRotation = (d.startRotation + deltaAngleDeg) % 360;
          if (newRotation < 0) newRotation += 360;

          // Snap to 0, 90, 180, 270 if close
          if (Math.abs(newRotation) < 3 || Math.abs(newRotation - 360) < 3) newRotation = 0;
          else if (Math.abs(newRotation - 90) < 3) newRotation = 90;
          else if (Math.abs(newRotation - 180) < 3) newRotation = 180;
          else if (Math.abs(newRotation - 270) < 3) newRotation = 270;

          updateClip(trackId, clipId, {
            transform: {
              x: d.startTransformX,
              y: d.startTransformY,
              scaleX: d.startScaleX,
              scaleY: d.startScaleY,
              rotation: Math.round(newRotation * 10) / 10,
            },
          });
        } else if (d.mode.startsWith("scale")) {
          const dxDom = me.clientX - d.startX;
          const dyDom = me.clientY - d.startY;
          const deltaScale = (dxDom + dyDom) / 200;

          let mult = 1;
          if (d.mode === "scale-bl" || d.mode === "scale-tl") mult = -1;

          const newScale = Math.max(0.1, d.startScaleX + deltaScale * mult);
          updateClip(trackId, clipId, {
            transform: {
              x: d.startTransformX,
              y: d.startTransformY,
              scaleX: Math.round(newScale * 1000) / 1000,
              scaleY: Math.round(newScale * 1000) / 1000,
              rotation: d.startRotation,
            },
          });
        }
      };

      const onMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [selectedClip, selectedTrack, bounds, projToDom, scaleRatio, updateClip]
  );

  if (!bounds || !isSelectedActive || !transformControlsCanvas) {
    return (
      <div
        className="gizmo-layer"
        style={{ position: "absolute", inset: 0, cursor: "default" }}
        onMouseDown={handleCanvasMouseDown}
      />
    );
  }

  // Convert corners to DOM pixels
  const domTL = projToDom(bounds.corners.tl.x, bounds.corners.tl.y);
  const domTR = projToDom(bounds.corners.tr.x, bounds.corners.tr.y);
  const domBR = projToDom(bounds.corners.br.x, bounds.corners.br.y);
  const domBL = projToDom(bounds.corners.bl.x, bounds.corners.bl.y);
  const domRot = projToDom(bounds.rotHandle.x, bounds.rotHandle.y);

  // Top center for rotation line
  const domTopCenter = {
    x: (domTL.x + domTR.x) / 2,
    y: (domTL.y + domTR.y) / 2,
  };

  return (
    <div
      className="gizmo-layer"
      style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}
      onMouseDown={handleCanvasMouseDown}
    >
      <svg
        style={{ width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
      >
        {/* Bounding box outline */}
        <polygon
          points={`${domTL.x},${domTL.y} ${domTR.x},${domTR.y} ${domBR.x},${domBR.y} ${domBL.x},${domBL.y}`}
          fill="rgba(99, 102, 241, 0.08)"
          stroke="#6366f1"
          strokeWidth="2"
          strokeDasharray="4 4"
          style={{ pointerEvents: "auto", cursor: "move" }}
          onMouseDown={(e) => startDrag(e, "move")}
        />

        {/* Stem to rotation handle */}
        <line
          x1={domTopCenter.x}
          y1={domTopCenter.y}
          x2={domRot.x}
          y2={domRot.y}
          stroke="#6366f1"
          strokeWidth="1.5"
        />

        {/* Rotation Handle */}
        <circle
          className="gizmo-handle"
          cx={domRot.x}
          cy={domRot.y}
          r="7"
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth="2"
          style={{ pointerEvents: "auto", cursor: "grab" }}
          onMouseDown={(e) => startDrag(e, "rotate")}
        />

        {/* Corner Handles */}
        {[
          { pos: domTL, mode: "scale-tl" as const },
          { pos: domTR, mode: "scale-tr" as const },
          { pos: domBR, mode: "scale-br" as const },
          { pos: domBL, mode: "scale-bl" as const },
        ].map((h, idx) => (
          <rect
            key={idx}
            className="gizmo-handle"
            x={h.pos.x - 5}
            y={h.pos.y - 5}
            width="10"
            height="10"
            fill="#ffffff"
            stroke="#6366f1"
            strokeWidth="2"
            rx="2"
            style={{ pointerEvents: "auto", cursor: "nwse-resize" }}
            onMouseDown={(e) => startDrag(e, h.mode)}
          />
        ))}
      </svg>
    </div>
  );
}
