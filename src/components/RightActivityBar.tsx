import { useAppStore } from "../state/store";
import { Icon } from "./ui/Icon";

/**
 * Right-side activity bar — mirrors the WebStorm right tool window strip.
 * Controls panels that open on the right side of the workspace.
 */
export function RightActivityBar() {
  const rightDockOpen = useAppStore((s) => s.rightDockOpen);
  const toggleRightDock = useAppStore((s) => s.toggleRightDock);

  return (
    <aside className="activity-bar activity-bar--right">
      <div className="activity-group">
        <button
          className={`activity-btn ${rightDockOpen ? "activity-btn--active" : ""}`}
          title="Toggle Properties Inspector (I)"
          onClick={toggleRightDock}
        >
          <Icon name="inspector" size={18} />
        </button>
      </div>
    </aside>
  );
}
