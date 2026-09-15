import React from "react";
import "./App.css";

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="app-title">VideoEditor</span>
      </header>
      <main className="workspace">
        <div className="preview-area">
          <canvas id="preview-canvas" width={1280} height={720} />
        </div>
        <div className="timeline-area">
          <p className="placeholder-text">Timeline — coming next</p>
        </div>
      </main>
    </div>
  );
}
