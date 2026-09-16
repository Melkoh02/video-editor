import { useAppStore, findClipAndTrack } from "../state/store";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Slider } from "./ui/Slider";

type TransitionPreset = {
  id: string;
  name: string;
  description: string;
  apply: (trackId: string, clipId: string, updateClip: (trackId: string, clipId: string, patch: any) => void) => void;
};

export function TransitionsPanel() {
  const project = useAppStore((s) => s.project);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const updateClip = useAppStore((s) => s.updateClip);
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);

  let selectedClip = null;
  let selectedTrack = null;
  if (selectedClipId) {
    const res = findClipAndTrack(project.tracks, selectedClipId);
    if (res) {
      selectedTrack = res.track;
      selectedClip = res.clip;
    }
  }

  const fadeIn = selectedClip?.fadeIn || 0;
  const fadeOut = selectedClip?.fadeOut || 0;
  const crossDissolve = selectedClip?.crossDissolve || 0;

  const presets: TransitionPreset[] = [
    {
      id: "smooth-dissolve",
      name: "Cross-Dissolve (1.0s)",
      description: "Standard cinematic blend between neighboring clips or background",
      apply: (tId, cId, upd) => upd(tId, cId, { crossDissolve: 1.0 }),
    },
    {
      id: "quick-fade",
      name: "Quick Fade In/Out (0.5s)",
      description: "Snappy opacity entrance and exit curve",
      apply: (tId, cId, upd) => upd(tId, cId, { fadeIn: 0.5, fadeOut: 0.5 }),
    },
    {
      id: "slow-cinematic",
      name: "Cinematic Fade In (2.0s)",
      description: "Long dramatic fade-in from transparent/black",
      apply: (tId, cId, upd) => upd(tId, cId, { fadeIn: 2.0 }),
    },
    {
      id: "fade-to-black",
      name: "Dramatic Fade Out (1.5s)",
      description: "Soft exit fade at the end of the clip",
      apply: (tId, cId, upd) => upd(tId, cId, { fadeOut: 1.5 }),
    },
    {
      id: "full-dissolve",
      name: "Full Cross-Dissolve (2.5s)",
      description: "Extended ambient cross-dissolve blend",
      apply: (tId, cId, upd) => upd(tId, cId, { crossDissolve: 2.5 }),
    },
  ];

  const handleReset = () => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, {
      fadeIn: 0,
      fadeOut: 0,
      crossDissolve: 0,
    });
  };

  return (
    <div
      className={`transitions-panel ${activePanel === "leftDock" ? "panel--active" : ""}`}
      onMouseDown={() => setActivePanel("leftDock")}
    >
      <div className="panel-header">
        <span className="panel-title">Transitions & Fades</span>
        {selectedClip && (fadeIn > 0 || fadeOut > 0 || crossDissolve > 0) && (
          <Button variant="ghost" onClick={handleReset} title="Reset all transitions on selected clip">
            <Icon name="reset" size={12} style={{ marginRight: 4 }} /> Reset
          </Button>
        )}
      </div>

      {!selectedClip || !selectedTrack ? (
        <div className="empty-panel-notice">
          <Icon name="transition" size={32} style={{ color: "#4f46e5", marginBottom: 12 }} />
          <strong>No Clip Selected</strong>
          <p>Select any video, image, or text clip on the timeline to configure transitions and opacity dissolves.</p>
        </div>
      ) : (
        <div className="transitions-content">
          <div className="active-clip-badge">
            <span className="clip-type-pill">{selectedClip.mediaType.toUpperCase()}</span>
            <span className="clip-name-text">{selectedClip.name || "Untitled Clip"}</span>
          </div>

          {/* Quick Presets */}
          <div className="prop-section">
            <div className="section-title">Transition Presets</div>
            <div className="transitions-preset-grid">
              {presets.map((p) => (
                <button
                  key={p.id}
                  className="transition-card"
                  onClick={() => p.apply(selectedTrack.id, selectedClip.id, updateClip)}
                >
                  <div className="transition-card-icon">
                    <Icon name="transition" size={18} />
                  </div>
                  <div className="transition-card-details">
                    <div className="transition-card-name">{p.name}</div>
                    <div className="transition-card-desc">{p.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fine Tuning Sliders */}
          <div className="prop-section">
            <div className="section-title">Manual Duration Adjustments</div>
            <Slider
              label={`Fade In Duration (${fadeIn.toFixed(1)}s)`}
              min="0"
              max="5"
              step="0.1"
              value={fadeIn}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  fadeIn: Number(e.target.value),
                })
              }
            />

            <Slider
              label={`Fade Out Duration (${fadeOut.toFixed(1)}s)`}
              min="0"
              max="5"
              step="0.1"
              value={fadeOut}
              onChange={(e) =>
                updateClip(selectedTrack.id, selectedClip.id, {
                  fadeOut: Number(e.target.value),
                })
              }
            />

            {selectedClip.mediaType !== "audio" && (
              <Slider
                label={`Cross-Dissolve Blend (${crossDissolve.toFixed(1)}s)`}
                min="0"
                max="5"
                step="0.1"
                value={crossDissolve}
                onChange={(e) =>
                  updateClip(selectedTrack.id, selectedClip.id, {
                    crossDissolve: Number(e.target.value),
                  })
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
