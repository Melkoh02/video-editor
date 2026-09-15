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
  text?: TextProperties; // Text overlay settings
};

export type Track = {
  id: string;
  type: "video" | "audio";
  name: string;       // e.g. "V1", "A1"
  muted: boolean;
  locked: boolean;
  clips: Clip[];
};

export type Project = {
  name: string;
  resolution: { width: number; height: number };
  fps: number;
  tracks: Track[];
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
