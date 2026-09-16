import { useState, useRef, useCallback, type ReactNode } from "react";
import { useAppStore } from "../state/store";

type ResizableLayoutProps = {
  activityBar: ReactNode;
  leftDock: ReactNode;
  centerDock: ReactNode;
  rightDock: ReactNode;
  rightActivityBar: ReactNode;
  timelineDock: ReactNode;
};

export function ResizableLayout({
  activityBar,
  leftDock,
  centerDock,
  rightDock,
  rightActivityBar,
  timelineDock,
}: ResizableLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(260);
  const [timelineHeight, setTimelineHeight] = useState(260);

  const leftDockOpen = useAppStore((s) => s.leftDockOpen);
  const rightDockOpen = useAppStore((s) => s.rightDockOpen);
  const timelineDockOpen = useAppStore((s) => s.timelineDockOpen);

  const isDraggingRef = useRef<"left" | "right" | "bottom" | null>(null);

  const startResize = useCallback(
    (type: "left" | "right" | "bottom", e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = type;

      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = leftWidth;
      const startRight = rightWidth;
      const startTimeline = timelineHeight;

      const onMouseMove = (me: MouseEvent) => {
        const mode = isDraggingRef.current;
        if (!mode) return;

        if (mode === "left") {
          const dx = me.clientX - startX;
          setLeftWidth(Math.min(500, Math.max(160, startLeft + dx)));
        } else if (mode === "right") {
          const dx = startX - me.clientX;
          setRightWidth(Math.min(500, Math.max(160, startRight + dx)));
        } else if (mode === "bottom") {
          const dy = startY - me.clientY;
          setTimelineHeight(Math.min(600, Math.max(140, startTimeline + dy)));
        }
      };

      const onMouseUp = () => {
        isDraggingRef.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [leftWidth, rightWidth, timelineHeight]
  );

  return (
    <div className="resizable-workspace-shell" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <main className="workspace" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Activity Bar */}
        {activityBar}

        {/* Left Dock */}
        {leftDockOpen && (
          <>
            <aside className="left-dock" style={{ width: leftWidth, minWidth: leftWidth, maxWidth: leftWidth }}>
              {leftDock}
            </aside>
            <div
              className="splitter-handle splitter-col"
              onMouseDown={(e) => startResize("left", e)}
              title="Drag to resize Left Dock"
            />
          </>
        )}

        {/* Center Dock (Preview Canvas) */}
        <section className="center-dock" style={{ flex: 1 }}>
          {centerDock}
        </section>

        {/* Right Dock */}
        {rightDockOpen && (
          <>
            <div
              className="splitter-handle splitter-col"
              onMouseDown={(e) => startResize("right", e)}
              title="Drag to resize Right Inspector"
            />
            <aside className="right-dock" style={{ width: rightWidth, minWidth: rightWidth, maxWidth: rightWidth }}>
              {rightDock}
            </aside>
          </>
        )}

        {/* Right Activity Bar */}
        {rightActivityBar}
      </main>

      {/* Timeline Dock */}
      {timelineDockOpen && (
        <>
          <div
            className="splitter-handle splitter-row"
            onMouseDown={(e) => startResize("bottom", e)}
            title="Drag to resize Timeline"
          />
          <footer className="timeline-dock" style={{ height: timelineHeight, minHeight: timelineHeight, maxHeight: timelineHeight }}>
            {timelineDock}
          </footer>
        </>
      )}
    </div>
  );
}
