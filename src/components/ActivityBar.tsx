import { useAppStore } from "../state/store";
import { Icon } from "./ui/Icon";

/**
 * Left-side activity bar — controls left dock panel selection (WebStorm upper section)
 * and the bottom dock (Timeline) toggle (WebStorm lower section).
 *
 * Inspector toggle lives in RightActivityBar.
 * Keyboard Shortcuts are accessible via Help menu or the ? key only.
 */
export function ActivityBar() {
  const leftDockOpen = useAppStore((s) => s.leftDockOpen);
  const timelineDockOpen = useAppStore((s) => s.timelineDockOpen);
  const activeLeftTab = useAppStore((s) => s.activeLeftTab);
  const toggleLeftDock = useAppStore((s) => s.toggleLeftDock);
  const toggleTimelineDock = useAppStore((s) => s.toggleTimelineDock);
  const setActiveLeftTab = useAppStore((s) => s.setActiveLeftTab);

  const handleTabClick = (tab: "media" | "text" | "effects" | "transitions" | "keyframes") => {
    if (leftDockOpen && activeLeftTab === tab) {
      toggleLeftDock();
    } else {
      setActiveLeftTab(tab);
      if (!leftDockOpen) toggleLeftDock();
    }
  };

  return (
    <aside className="activity-bar">
      {/* Upper section: open Left Dock panels */}
      <div className="activity-group">
        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "media" ? "activity-btn--active" : ""}`}
          title="Media Library"
          onClick={() => handleTabClick("media")}
        >
          <Icon name="folder" size={18} />
        </button>

        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "text" ? "activity-btn--active" : ""}`}
          title="Text & Titles"
          onClick={() => handleTabClick("text")}
        >
          <Icon name="text" size={18} />
        </button>

        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "effects" ? "activity-btn--active" : ""}`}
          title="Effects & Color Filters"
          onClick={() => handleTabClick("effects")}
        >
          <Icon name="palette" size={18} />
        </button>

        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "transitions" ? "activity-btn--active" : ""}`}
          title="Transitions & Dissolves"
          onClick={() => handleTabClick("transitions")}
        >
          <Icon name="transition" size={18} />
        </button>

        <button
          className={`activity-btn ${leftDockOpen && activeLeftTab === "keyframes" ? "activity-btn--active" : ""}`}
          title="Motion Keyframes (After Effects)"
          onClick={() => handleTabClick("keyframes")}
        >
          <Icon name="keyframe" size={18} />
        </button>
      </div>

      {/* Lower section: toggle bottom dock (Timeline) */}
      <div className="activity-group activity-group-bottom">
        <button
          className={`activity-btn ${timelineDockOpen ? "activity-btn--active" : ""}`}
          title="Toggle Timeline"
          onClick={toggleTimelineDock}
        >
          <Icon name="timeline" size={18} />
        </button>
      </div>
    </aside>
  );
}
