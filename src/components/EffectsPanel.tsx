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
    filters: { ...DEFAULT_FILTERS, brightness: 105, contrast: 120, saturation: 130, hueRotate: 15 },
  },
  {
    id: "vintage-8mm",
    name: "Vintage 8mm Film",
    category: "Retro",
    filters: { ...DEFAULT_FILTERS, brightness: 95, contrast: 90, saturation: 75, sepia: 40 },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    category: "Stylized",
    filters: { ...DEFAULT_FILTERS, brightness: 110, contrast: 135, saturation: 160, hueRotate: 260 },
  },
  {
    id: "high-bw",
    name: "High Contrast B&W",
    category: "Monochrome",
    filters: { ...DEFAULT_FILTERS, contrast: 140, grayscale: 100 },
  },
  {
    id: "warm-portrait",
    name: "Warm Soft Portrait",
    category: "Color Grade",
    filters: { ...DEFAULT_FILTERS, brightness: 105, contrast: 95, saturation: 110, sepia: 20 },
  },
  {
    id: "dramatic-noir",
    name: "Dramatic Noir",
    category: "Monochrome",
    filters: { ...DEFAULT_FILTERS, brightness: 85, contrast: 150, grayscale: 100 },
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    category: "Color Grade",
    filters: { ...DEFAULT_FILTERS, brightness: 108, contrast: 105, saturation: 120, sepia: 15, hueRotate: -10 },
  },
  {
    id: "cold-blue",
    name: "Cold Blue Steel",
    category: "Color Grade",
    filters: { ...DEFAULT_FILTERS, brightness: 95, contrast: 110, saturation: 85, hueRotate: 200 },
  },
];

type SliderDef = {
  key: keyof Filters;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  default: number;
};

const SLIDERS: SliderDef[] = [
  { key: "brightness",  label: "Brightness",  min: 0,   max: 200, step: 1,   unit: "%",  default: 100 },
  { key: "contrast",    label: "Contrast",    min: 0,   max: 200, step: 1,   unit: "%",  default: 100 },
  { key: "saturation",  label: "Saturation",  min: 0,   max: 200, step: 1,   unit: "%",  default: 100 },
  { key: "hueRotate",   label: "Hue Rotate",  min: -180,max: 180, step: 1,   unit: "°",  default: 0   },
  { key: "sepia",       label: "Sepia",       min: 0,   max: 100, step: 1,   unit: "%",  default: 0   },
  { key: "grayscale",   label: "Desaturate",  min: 0,   max: 100, step: 1,   unit: "%",  default: 0   },
  { key: "vignette",    label: "Vignette",    min: 0,   max: 100, step: 1,   unit: "%",  default: 0   },
  { key: "blur",        label: "Blur",        min: 0,   max: 20,  step: 0.5, unit: "px", default: 0   },
  { key: "invert",      label: "Invert",      min: 0,   max: 100, step: 1,   unit: "%",  default: 0   },
];

export function EffectsPanel() {
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

  const currentFilters: Filters = selectedClip?.filters ?? { ...DEFAULT_FILTERS };

  const handleSlider = (key: keyof Filters, value: number) => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, {
      filters: { ...currentFilters, [key]: value },
    });
  };

  const handleApplyPreset = (presetFilters: Filters) => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, { filters: { ...presetFilters } });
  };

  const handleReset = () => {
    if (!selectedClip || !selectedTrack) return;
    updateClip(selectedTrack.id, selectedClip.id, { filters: { ...DEFAULT_FILTERS } });
  };

  const isModified = selectedClip?.filters &&
    Object.keys(DEFAULT_FILTERS).some(
      (k) => (currentFilters[k as keyof Filters] ?? DEFAULT_FILTERS[k as keyof Filters]) !== DEFAULT_FILTERS[k as keyof Filters]
    );

  return (
    <div
      className={`media-bin-panel ${activePanel === "leftDock" ? "panel--active" : ""}`}
      onMouseDown={() => setActivePanel("leftDock")}
    >
      <div className="panel-header">
        <span className="panel-title">Color Grading</span>
        {isModified && (
          <Button variant="ghost" onClick={handleReset} title="Reset all filters">
            <Icon name="reset" size={12} style={{ marginRight: 4 }} /> Reset
          </Button>
        )}
      </div>

      {!selectedClip ? (
        <div className="inspector-tip" style={{ margin: "12px" }}>
          <Icon name="info" size={14} style={{ marginRight: 6 }} />
          Select a clip on the timeline to start color grading.
        </div>
      ) : (
        <>
          {/* Target chip */}
          <div className="cg-target-chip">
            <Icon name="video" size={12} />
            <span>{selectedClip.name || selectedClip.id.slice(0, 10)}</span>
          </div>

          {/* ── Manual sliders ─────────────────────────── */}
          <div className="cg-sliders">
            {SLIDERS.map((s) => {
              const val = currentFilters[s.key] ?? s.default;
              const pct = ((val - s.min) / (s.max - s.min)) * 100;
              const modified = val !== s.default;
              return (
                <div key={s.key} className="cg-row">
                  <div className="cg-row-header">
                    <span className={`cg-label ${modified ? "cg-label--modified" : ""}`}>{s.label}</span>
                    <span className={`cg-value ${modified ? "cg-value--modified" : ""}`}>
                      {typeof val === "number" ? (Number.isInteger(val) ? val : val.toFixed(1)) : val}{s.unit}
                    </span>
                    {modified && (
                      <button
                        className="cg-reset-dot"
                        title={`Reset ${s.label} to default`}
                        onClick={() => handleSlider(s.key, s.default)}
                      />
                    )}
                  </div>
                  <input
                    type="range"
                    className="cg-slider"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={val}
                    style={{ "--cg-pct": `${pct}%` } as React.CSSProperties}
                    onChange={(e) => handleSlider(s.key, Number(e.target.value))}
                  />
                </div>
              );
            })}
          </div>

          {/* ── Presets ────────────────────────────────── */}
          <div className="cg-presets-header">
            <span>PRESETS</span>
          </div>
          <div className="cg-presets-grid">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className="cg-preset-btn"
                title={preset.name}
                onClick={() => handleApplyPreset(preset.filters)}
              >
                <span className="cg-preset-swatch">
                  <Icon name="palette" size={14} />
                </span>
                <span className="cg-preset-name">{preset.name}</span>
                <span className="cg-preset-cat">{preset.category}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
