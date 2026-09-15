import { useEffect, useRef } from "react";
import { useAppStore } from "../state/store";
import { Compositor } from "../engine/compositor";

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<Compositor | null>(null);

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

  // Keep canvas aspect ratio in sync with project resolution
  const { width, height } = project.resolution;
  const aspectRatio = `${width} / ${height}`;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ aspectRatio, maxWidth: "100%", maxHeight: "100%", display: "block" }}
    />
  );
}
