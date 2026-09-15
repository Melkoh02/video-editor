import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../state/store";
import { Compositor } from "../engine/compositor";
import { CanvasGizmo } from "./CanvasGizmo";

export function PreviewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const project = useAppStore((s) => s.project);

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

  // Track DOM size of canvas viewport for Gizmo overlay scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { width, height } = project.resolution;
  const aspectRatio = `${width} / ${height}`;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        aspectRatio,
        maxWidth: "100%",
        maxHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        borderRadius: "4px",
        overflow: "hidden",
        background: "#000000",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {size.width > 0 && size.height > 0 && (
        <CanvasGizmo containerWidth={size.width} />
      )}
    </div>
  );
}
