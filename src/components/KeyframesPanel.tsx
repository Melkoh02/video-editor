import { useState } from "react";
import { useAppStore, findClipAndTrack } from "../state/store";
import { playbackController } from "../engine/playback";
import { Icon } from "./ui/Icon";
import { Slider } from "./ui/Slider";

export function KeyframesPanel() {
  const project = useAppStore((s) => s.project);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const currentTime = useAppStore((s) => s.currentTime);
  const addKeyframe = useAppStore((s) => s.addKeyframe);
  const removeKeyframe = useAppStore((s) => s.removeKeyframe);
  const updateClip = useAppStore((s) => s.updateClip);
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);

  const [activeProperty, setActiveProperty] = useState<"position" | "scale" | "rotation" | "opacity">("position");

  let selectedClip = null;
  let selectedTrack = null;
  if (selectedClipId) {
    const res = findClipAndTrack(project.tracks, selectedClipId);
    if (res) {
      selectedTrack = res.track;
      selectedClip = res.clip;
    }
  }

  const clipDuration = selectedClip ? selectedClip.outPoint - selectedClip.inPoint : 0;
  const relTime = selectedClip ? Math.max(0, Math.min(clipDuration, currentTime - selectedClip.timelineStart)) : 0;
  const keyframes = selectedClip?.keyframes || [];

  // Check if there is a keyframe at or very close to current relative time
  const currentKeyframe = keyframes.find((k) => Math.abs(k.time - relTime) < 0.05);

  const prevKeyframe = [...keyframes]
    .filter((k) => k.time < relTime - 0.05)
    .sort((a, b) => b.time - a.time)[0];

  const nextKeyframe = [...keyframes]
    .filter((k) => k.time > relTime + 0.05)
    .sort((a, b) => a.time - b.time)[0];

  const handleToggleKeyframe = () => {
    if (!selectedClip || !selectedTrack) return;
    if (currentKeyframe) {
      removeKeyframe(selectedTrack.id, selectedClip.id, currentKeyframe.id);
    } else {
      const t = selectedClip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
      const op = selectedClip.opacity !== undefined ? selectedClip.opacity : 1;
      addKeyframe(selectedTrack.id, selectedClip.id, {
        time: relTime,
        x: t.x,
        y: t.y,
        scaleX: t.scaleX,
        scaleY: t.scaleY,
        rotation: t.rotation,
        opacity: op,
      });
    }
  };

  const handleSeekTo = (timeSec: number) => {
    if (!selectedClip) return;
    playbackController.seek(selectedClip.timelineStart + timeSec);
  };

  const handleEasyEase = () => {
    // AE Easy Ease applies smooth sine curve interpolation
    // Currently compositor uses smooth ease interpolation between keyframes
  };

  return (
    <div
      className={`keyframes-panel ${activePanel === "leftDock" ? "panel--active" : ""}`}
      onMouseDown={() => setActivePanel("leftDock")}
    >
      <div className="panel-header">
        <span className="panel-title">Motion Keyframes</span>
        {selectedClip && keyframes.length > 0 && (
          <span className="badge" style={{ fontSize: "10px", padding: "2px 6px" }}>
            {keyframes.length} {keyframes.length === 1 ? "point" : "points"}
          </span>
        )}
      </div>

      {!selectedClip || !selectedTrack ? (
        <div className="empty-panel-notice">
          <Icon name="keyframe" size={32} style={{ color: "#f59e0b", marginBottom: 12 }} />
          <strong>No Clip Selected</strong>
          <p>Select any visual layer on the timeline to animate Position, Scale, Rotation, and Opacity with After Effects-style keyframes.</p>
        </div>
      ) : (
        <div className="keyframes-content">
          <div className="active-clip-badge">
            <span className="clip-type-pill">{selectedClip.mediaType.toUpperCase()}</span>
            <span className="clip-name-text">{selectedClip.name || "Untitled Clip"}</span>
          </div>

          {/* AE-style Stopwatch & Nav Bar */}
          <div className="ae-transport-card">
            <div className="ae-stopwatch-row">
              <button
                className={`ae-stopwatch-btn ${keyframes.length > 0 ? "ae-stopwatch--active" : ""}`}
                onClick={handleToggleKeyframe}
                title="Toggle Keyframe at current playhead time"
              >
                <Icon name="keyframe" size={16} />
              </button>
              <div className="ae-time-readout">
                <span className="ae-time-label">Clip Time</span>
                <span className="ae-time-val">{relTime.toFixed(2)}s / {clipDuration.toFixed(2)}s</span>
              </div>
            </div>

            {/* Previous / Add-Remove / Next Keyframe Jumpers */}
            <div className="ae-nav-controls">
              <button
                className="ae-nav-btn"
                disabled={!prevKeyframe}
                onClick={() => prevKeyframe && handleSeekTo(prevKeyframe.time)}
                title="Previous Keyframe (J)"
              >
                ◀ Prev
              </button>
              <button
                className={`ae-keyframe-toggle-btn ${currentKeyframe ? "ae-kf--on" : ""}`}
                onClick={handleToggleKeyframe}
                title={currentKeyframe ? "Remove Keyframe at Playhead" : "Add Keyframe at Playhead"}
              >
                <Icon name="keyframe" size={13} style={{ marginRight: 4 }} />
                {currentKeyframe ? "Delete Keyframe" : "Add Keyframe"}
              </button>
              <button
                className="ae-nav-btn"
                disabled={!nextKeyframe}
                onClick={() => nextKeyframe && handleSeekTo(nextKeyframe.time)}
                title="Next Keyframe (K)"
              >
                Next ▶
              </button>
              <button
                className="ae-nav-btn"
                onClick={handleEasyEase}
                title="Easy Ease Keyframes (F9)"
              >
                Easy Ease (F9)
              </button>
            </div>
          </div>

          {/* Property Selector Tabs */}
          <div className="prop-section">
            <div className="section-title">Animate Property</div>
            <div className="ae-property-tabs">
              {(["position", "scale", "rotation", "opacity"] as const).map((prop) => (
                <button
                  key={prop}
                  className={`ae-prop-tab ${activeProperty === prop ? "ae-prop-tab--active" : ""}`}
                  onClick={() => setActiveProperty(prop)}
                >
                  {prop === "position" && "Position (P)"}
                  {prop === "scale" && "Scale (S)"}
                  {prop === "rotation" && "Rotation (R)"}
                  {prop === "opacity" && "Opacity (T)"}
                </button>
              ))}
            </div>

            {/* Quick value controls for current relative time */}
            <div className="ae-current-val-box">
              {activeProperty === "position" && (
                <>
                  <Slider
                    label="Position X"
                    min="-1000"
                    max="1000"
                    step="5"
                    value={selectedClip.transform?.x || 0}
                    onChange={(e) => {
                      const x = Number(e.target.value);
                      const cur = selectedClip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                      updateClip(selectedTrack.id, selectedClip.id, { transform: { ...cur, x } });
                    }}
                  />
                  <Slider
                    label="Position Y"
                    min="-1000"
                    max="1000"
                    step="5"
                    value={selectedClip.transform?.y || 0}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      const cur = selectedClip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                      updateClip(selectedTrack.id, selectedClip.id, { transform: { ...cur, y } });
                    }}
                  />
                </>
              )}

              {activeProperty === "scale" && (
                <>
                  <Slider
                    label={`Scale (${Math.round((selectedClip.transform?.scaleX || 1) * 100)}%)`}
                    min="0.1"
                    max="5"
                    step="0.05"
                    value={selectedClip.transform?.scaleX || 1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const cur = selectedClip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                      updateClip(selectedTrack.id, selectedClip.id, { transform: { ...cur, scaleX: val, scaleY: val } });
                    }}
                  />
                </>
              )}

              {activeProperty === "rotation" && (
                <Slider
                  label={`Rotation (${Math.round(selectedClip.transform?.rotation || 0)}°)`}
                  min="-360"
                  max="360"
                  step="1"
                  value={selectedClip.transform?.rotation || 0}
                  onChange={(e) => {
                    const rot = Number(e.target.value);
                    const cur = selectedClip.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                    updateClip(selectedTrack.id, selectedClip.id, { transform: { ...cur, rotation: rot } });
                  }}
                />
              )}

              {activeProperty === "opacity" && (
                <Slider
                  label={`Opacity (${Math.round((selectedClip.opacity !== undefined ? selectedClip.opacity : 1) * 100)}%)`}
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedClip.opacity !== undefined ? selectedClip.opacity : 1}
                  onChange={(e) => {
                    const op = Number(e.target.value);
                    updateClip(selectedTrack.id, selectedClip.id, { opacity: op });
                  }}
                />
              )}
            </div>
          </div>

          {/* Keyframe Points List */}
          <div className="prop-section">
            <div className="section-title">Keyframe Points ({keyframes.length})</div>
            {keyframes.length === 0 ? (
              <div className="ae-no-keyframes">
                No keyframe points yet. Click <strong>"Add Keyframe"</strong> to set animation anchors over time.
              </div>
            ) : (
              <div className="ae-kf-list">
                {keyframes.map((kf, idx) => {
                  const isCurrent = Math.abs(kf.time - relTime) < 0.05;
                  return (
                    <div
                      key={kf.id}
                      className={`ae-kf-row ${isCurrent ? "ae-kf-row--active" : ""}`}
                      onClick={() => handleSeekTo(kf.time)}
                    >
                      <div className="ae-kf-icon-time">
                        <Icon name="keyframe" size={12} style={{ color: "#f59e0b", marginRight: 6 }} />
                        <span>Keyframe #{idx + 1} ({kf.time.toFixed(2)}s)</span>
                      </div>
                      <div className="ae-kf-actions">
                        <button
                          className="ae-kf-del-btn"
                          title="Delete this keyframe"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeKeyframe(selectedTrack.id, selectedClip.id, kf.id);
                          }}
                        >
                          <Icon name="close" size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
