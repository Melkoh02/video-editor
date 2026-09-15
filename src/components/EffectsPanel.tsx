import { useAppStore, findClipAndTrack } from "../state/store";
import type { Filters } from "../types";
import { DEFAULT_FILTERS } from "../types";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

type FilterPreset = {
  id: string;
  name: string;
  category: string;
  filters: Filters;
};

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "teal-orange",
    name: "Cinematic Teal & Orange",
    category: "Color Grade",
    filters: {
      ...DEFAULT_FILTERS,
      brightness: 105,
      contrast: 120,
      saturation: 130,
      hueRotate: 15,
    },
  },
  {
    id: "vintage-8mm",
    name: "Vintage 8mm Film",
    category: "Retro",
    filters: {
      ...DEFAULT_FILTERS,
      brightness: 95,
      contrast: 90,
      saturation: 75,
      sepia: 40,
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    category: "Stylized",
    filters: {
      ...DEFAULT_FILTERS,
      brightness: 110,
      contrast: 135,
      saturation: 160,
      hueRotate: 260,
    },
  },
  {
    id: "high-bw",
    name: "High Contrast B&W",
    category: "Monochrome",
    filters: {
      ...DEFAULT_FILTERS,
      brightness: 100,
      contrast: 140,
      grayscale: 100,
    },
  },
  {
    id: "warm-portrait",
    name: "Warm Soft Portrait",
    category: "Color Grade",
    filters: {
      ...DEFAULT_FILTERS,
      brightness: 105,
      contrast: 95,
      saturation: 110,
      sepia: 20,
    },
  },
  {
    id: "dramatic-noir",
    name: "Dramatic Noir",
    category: "Monochrome",
    filters: {
      ...DEFAULT_FILTERS,
      brightness: 85,
      contrast: 150,
      grayscale: 100,
    },
  },
];

export function EffectsPanel() {
  const project = useAppStore((s) => s.project);
  const selectedClipId = useAppStore((s) => s.selectedClipId);
  const updateClip = useAppStore((s) => s.updateClip);

  let selectedClip = null;
  let selectedTrack = null;

  if (selectedClipId) {
    const res = findClipAndTrack(project.tracks, selectedClipId);
    if (res) {
      selectedTrack = res.track;
      selectedClip = res.clip;
    }
  }

  const handleApplyFilter = (presetFilters: Filters) => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, {
      filters: { ...presetFilters },
    });
  };

  const handleResetFilters = () => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, {
      filters: { ...DEFAULT_FILTERS },
    });
  };

  return (
    <div className="media-bin-panel">
      <div className="panel-header">
        <span className="panel-title">Effects & Filters</span>
        {selectedClip && (
          <Button variant="ghost" onClick={handleResetFilters} title="Reset filters for selected clip">
            <Icon name="palette" size={12} style={{ marginRight: 4 }} /> Reset
          </Button>
        )}
      </div>

      {!selectedClip ? (
        <div className="inspector-tip" style={{ margin: "16px" }}>
          <Icon name="info" size={14} style={{ marginRight: 6 }} /> Select a clip on the timeline or canvas to apply color grading presets.
        </div>
      ) : (
        <div className="inspector-tip" style={{ margin: "8px 16px", background: "rgba(59, 130, 246, 0.15)", color: "#93c5fd" }}>
          Target clip: <strong>{selectedClip.name || selectedClip.id.slice(0, 8)}</strong>
        </div>
      )}

      <div className="media-bin-grid">
        {FILTER_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className="media-bin-card"
            style={{ cursor: selectedClip ? "pointer" : "default", opacity: selectedClip ? 1 : 0.6 }}
            onClick={() => handleApplyFilter(preset.filters)}
          >
            <div
              className="media-card-preview"
              style={{
                background: "#0f172a",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px",
              }}
            >
              <Icon name="palette" size={24} />
              <span className="media-type-badge" style={{ marginTop: 4 }}>{preset.category}</span>
            </div>
            <div className="media-card-info">
              <div className="media-card-title">{preset.name}</div>
            </div>
            <div className="media-card-actions">
              <button
                className="card-btn"
                disabled={!selectedClip}
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyFilter(preset.filters);
                }}
              >
                Apply Preset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
