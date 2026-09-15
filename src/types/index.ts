export type Transform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type MediaType = "video" | "audio" | "image" | "text";

export type TextProperties = {
  content: string;
  fontSize: number;       // e.g. 64
  fontFamily: string;     // e.g. "Inter", "Impact", "Arial"
  color: string;          // e.g. "#ffffff"
  backgroundColor?: string; // e.g. "rgba(0,0,0,0.5)"
  strokeColor?: string;   // e.g. "#000000"
  strokeWidth?: number;   // e.g. 4
};

/** Canvas filter parameters for color grading. All values default to their "neutral" state. */
export type Filters = {
  brightness: number;  // 0-200, default 100 (100 = normal)
  contrast: number;    // 0-200, default 100
  saturation: number;  // 0-200, default 100
  blur: number;        // 0-20, default 0 (px)
  sepia: number;       // 0-100, default 0 (%)
  hueRotate: number;   // 0-360, default 0 (deg)
  invert: number;      // 0-100, default 0 (%)
  grayscale: number;   // 0-100, default 0 (%)
  vignette: number;    // 0-100, default 0 (%)
};

export const DEFAULT_FILTERS: Filters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
  grayscale: 0,
  vignette: 0,
};

export type Keyframe = {
  id: string;
  time: number; // relative to clip start (0 to duration)
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
};

export type Clip = {
  id: string;
  sourceId: string;
  name?: string;
  mediaType: MediaType;
  inPoint: number;       // seconds into source
  outPoint: number;      // seconds into source
  timelineStart: number; // seconds on timeline
  transform?: Transform;
  opacity?: number;      // 0 to 1
  volume?: number;       // 0 to 2
  speed?: number;        // Playback speed multiplier (e.g. 0.5, 1, 2)
  text?: TextProperties; // Text overlay settings
  filters?: Filters;     // Canvas color grading filters
  fadeIn?: number;       // Fade-in duration in seconds (default 0)
  fadeOut?: number;      // Fade-out duration in seconds (default 0)
  keyframes?: Keyframe[]; // Keyframe automation tracks
  crossDissolve?: number; // Cross-dissolve blend transition duration (seconds)
};

export type Track = {
  id: string;
  type: "video" | "audio";
  name: string;       // e.g. "V1", "A1"
  muted: boolean;
  locked: boolean;
  clips: Clip[];
};

export type Marker = {
  id: string;
  time: number;
  label: string;
  color: string;
};

export type Project = {
  name: string;
  resolution: { width: number; height: number };
  fps: number;
  tracks: Track[];
  markers?: Marker[];
};

export type MediaBinItem = {
  id: string;
  name: string;
  type: MediaType;
  duration: number;
  sourceId: string;
  format: string; // e.g. "H.264", "PNG", "MP3", "TEXT"
  thumbnailUrl?: string;
  width?: number;
  height?: number;
};
