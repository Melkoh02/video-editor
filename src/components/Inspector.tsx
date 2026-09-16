import { useAppStore, findClipAndTrack } from "../state/store";
import { playbackController } from "../engine/playback";
import { DEFAULT_FILTERS } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Slider } from "./ui/Slider";
import { Select } from "./ui/Select";
import { Icon } from "./ui/Icon";

export function Inspector() {
  const project = useAppStore((s) => s.project);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const currentTime = useAppStore((s) => s.currentTime);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const updateClip = useAppStore((s) => s.updateClip);
  const addKeyframe = useAppStore((s) => s.addKeyframe);
  const removeKeyframe = useAppStore((s) => s.removeKeyframe);
  const removeSelectedClip = useAppStore((s) => s.removeSelectedClip);
  const splitClipAtCurrentTime = useAppStore((s) => s.splitClipAtCurrentTime);
  const separateAudioFromVideo = useAppStore((s) => s.separateAudioFromVideo);
  const setResolution = useAppStore((s) => s.setResolution);
  const setFps = useAppStore((s) => s.setFps);
  const setProjectName = useAppStore((s) => s.setProjectName);
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);
  const setActiveLeftTab = useAppStore((s) => s.setActiveLeftTab);
  const leftDockOpen = useAppStore((s) => s.leftDockOpen);
  const toggleLeftDock = useAppStore((s) => s.toggleLeftDock);

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
      <div
        className={`inspector-panel ${activePanel === "inspector" ? "panel--active" : ""}`}
        onMouseDown={() => setActivePanel("inspector")}
      >
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
            <Icon name="info" size={14} style={{ marginRight: 6 }} /> Select any clip on the canvas or timeline to inspect and transform properties.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inspector-panel ${activePanel === "inspector" ? "panel--active" : ""}`}
      onMouseDown={() => setActivePanel("inspector")}
    >
      <div className="panel-header">
        <span className="panel-title">Clip Inspector</span>
        <Button variant="danger" title="Delete selected clip" onClick={removeSelectedClip}>
          <Icon name="trash" size={12} style={{ marginRight: 4 }} /> Delete
        </Button>
      </div>

      <div className="inspector-content">
        {/* Dedicated Panel Quick Links */}
        <div className="inspector-quick-nav">
          <button
            className="quick-nav-btn"
            onClick={() => {
              setActiveLeftTab("keyframes");
              if (!leftDockOpen) toggleLeftDock();
            }}
          >
            <Icon name="keyframe" size={13} style={{ color: "#f59e0b", marginRight: 4 }} />
            Keyframes Panel →
          </button>
          <button
            className="quick-nav-btn"
            onClick={() => {
              setActiveLeftTab("transitions");
              if (!leftDockOpen) toggleLeftDock();
            }}
          >
            <Icon name="transition" size={13} style={{ color: "#6366f1", marginRight: 4 }} />
            Transitions Panel →
          </button>
        </div>
        <div className="inspector-card">
          <div className="card-header-badge">
            {selectedClip.mediaType === "video" && <><Icon name="video" size={12} style={{ marginRight: 4 }} /> Video Clip</>}
            {selectedClip.mediaType === "image" && <><Icon name="image" size={12} style={{ marginRight: 4 }} /> Image Clip</>}
            {selectedClip.mediaType === "audio" && <><Icon name="audio" size={12} style={{ marginRight: 4 }} /> Audio Clip</>}
            {selectedClip.mediaType === "text" && <><Icon name="text" size={12} style={{ marginRight: 4 }} /> Text Clip</>}
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
              <Icon name="reset" size={12} style={{ marginRight: 4 }} /> Reset Transform
            </Button>
          </div>
        )}

        {/* Color Grading & Filters (Video, Image & Text Clips) */}
        {selectedClip.mediaType !== "audio" && (
          <div className="prop-section">
            <div className="section-title">Color Grading & Filters</div>
            <Slider
              label={`Brightness (${(selectedClip.filters?.brightness ?? 100)}%)`}
              min="0"
              max="200"
              step="1"
              value={selectedClip.filters?.brightness ?? 100}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    brightness: Number(e.target.value),
                  },
                })
              }
            />
            <Slider
              label={`Contrast (${(selectedClip.filters?.contrast ?? 100)}%)`}
              min="0"
              max="200"
              step="1"
              value={selectedClip.filters?.contrast ?? 100}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    contrast: Number(e.target.value),
                  },
                })
              }
            />
            <Slider
              label={`Saturation (${(selectedClip.filters?.saturation ?? 100)}%)`}
              min="0"
              max="200"
              step="1"
              value={selectedClip.filters?.saturation ?? 100}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    saturation: Number(e.target.value),
                  },
                })
              }
            />
            <Slider
              label={`Blur (${(selectedClip.filters?.blur ?? 0)}px)`}
              min="0"
              max="20"
              step="0.5"
              value={selectedClip.filters?.blur ?? 0}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    blur: Number(e.target.value),
                  },
                })
              }
            />
            <Slider
              label={`Sepia (${(selectedClip.filters?.sepia ?? 0)}%)`}
              min="0"
              max="100"
              step="1"
              value={selectedClip.filters?.sepia ?? 0}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    sepia: Number(e.target.value),
                  },
                })
              }
            />
            <Slider
              label={`Hue Rotate (${(selectedClip.filters?.hueRotate ?? 0)}°)`}
              min="0"
              max="360"
              step="1"
              value={selectedClip.filters?.hueRotate ?? 0}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    hueRotate: Number(e.target.value),
                  },
                })
              }
            />
            <Slider
              label={`Invert (${(selectedClip.filters?.invert ?? 0)}%)`}
              min="0"
              max="100"
              step="1"
              value={selectedClip.filters?.invert ?? 0}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    invert: Number(e.target.value),
                  },
                })
              }
            />
            <Slider
              label={`Grayscale (${(selectedClip.filters?.grayscale ?? 0)}%)`}
              min="0"
              max="100"
              step="1"
              value={selectedClip.filters?.grayscale ?? 0}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: {
                    ...(selectedClip.filters || DEFAULT_FILTERS),
                    grayscale: Number(e.target.value),
                  },
                })
              }
            />
            <Button
              style={{ width: "100%", marginTop: "6px" }}
              onClick={() =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  filters: { ...DEFAULT_FILTERS },
                })
              }
            >
              <Icon name="palette" size={12} style={{ marginRight: 4 }} /> Reset Filters
            </Button>
          </div>
        )}

        {/* Keyframe Motion Automation (Video, Image & Text Clips) */}
        {selectedClip.mediaType !== "audio" && (
          <div className="prop-section">
            <div className="section-title">Keyframe Motion Animation</div>
            <Button
              style={{ width: "100%", marginBottom: "10px" }}
              onClick={() => {
                const relTime = Math.max(0, currentTime - selectedClip.timelineStart);
                addKeyframe(selectedTrack.id, selectedClip.id, {
                  time: Number(relTime.toFixed(2)),
                  x: t.x,
                  y: t.y,
                  scaleX: t.scaleX,
                  scaleY: t.scaleY,
                  rotation: t.rotation,
                  opacity,
                });
              }}
            >
              <Icon name="plus" size={12} style={{ marginRight: 4 }} /> Add Keyframe at Playhead
            </Button>

            {(!selectedClip.keyframes || selectedClip.keyframes.length === 0) ? (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                No keyframes added yet. Move playhead and click above to animate properties.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedClip.keyframes.map((kf, i) => (
                  <div
                    key={kf.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(255, 255, 255, 0.04)",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "var(--accent-color)", fontWeight: 600 }}>KF {i + 1}</span>
                      <span style={{ color: "#aaa" }}>@{kf.time.toFixed(2)}s</span>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Button
                        style={{ padding: "2px 6px", fontSize: "10px" }}
                        title="Seek playhead to keyframe"
                        onClick={() => {
                          playbackController.seek(selectedClip.timelineStart + kf.time);
                          setCurrentTime(selectedClip.timelineStart + kf.time);
                        }}
                      >
                        Seek
                      </Button>
                      <Button
                        variant="danger"
                        style={{ padding: "2px 6px", fontSize: "10px" }}
                        title="Delete keyframe"
                        onClick={() => removeKeyframe(selectedTrack.id, selectedClip.id, kf.id)}
                      >
                        <Icon name="trash" size={10} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clip Fades & Cross-Dissolve */}
        <div className="prop-section">
          <div className="section-title">Transitions & Fades</div>
          <Slider
            label={`Fade In (${(selectedClip.fadeIn || 0).toFixed(1)}s)`}
            min="0"
            max="5"
            step="0.1"
            value={selectedClip.fadeIn || 0}
            onChange={(e) =>
              updateClip(selectedTrack.id, selectedClip.id, {
                fadeIn: Number(e.target.value),
              })
            }
          />
          <Slider
            label={`Fade Out (${(selectedClip.fadeOut || 0).toFixed(1)}s)`}
            min="0"
            max="5"
            step="0.1"
            value={selectedClip.fadeOut || 0}
            onChange={(e) =>
              updateClip(selectedTrack.id, selectedClip.id, {
                fadeOut: Number(e.target.value),
              })
            }
          />
          {selectedClip.mediaType !== "audio" && (
            <Slider
              label={`Cross-Dissolve Blend (${(selectedClip.crossDissolve || 0).toFixed(1)}s)`}
              min="0"
              max="5"
              step="0.1"
              value={selectedClip.crossDissolve || 0}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  crossDissolve: Number(e.target.value),
                })
              }
            />
          )}
        </div>

        {/* Speed Control (Video & Audio Clips) */}
        {selectedClip.mediaType !== "text" && selectedClip.mediaType !== "image" && (
          <div className="prop-section">
            <div className="section-title">Playback Speed & Ramping</div>
            <Select
              label="Speed Multiplier"
              value={selectedClip.speed || 1}
              onChange={(e) => {
                const speed = Number(e.target.value);
                updateClip(selectedTrack.id, selectedClip.id, { speed });
              }}
              options={[
                { label: "0.25x (Super Slow)", value: 0.25 },
                { label: "0.5x (Slow Motion)", value: 0.5 },
                { label: "1.0x (Normal)", value: 1 },
                { label: "1.5x (Fast)", value: 1.5 },
                { label: "2.0x (Double Speed)", value: 2 },
                { label: "4.0x (Hyperlapse)", value: 4 },
              ]}
            />
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
          {selectedClip.mediaType === "video" && (
            <Button
              style={{ width: "100%", marginBottom: "8px" }}
              onClick={() => separateAudioFromVideo(selectedTrack.id, selectedClip.id)}
            >
              <Icon name="audio" size={12} style={{ marginRight: 4 }} /> Separate / Extract Audio
            </Button>
          )}
          <Button
            style={{ width: "100%", marginBottom: "8px" }}
            onClick={splitClipAtCurrentTime}
          >
            <Icon name="scissors" size={12} style={{ marginRight: 4 }} /> Split Clip at Playhead (S)
          </Button>
        </div>
      </div>
    </div>
  );
}
