import { useAppStore } from "../state/store";
import { playbackController } from "../engine/playback";
import { applySideBySideLayout, applyFullscreenLayout } from "../engine/layout";
import { Button } from "./ui/Button";

export function Topbar({
  onOpenShortcuts,
  onOpenFileInput,
}: {
  onOpenShortcuts: () => void;
  onOpenFileInput: (forceNewTrack: boolean) => void;
}) {
  const project = useAppStore((s) => s.project);
  const currentTime = useAppStore((s) => s.currentTime);
  const playerState = useAppStore((s) => s.playerState);
  const autoSelectCanvas = useAppStore((s) => s.autoSelectCanvas);
  const transformControlsCanvas = useAppStore((s) => s.transformControlsCanvas);
  const setAutoSelectCanvas = useAppStore((s) => s.setAutoSelectCanvas);
  const setTransformControlsCanvas = useAppStore((s) => s.setTransformControlsCanvas);

  const toggleLeftDock = useAppStore((s) => s.toggleLeftDock);
  const toggleRightDock = useAppStore((s) => s.toggleRightDock);
  const toggleTimelineDock = useAppStore((s) => s.toggleTimelineDock);
  const addTrack = useAppStore((s) => s.addTrack);

  // Format SMPTE timecode HH:MM:SS:FF
  const formatTimecode = (sec: number) => {
    const fps = project.fps || 30;
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const frames = Math.floor((sec % 1) * fps);
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  const handleAddText = () => {
    const videoTracks = project.tracks.filter((t) => t.type === "video");
    let trackId: string;
    if (videoTracks.length > 0) {
      trackId = videoTracks[0].id;
    } else {
      trackId = addTrack("video");
    }

    useAppStore.getState().addClip(trackId, {
      sourceId: `text-${Date.now()}`,
      name: "Text Overlay",
      mediaType: "text",
      inPoint: 0,
      outPoint: 5,
      timelineStart: currentTime,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      opacity: 1,
      text: {
        content: "Sample Title",
        fontSize: 64,
        fontFamily: "Inter",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 4,
      },
    });
  };

  return (
    <header className="nle-topbar">
      {/* Row 1: Brand, Menu Bar, Sequence Badge, Timecode, Export */}
      <div className="topbar-row-1">
        <div className="topbar-left">
          <div className="brand-badge">
            <span className="brand-logo">🎬</span>
            <span className="brand-name">Loomis Studio</span>
            <span className="status-pill">● WASM • Ready</span>
          </div>

          <nav className="topbar-menu">
            <button className="menu-item" onClick={() => onOpenFileInput(false)}>File</button>
            <button className="menu-item">Edit</button>
            <button className="menu-item">Clip</button>
            <button className="menu-item">Sequence</button>
            <button className="menu-item">View</button>
            <button className="menu-item" onClick={onOpenShortcuts}>Help</button>
          </nav>
        </div>

        <div className="topbar-center">
          <div className="sequence-badge" title="Active Sequence Info">
            <span className="seq-icon">🎬</span>
            <span className="seq-title">{project.name}</span>
            <span className="seq-meta">{project.resolution.width}x{project.resolution.height} • {project.fps}fps</span>
          </div>
          <div className="timecode-display" title="SMPTE Timecode">
            {formatTimecode(currentTime)}
          </div>
        </div>

        <div className="topbar-right">
          {/* Transport Controls */}
          <div className="transport-group">
            <button
              className="tb-btn"
              disabled={playerState === "playing"}
              onClick={() => playbackController.play()}
              title="Play (Space)"
            >
              ▶
            </button>
            <button
              className="tb-btn"
              disabled={playerState !== "playing"}
              onClick={() => playbackController.pause()}
              title="Pause (K / Space)"
            >
              ⏸
            </button>
            <button className="tb-btn" onClick={() => playbackController.stop()} title="Stop">
              ⏹
            </button>
          </div>

          <Button variant="primary" onClick={() => alert("Exporting sequence to MP4 file...")} title="Export Sequence to MP4">
            📤 Export
          </Button>
        </div>
      </div>

      {/* Row 2: Contextual Toolbar & Panel Toggles */}
      <div className="topbar-row-2">
        <div className="context-tools">
          <label className="context-checkbox" title="Toggle click-to-select clips on canvas">
            <input
              type="checkbox"
              checked={autoSelectCanvas}
              onChange={(e) => setAutoSelectCanvas(e.target.checked)}
            />
            <span>Auto-Select</span>
          </label>

          <label className="context-checkbox" title="Toggle transform gizmo overlay on canvas">
            <input
              type="checkbox"
              checked={transformControlsCanvas}
              onChange={(e) => setTransformControlsCanvas(e.target.checked)}
            />
            <span>Transform Controls</span>
          </label>

          <div className="tb-separator" />

          <Button size="sm" onClick={() => onOpenFileInput(false)} title="Import video to current track">
            + Video
          </Button>
          <Button size="sm" onClick={() => onOpenFileInput(true)} title="Add video to new track">
            + Track
          </Button>
          <Button size="sm" variant="primary" onClick={handleAddText} title="Add text overlay at playhead">
            + Text
          </Button>

          <div className="tb-separator" />

          <button className="tb-btn" onClick={() => applySideBySideLayout()} title="Side-by-side layout">
            ⬜⬜ Side-by-side
          </button>
          <button className="tb-btn" onClick={() => applyFullscreenLayout()} title="Fullscreen layout">
            ⬛ Fullscreen
          </button>
        </div>

        <div className="dock-toggles">
          <button className="tb-btn" onClick={toggleLeftDock} title="Toggle Left Media Dock">
            📁 Media
          </button>
          <button className="tb-btn" onClick={toggleRightDock} title="Toggle Right Inspector Dock">
            ⚙️ Inspector
          </button>
          <button className="tb-btn" onClick={toggleTimelineDock} title="Toggle Timeline Dock">
            🎞️ Timeline
          </button>
        </div>
      </div>
    </header>
  );
}
