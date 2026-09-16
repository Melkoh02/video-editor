import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "../state/store";
import { Compositor } from "../engine/compositor";
import { CanvasGizmo } from "./CanvasGizmo";
import { Icon } from "./ui/Icon";

export function PreviewCanvas() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<Compositor | null>(null);

  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit"); // "fit" or percentage number e.g. 50, 100, 200
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const panDragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  const project = useAppStore((s) => s.project);
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);
  const autoSelectCanvas = useAppStore((s) => s.autoSelectCanvas);
  const setAutoSelectCanvas = useAppStore((s) => s.setAutoSelectCanvas);
  const transformControlsCanvas = useAppStore((s) => s.transformControlsCanvas);
  const setTransformControlsCanvas = useAppStore((s) => s.setTransformControlsCanvas);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const compositor = new Compositor({
      canvas,
      getProject: () => useAppStore.getState().project,
      getCurrentTime: () => useAppStore.getState().currentTime,
    });
    compositor.start();
    compositorRef.current = compositor;

    return () => compositor.stop();
  }, []);

  // Track DOM size of viewport for Fit calculation and Gizmo
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setBaseSize({ width, height });
      }
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const { width: projW, height: projH } = project.resolution;
  const aspectRatio = projW / projH;

  // Calculate base fitted size inside viewport (with padding)
  let fitW = 0;
  let fitH = 0;
  if (baseSize.width > 0 && baseSize.height > 0) {
    const pad = 32;
    const availW = Math.max(100, baseSize.width - pad);
    const availH = Math.max(100, baseSize.height - pad);
    if (availW / availH > aspectRatio) {
      fitH = availH;
      fitW = availH * aspectRatio;
    } else {
      fitW = availW;
      fitH = availW / aspectRatio;
    }
  }

  const zoomFactor = zoomMode === "fit" ? 1 : zoomMode / 100;
  const currentDomW = fitW * zoomFactor;
  const currentDomH = fitH * zoomFactor;

  // Pan interaction (Middle click or Space+drag or Alt+drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setActivePanel("preview");
    const isMiddleClick = e.button === 1;
    const isSpaceOrAlt = e.altKey || (window as unknown as { _isSpaceDown?: boolean })._isSpaceDown;

    if (isMiddleClick || isSpaceOrAlt) {
      e.preventDefault();
      setIsPanning(true);
      panDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };

      const onMouseMove = (me: MouseEvent) => {
        if (!panDragRef.current) return;
        const dx = me.clientX - panDragRef.current.startX;
        const dy = me.clientY - panDragRef.current.startY;
        setPan({
          x: panDragRef.current.startPanX + dx,
          y: panDragRef.current.startPanY + dy,
        });
      };

      const onMouseUp = () => {
        setIsPanning(false);
        panDragRef.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
  }, [pan, setActivePanel]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.15 : 0.85;
      const currentScale = zoomMode === "fit" ? 100 : zoomMode;
      const nextScale = Math.min(400, Math.max(25, Math.round((currentScale * delta) / 5) * 5));
      setZoomMode(nextScale);
    }
  };

  const handleResetFit = () => {
    setZoomMode("fit");
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={viewportRef}
      className={`preview-viewport ${activePanel === "preview" ? "panel--active" : ""}`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111215",
        backgroundImage: "radial-gradient(#26272c 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        cursor: isPanning ? "grabbing" : "default",
      }}
    >
      {/* Floating Canvas Controls */}
      <div className="canvas-floating-toolbar">
        <div className="canvas-zoom-select-wrap">
          <Icon name="aspect-ratio" size={13} style={{ color: "#9ca3af", marginRight: 4 }} />
          <select
            className="canvas-zoom-select"
            value={zoomMode === "fit" ? "fit" : String(zoomMode)}
            onChange={(e) => {
              if (e.target.value === "fit") {
                handleResetFit();
              } else {
                setZoomMode(Number(e.target.value));
              }
            }}
          >
            <option value="fit">Fit ({Math.round((fitW / projW) * 100)}%)</option>
            <option value="25">25%</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100% (Native)</option>
            <option value="150">150%</option>
            <option value="200">200%</option>
            <option value="400">400%</option>
          </select>
        </div>

        <button
          className="canvas-tool-btn"
          onClick={() => {
            const cur = zoomMode === "fit" ? 100 : zoomMode;
            setZoomMode(Math.max(25, cur - 25));
          }}
          title="Zoom Out (Cmd/Ctrl -)"
        >
          <Icon name="zoom-out" size={13} />
        </button>

        <button
          className="canvas-tool-btn"
          onClick={() => {
            const cur = zoomMode === "fit" ? 100 : zoomMode;
            setZoomMode(Math.min(400, cur + 25));
          }}
          title="Zoom In (Cmd/Ctrl +)"
        >
          <Icon name="zoom-in" size={13} />
        </button>

        <button
          className="canvas-tool-btn"
          onClick={handleResetFit}
          title="Reset Zoom & Pan to Fit"
        >
          <Icon name="zoom-fit" size={13} /> Fit
        </button>

        <div className="canvas-toolbar-divider" />

        <button
          className={`canvas-tool-btn ${transformControlsCanvas ? "canvas-tool-btn--active" : ""}`}
          onClick={() => setTransformControlsCanvas(!transformControlsCanvas)}
          title={`Gizmo Transform Controls: ${transformControlsCanvas ? "ON" : "OFF"}`}
        >
          <Icon name="sparkles" size={13} />
        </button>

        <button
          className={`canvas-tool-btn ${autoSelectCanvas ? "canvas-tool-btn--active" : ""}`}
          onClick={() => setAutoSelectCanvas(!autoSelectCanvas)}
          title={`Canvas Click-to-Select: ${autoSelectCanvas ? "ON" : "OFF"}`}
        >
          <Icon name="check" size={13} />
        </button>
      </div>

      {/* Rendered Composition Frame Container */}
      {fitW > 0 && fitH > 0 && (
        <div
          ref={containerRef}
          className="canvas-frame-container"
          style={{
            position: "absolute",
            width: `${currentDomW}px`,
            height: `${currentDomH}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px #28292f",
            borderRadius: "2px",
            background: "#000000",
            transition: isPanning ? "none" : "transform 0.05s ease-out",
          }}
        >
          <canvas
            ref={canvasRef}
            width={projW}
            height={projH}
            style={{ width: "100%", height: "100%", display: "block" }}
          />

          {currentDomW > 0 && (
            <CanvasGizmo containerWidth={currentDomW} />
          )}

          {/* Canvas bounds badge */}
          <div className="canvas-res-tag">
            {projW}×{projH}
          </div>
        </div>
      )}
    </div>
  );
}
