import { useState, useRef, useEffect } from "react";
import { useAppStore, findClipAndTrack } from "../state/store";
import { playbackController } from "../engine/playback";
import { DEFAULT_FILTERS } from "../types";
import { applySideBySideLayout, applyFullscreenLayout } from "../engine/layout";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

type MenuType = "file" | "edit" | "clip" | "sequence" | "view" | "help" | null;

export function Topbar({
  onOpenShortcuts,
  onOpenFileInput,
  onOpenExport,
}: {
  onOpenShortcuts: () => void;
  onOpenFileInput: (forceNewTrack: boolean) => void;
  onOpenExport: () => void;
}) {
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);
  const menuNavRef = useRef<HTMLDivElement>(null);

  const project = useAppStore((s) => s.project);
  const currentTime = useAppStore((s) => s.currentTime);
  const playerState = useAppStore((s) => s.playerState);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  
  const autoSelectCanvas = useAppStore((s) => s.autoSelectCanvas);
  const transformControlsCanvas = useAppStore((s) => s.transformControlsCanvas);
  const setAutoSelectCanvas = useAppStore((s) => s.setAutoSelectCanvas);
  const setTransformControlsCanvas = useAppStore((s) => s.setTransformControlsCanvas);
  const setResolution = useAppStore((s) => s.setResolution);
  const setFps = useAppStore((s) => s.setFps);

  const toggleLeftDock = useAppStore((s) => s.toggleLeftDock);
  const toggleRightDock = useAppStore((s) => s.toggleRightDock);
  const toggleTimelineDock = useAppStore((s) => s.toggleTimelineDock);
  const addTrack = useAppStore((s) => s.addTrack);
  const updateClip = useAppStore((s) => s.updateClip);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuNavRef.current && !menuNavRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleResetTransform = () => {
    if (!selectedClipId) return;
    const res = findClipAndTrack(project.tracks, selectedClipId);
    if (res) {
      updateClip(res.track.id, res.clip.id, {
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      });
    }
  };

  const handleResetFilters = () => {
    if (!selectedClipId) return;
    const res = findClipAndTrack(project.tracks, selectedClipId);
    if (res) {
      updateClip(res.track.id, res.clip.id, {
        filters: { ...DEFAULT_FILTERS },
      });
    }
  };

  const toggleMenu = (menu: MenuType) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  return (
    <header className="nle-topbar">
      {/* Row 1: Brand, Menu Bar, Sequence Badge, Timecode, Export */}
      <div className="topbar-row-1">
        <div className="topbar-left">
          <div className="brand-badge">
            <Icon name="movie" size={18} className="brand-logo-icon" />
            <span className="brand-name">Video Editor</span>
            <span className="status-pill">● Offline Studio</span>
          </div>

          <nav className="topbar-menu" ref={menuNavRef}>
            {/* File Menu */}
            <div className="menu-dropdown-wrapper">
              <button
                className={`menu-item ${activeMenu === "file" ? "active" : ""}`}
                onClick={() => toggleMenu("file")}
              >
                File
              </button>
              {activeMenu === "file" && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { onOpenFileInput(false); setActiveMenu(null); }}>
                    <Icon name="plus" size={14} /> Import Media File...
                  </button>
                  <button className="dropdown-item" onClick={() => { onOpenFileInput(true); setActiveMenu(null); }}>
                    <Icon name="video" size={14} /> Add New Video Track
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
                      const dl = document.createElement("a");
                      dl.setAttribute("href", dataStr);
                      dl.setAttribute("download", `${project.name || "Project"}.nle.json`);
                      dl.click();
                      setActiveMenu(null);
                    }}
                  >
                    <Icon name="download" size={14} /> Save Project (.json)
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".json";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            const parsed = JSON.parse(ev.target?.result as string);
                            if (parsed && parsed.tracks) {
                              useAppStore.getState().loadProject(parsed);
                            }
                          } catch (err) {
                            alert("Invalid project file");
                          }
                        };
                        reader.readAsText(file);
                      };
                      input.click();
                      setActiveMenu(null);
                    }}
                  >
                    <Icon name="folder" size={14} /> Open Project (.json)...
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item danger"
                    onClick={() => {
                      if (confirm("Reset current project sequence? Unsaved changes will be cleared.")) {
                        useAppStore.getState().resetProject();
                      }
                      setActiveMenu(null);
                    }}
                  >
                    <Icon name="reset" size={14} /> New / Reset Project
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={() => { onOpenExport(); setActiveMenu(null); }}>
                    <Icon name="export" size={14} /> Export Sequence...
                  </button>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div className="menu-dropdown-wrapper">
              <button
                className={`menu-item ${activeMenu === "edit" ? "active" : ""}`}
                onClick={() => toggleMenu("edit")}
              >
                Edit
              </button>
              {activeMenu === "edit" && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().undo(); setActiveMenu(null); }}>
                    <Icon name="undo" size={14} /> Undo <span className="shortcut-hint">⌘Z</span>
                  </button>
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().redo(); setActiveMenu(null); }}>
                    <Icon name="redo" size={14} /> Redo <span className="shortcut-hint">⌘⇧Z</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().splitClipAtCurrentTime(); setActiveMenu(null); }}>
                    <Icon name="scissors" size={14} /> Split Clip at Playhead <span className="shortcut-hint">S</span>
                  </button>
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().duplicateSelectedClip(); setActiveMenu(null); }}>
                    <Icon name="copy" size={14} /> Duplicate Selected Clip <span className="shortcut-hint">⌘D</span>
                  </button>
                  <button className="dropdown-item danger" onClick={() => { useAppStore.getState().removeSelectedClip(); setActiveMenu(null); }}>
                    <Icon name="trash" size={14} /> Delete Selected Clip <span className="shortcut-hint">Del</span>
                  </button>
                </div>
              )}
            </div>

            {/* Clip Menu */}
            <div className="menu-dropdown-wrapper">
              <button
                className={`menu-item ${activeMenu === "clip" ? "active" : ""}`}
                onClick={() => toggleMenu("clip")}
              >
                Clip
              </button>
              {activeMenu === "clip" && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { handleResetTransform(); setActiveMenu(null); }}>
                    <Icon name="reset" size={14} /> Reset Transform
                  </button>
                  <button className="dropdown-item" onClick={() => { handleResetFilters(); setActiveMenu(null); }}>
                    <Icon name="palette" size={14} /> Reset Color Filters
                  </button>
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().separateAudioFromVideo(); setActiveMenu(null); }}>
                    <Icon name="audio" size={14} /> Separate Audio Track
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().splitClipAtCurrentTime(); setActiveMenu(null); }}>
                    <Icon name="scissors" size={14} /> Split Clip
                  </button>
                  <button className="dropdown-item danger" onClick={() => { useAppStore.getState().removeSelectedClip(); setActiveMenu(null); }}>
                    <Icon name="trash" size={14} /> Delete Clip
                  </button>
                </div>
              )}
            </div>

            {/* Sequence Menu */}
            <div className="menu-dropdown-wrapper">
              <button
                className={`menu-item ${activeMenu === "sequence" ? "active" : ""}`}
                onClick={() => toggleMenu("sequence")}
              >
                Sequence
              </button>
              {activeMenu === "sequence" && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">Aspect Ratio Presets</div>
                  <button className="dropdown-item" onClick={() => { setResolution(1920, 1080); setActiveMenu(null); }}>
                    <Icon name="aspect-ratio" size={14} /> 16:9 Landscape (1920×1080)
                  </button>
                  <button className="dropdown-item" onClick={() => { setResolution(1080, 1920); setActiveMenu(null); }}>
                    <Icon name="aspect-ratio" size={14} /> 9:16 Vertical / Shorts (1080×1920)
                  </button>
                  <button className="dropdown-item" onClick={() => { setResolution(1080, 1080); setActiveMenu(null); }}>
                    <Icon name="aspect-ratio" size={14} /> 1:1 Square (1080×1080)
                  </button>
                  <button className="dropdown-item" onClick={() => { setResolution(3840, 2160); setActiveMenu(null); }}>
                    <Icon name="aspect-ratio" size={14} /> 4K Ultra HD (3840×2160)
                  </button>
                  <div className="dropdown-divider" />
                  <div className="dropdown-header">Frame Rate</div>
                  <button className="dropdown-item" onClick={() => { setFps(24); setActiveMenu(null); }}>
                    24 FPS (Cinema)
                  </button>
                  <button className="dropdown-item" onClick={() => { setFps(30); setActiveMenu(null); }}>
                    30 FPS (Standard)
                  </button>
                  <button className="dropdown-item" onClick={() => { setFps(60); setActiveMenu(null); }}>
                    60 FPS (Smooth)
                  </button>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="menu-dropdown-wrapper">
              <button
                className={`menu-item ${activeMenu === "view" ? "active" : ""}`}
                onClick={() => toggleMenu("view")}
              >
                View
              </button>
              {activeMenu === "view" && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">Dock Panels</div>
                  <button className="dropdown-item" onClick={() => { toggleLeftDock(); setActiveMenu(null); }}>
                    <Icon name="folder" size={14} /> Toggle Media Library
                  </button>
                  <button className="dropdown-item" onClick={() => { toggleRightDock(); setActiveMenu(null); }}>
                    <Icon name="inspector" size={14} /> Toggle Inspector
                  </button>
                  <button className="dropdown-item" onClick={() => { toggleTimelineDock(); setActiveMenu(null); }}>
                    <Icon name="timeline" size={14} /> Toggle Timeline
                  </button>
                  <div className="dropdown-divider" />
                  <div className="dropdown-header">Layout Presets</div>
                  <button className="dropdown-item" onClick={() => { applySideBySideLayout(); setActiveMenu(null); }}>
                    <Icon name="side-by-side" size={14} /> Side-by-side Layout
                  </button>
                  <button className="dropdown-item" onClick={() => { applyFullscreenLayout(); setActiveMenu(null); }}>
                    <Icon name="fullscreen" size={14} /> Fullscreen Preview Layout
                  </button>
                  <div className="dropdown-divider" />
                  <div className="dropdown-header">Zoom Controls</div>
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().zoomIn(); setActiveMenu(null); }}>
                    <Icon name="zoom-in" size={14} /> Zoom In <span className="shortcut-hint">⌘+</span>
                  </button>
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().zoomOut(); setActiveMenu(null); }}>
                    <Icon name="zoom-out" size={14} /> Zoom Out <span className="shortcut-hint">⌘-</span>
                  </button>
                  <button className="dropdown-item" onClick={() => { useAppStore.getState().zoomToFit(1200); setActiveMenu(null); }}>
                    <Icon name="zoom-fit" size={14} /> Zoom to Fit
                  </button>
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div className="menu-dropdown-wrapper">
              <button
                className={`menu-item ${activeMenu === "help" ? "active" : ""}`}
                onClick={() => toggleMenu("help")}
              >
                Help
              </button>
              {activeMenu === "help" && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { onOpenShortcuts(); setActiveMenu(null); }}>
                    <Icon name="keyboard" size={14} /> Keyboard Shortcuts Reference <span className="shortcut-hint">?</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={() => { alert("Video Editor v2.0 - Non-Linear Video Editing Studio"); setActiveMenu(null); }}>
                    <Icon name="info" size={14} /> About Video Editor
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="topbar-center">
          <div className="sequence-badge" title="Active Sequence Info">
            <Icon name="movie" size={14} className="seq-icon" />
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
              <Icon name="play" size={12} />
            </button>
            <button
              className="tb-btn"
              disabled={playerState !== "playing"}
              onClick={() => playbackController.pause()}
              title="Pause (K / Space)"
            >
              <Icon name="pause" size={12} />
            </button>
            <button className="tb-btn" onClick={() => playbackController.stop()} title="Stop">
              <Icon name="stop" size={12} />
            </button>
          </div>

          <Button variant="primary" onClick={onOpenExport} title="Export Sequence to MP4 / WebM">
            <Icon name="export" size={14} style={{ marginRight: 6 }} /> Export
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
            <Icon name="plus" size={12} style={{ marginRight: 4 }} /> Video
          </Button>
          <Button size="sm" onClick={() => onOpenFileInput(true)} title="Add video to new track">
            <Icon name="plus" size={12} style={{ marginRight: 4 }} /> Track
          </Button>
          <Button size="sm" variant="primary" onClick={handleAddText} title="Add text overlay at playhead">
            <Icon name="text" size={12} style={{ marginRight: 4 }} /> Text
          </Button>
        </div>
      </div>
    </header>
  );
}
