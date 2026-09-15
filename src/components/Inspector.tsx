import { useAppStore, findClipAndTrack } from "../state/store";
import { playbackController } from "../engine/playback";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Slider } from "./ui/Slider";
import { Select } from "./ui/Select";

export function Inspector() {
  const project = useAppStore((s) => s.project);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const updateClip = useAppStore((s) => s.updateClip);
  const removeSelectedClip = useAppStore((s) => s.removeSelectedClip);
  const splitClipAtCurrentTime = useAppStore((s) => s.splitClipAtCurrentTime);
  const setResolution = useAppStore((s) => s.setResolution);
  const setFps = useAppStore((s) => s.setFps);
  const setProjectName = useAppStore((s) => s.setProjectName);

  let selectedClip = null;
  let selectedTrack = null;

  if (selectedClipId) {
    const res = findClipAndTrack(project.tracks, selectedClipId);
    if (res) {
      selectedTrack = res.track;
      selectedClip = res.clip;
    }
  }

  const t = selectedClip?.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  const opacity = selectedClip?.opacity !== undefined ? selectedClip.opacity : 1;
  const volume = selectedClip?.volume !== undefined ? selectedClip.volume : 1;
  const textProps = selectedClip?.text || {
    content: "Sample Text",
    fontSize: 64,
    fontFamily: "Inter",
    color: "#ffffff",
  };

  const handleTransformChange = (key: string, value: number) => {
    if (!selectedClip || !selectedTrack) return;
    const currentT = selectedClip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    updateClip(selectedTrack.id, selectedClip.id, {
      transform: { ...currentT, [key]: value },
    });
  };

  const handleTextChange = (key: string, value: string | number) => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, {
      text: { ...textProps, [key]: value },
    });
  };

  const handleResetTransform = () => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, {
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    });
  };

  if (!selectedClip || !selectedTrack) {
    return (
      <div className="inspector-panel">
        <div className="panel-header">
          <span className="panel-title">Sequence Settings</span>
        </div>
        <div className="inspector-content">
          <Input
            label="Project Name"
            type="text"
            value={project.name}
            onChange={(e) => setProjectName(e.target.value)}
          />

          <Select
            label="Aspect Ratio / Preset"
            value={`${project.resolution.width}x${project.resolution.height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split("x").map(Number);
              setResolution(w, h);
            }}
            options={[
              { label: "16:9 Landscape (1920×1080)", value: "1920x1080" },
              { label: "9:16 Vertical / Shorts (1080×1920)", value: "1080x1920" },
              { label: "1:1 Square (1080×1080)", value: "1080x1080" },
              { label: "4K Ultra HD (3840×2160)", value: "3840x2160" },
            ]}
          />

          <Select
            label="Frame Rate (FPS)"
            value={project.fps}
            onChange={(e) => setFps(Number(e.target.value))}
            options={[
              { label: "24 fps (Cinema)", value: 24 },
              { label: "25 fps (PAL)", value: 25 },
              { label: "30 fps (Standard)", value: 30 },
              { label: "60 fps (Smooth)", value: 60 },
            ]}
          />

          <div className="inspector-tip">
            💡 Select any clip on the canvas or timeline to inspect and transform properties.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      <div className="panel-header">
        <span className="panel-title">Clip Inspector</span>
        <Button variant="danger" title="Delete selected clip" onClick={removeSelectedClip}>
          🗑 Delete
        </Button>
      </div>

      <div className="inspector-content">
        <div className="inspector-card">
          <div className="card-header-badge">
            {selectedClip.mediaType === "video" && "🎬 Video Clip"}
            {selectedClip.mediaType === "image" && "🖼️ Image Clip"}
            {selectedClip.mediaType === "audio" && "🎵 Audio Clip"}
            {selectedClip.mediaType === "text" && "🔤 Text Clip"}
          </div>
          <div className="card-clip-name">{selectedClip.name || selectedClip.sourceId.slice(0, 8)}</div>
        </div>

        {/* Text Properties */}
        {(selectedClip.mediaType === "text" || selectedClip.text) && (
          <div className="prop-section">
            <div className="section-title">Text Properties</div>
            <Input
              label="Text Content"
              type="text"
              value={textProps.content}
              onChange={(e) => handleTextChange("content", e.target.value)}
            />

            <div className="prop-grid-2">
              <Select
                label="Font Family"
                value={textProps.fontFamily}
                onChange={(e) => handleTextChange("fontFamily", e.target.value)}
                options={[
                  { label: "Inter", value: "Inter" },
                  { label: "Impact", value: "Impact" },
                  { label: "Arial", value: "Arial" },
                  { label: "Courier New", value: "Courier New" },
                  { label: "Georgia", value: "Georgia" },
                ]}
              />
              <Input
                label="Font Size (px)"
                type="number"
                value={textProps.fontSize}
                onChange={(e) => handleTextChange("fontSize", Number(e.target.value))}
              />
            </div>

            <div className="prop-grid-2">
              <Input
                label="Text Color"
                type="color"
                value={textProps.color}
                onChange={(e) => handleTextChange("color", e.target.value)}
              />
              <Input
                label="Background Color"
                type="color"
                value={textProps.backgroundColor || "#000000"}
                onChange={(e) => handleTextChange("backgroundColor", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Transform Properties (Video, Image & Text Clips) */}
        {selectedClip.mediaType !== "audio" && (
          <div className="prop-section">
            <div className="section-title">Transform & Position</div>
            <div className="prop-grid-2">
              <Input
                label="Position X (px)"
                type="number"
                value={Math.round(t.x)}
                onChange={(e) => handleTransformChange("x", Number(e.target.value))}
              />
              <Input
                label="Position Y (px)"
                type="number"
                value={Math.round(t.y)}
                onChange={(e) => handleTransformChange("y", Number(e.target.value))}
              />
            </div>

            <div className="prop-grid-2">
              <Input
                label="Scale X"
                type="number"
                step="0.05"
                value={t.scaleX}
                onChange={(e) => handleTransformChange("scaleX", Number(e.target.value))}
              />
              <Input
                label="Scale Y"
                type="number"
                step="0.05"
                value={t.scaleY}
                onChange={(e) => handleTransformChange("scaleY", Number(e.target.value))}
              />
            </div>

            <Slider
              label="Rotation (°)"
              min="0"
              max="360"
              value={t.rotation}
              valueDisplay={`${t.rotation}°`}
              onChange={(e) => handleTransformChange("rotation", Number(e.target.value))}
            />

            <Slider
              label={`Opacity (${Math.round(opacity * 100)}%)`}
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  opacity: Number(e.target.value),
                })
              }
            />

            <Button style={{ width: "100%", marginTop: "6px" }} onClick={handleResetTransform}>
              🔄 Reset Transform
            </Button>
          </div>
        )}

        {/* Audio Properties (Video & Audio Clips) */}
        {selectedClip.mediaType !== "image" && selectedClip.mediaType !== "text" && (
          <div className="prop-section">
            <div className="section-title">Audio Control</div>
            <Slider
              label={`Volume (${Math.round(volume * 100)}%)`}
              min="0"
              max="2"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const newVol = Number(e.target.value);
                updateClip(selectedTrack.id, selectedClip.id, { volume: newVol });
                playbackController.syncMediaElements(useAppStore.getState().playerState === "playing");
              }}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="prop-section">
          <div className="section-title">Actions</div>
          <Button
            style={{ width: "100%", marginBottom: "8px" }}
            onClick={splitClipAtCurrentTime}
          >
            ✂️ Split Clip at Playhead (S)
          </Button>
        </div>
      </div>
    </div>
  );
}
