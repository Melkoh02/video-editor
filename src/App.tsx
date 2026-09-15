import "./App.css";
import { Toolbar } from "./components/Toolbar";
import { PreviewCanvas } from "./components/PreviewCanvas";

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
          <p className="placeholder-text">Timeline — coming next</p>
        </div>
      </main>
    </div>
  );
}
