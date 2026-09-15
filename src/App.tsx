import "./App.css";
import { Toolbar } from "./components/Toolbar";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { Timeline } from "./components/Timeline";

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="app-title">VideoEditor</span>
        <Toolbar />
      </header>
      <main className="workspace">
        <div className="preview-area">
          <PreviewCanvas />
        </div>
        <div className="timeline-area">
          <Timeline />
        </div>
      </main>
    </div>
  );
}
