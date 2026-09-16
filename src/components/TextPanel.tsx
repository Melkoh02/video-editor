import { useAppStore } from "../state/store";
import type { TextProperties } from "../types";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

type TextPreset = {
  id: string;
  name: string;
  description: string;
  text: TextProperties;
};

const TEXT_PRESETS: TextPreset[] = [
  {
    id: "title-card",
    name: "Main Title Card",
    description: "Large bold centered heading",
    text: {
      content: "HEADING TITLE",
      fontSize: 72,
      fontFamily: "Inter",
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
  },
  {
    id: "lower-third",
    name: "Lower Third Banner",
    description: "Name & title lower banner",
    text: {
      content: "Presenter Name • Title",
      fontSize: 44,
      fontFamily: "Inter",
      color: "#f59e0b",
      backgroundColor: "rgba(15, 23, 42, 0.85)",
    },
  },
  {
    id: "impact-meme",
    name: "Bold Impact Caption",
    description: "High visibility outlined text",
    text: {
      content: "IMPACT CAPTION",
      fontSize: 80,
      fontFamily: "Impact",
      color: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 5,
    },
  },
  {
    id: "subtitles",
    name: "Subtitle Bar",
    description: "Bottom caption text overlay",
    text: {
      content: "Sample dialogue subtitle goes here...",
      fontSize: 38,
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.75)",
    },
  },
  {
    id: "vintage-serif",
    name: "Classic Cinema Serif",
    description: "Elegant serif film title",
    text: {
      content: "Classic Cinema",
      fontSize: 64,
      fontFamily: "Georgia",
      color: "#fef08a",
    },
  },
];

export function TextPanel() {
  const project = useAppStore((s) => s.project);
  const currentTime = useAppStore((s) => s.currentTime);
  const addTrack = useAppStore((s) => s.addTrack);
  const addClip = useAppStore((s) => s.addClip);
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);

  const handleAddTextClip = (preset: TextProperties) => {
    const videoTracks = project.tracks.filter((t) => t.type === "video");
    let targetTrackId: string;

    if (videoTracks.length > 0) {
      targetTrackId = videoTracks[0].id;
    } else {
      targetTrackId = addTrack("video");
    }

    addClip(targetTrackId, {
      sourceId: `text-${Date.now()}`,
      name: `Text: ${preset.content.slice(0, 15)}`,
      mediaType: "text",
      inPoint: 0,
      outPoint: 4, // default 4 seconds duration
      timelineStart: currentTime,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      opacity: 1,
      volume: 1,
      text: { ...preset },
    });
  };

  return (
    <div
      className={`media-bin-panel ${activePanel === "leftDock" ? "panel--active" : ""}`}
      onMouseDown={() => setActivePanel("leftDock")}
    >
      <div className="panel-header">
        <span className="panel-title">Text & Titles</span>
        <Button variant="primary" onClick={() => handleAddTextClip(TEXT_PRESETS[0].text)}>
          <Icon name="plus" size={12} style={{ marginRight: 4 }} /> Add Title
        </Button>
      </div>

      <div className="media-bin-grid">
        {TEXT_PRESETS.map((preset) => (
          <div key={preset.id} className="media-bin-card" style={{ cursor: "pointer" }} onClick={() => handleAddTextClip(preset.text)}>
            <div
              className="media-card-preview"
              style={{
                background: "#1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 6px",
                width: "56px",
                height: "36px",
                overflow: "hidden",
                borderRadius: "4px",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: preset.text.fontFamily,
                  fontSize: "11px",
                  color: preset.text.color,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  textAlign: "center",
                  textShadow: preset.text.strokeColor ? `0 0 2px ${preset.text.strokeColor}` : "none",
                }}
              >
                {preset.text.content}
              </span>
            </div>
            <div className="media-card-info">
              <div className="media-card-title">{preset.name}</div>
              <div className="media-card-sub">{preset.description}</div>
            </div>
            <div className="media-card-actions">
              <button
                className="card-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTextClip(preset.text);
                }}
              >
                + Add to Playhead
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
