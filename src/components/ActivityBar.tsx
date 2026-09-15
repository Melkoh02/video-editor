import { useAppStore } from "../state/store";

export function ActivityBar({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const leftDockOpen = useAppStore((s) => s.leftDockOpen);
  const rightDockOpen = useAppStore((s) => s.rightDockOpen);
  const timelineDockOpen = useAppStore((s) => s.timelineDockOpen);
  const activeLeftTab = useAppStore((s) => s.activeLeftTab);
  const toggleLeftDock = useAppStore((s) => s.toggleLeftDock);
  const toggleRightDock = useAppStore((s) => s.toggleRightDock);
  const toggleTimelineDock = useAppStore((s) => s.toggleTimelineDock);
  const setActiveLeftTab = useAppStore((s) => s.setActiveLeftTab);

  const handleTabClick = (tab: "media" | "text" | "effects") => {
    if (leftDockOpen && activeLeftTab === tab) {
      toggleLeftDock();
    } else {
      setActiveLeftTab(tab);
    }
  };

  return (
    <aside className="activity-bar">
      <div className="activity-group">
        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "media" ? "activity-btn--active" : ""}`}
          title="Media Library (📁)"
          onClick={() => handleTabClick("media")}
        >
          <span className="act-icon">📁</span>
        </button>

        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "text" ? "activity-btn--active" : ""}`}
          title="Text & Titles (🔤)"
          onClick={() => handleTabClick("text")}
        >
          <span className="act-icon">🔤</span>
        </button>

        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "effects" ? "activity-btn--active" : ""}`}
          title="Effects & Color Filters (🎨)"
          onClick={() => handleTabClick("effects")}
        >
          <span className="act-icon">🎨</span>
        </button>
      </div>

      <div className="activity-group activity-group-bottom">
        <button
          className={`activity-btn ${rightDockOpen ? "activity-btn--active" : ""}`}
          title="Toggle Properties Inspector (⚙️)"
          onClick={toggleRightDock}
        >
          <span className="act-icon">⚙️</span>
        </button>

        <button
          className={`activity-btn ${timelineDockOpen ? "activity-btn--active" : ""}`}
          title="Toggle Multi-track Timeline (🎞️)"
          onClick={toggleTimelineDock}
        >
          <span className="act-icon">🎞️</span>
        </button>

        <button
          className="activity-btn"
          title="Keyboard Shortcuts Reference (⌨️)"
          onClick={onOpenShortcuts}
        >
          <span className="act-icon">⌨️</span>
        </button>
      </div>
    </aside>
  );
}
