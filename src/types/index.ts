export type Transform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type Clip = {
  id: string;
  sourceId: string;
  inPoint: number;    // seconds into source
  outPoint: number;   // seconds into source
  timelineStart: number; // seconds on timeline
  transform?: Transform;
  volume?: number;
};

export type Track = {
  id: string;
  type: "video" | "audio";
  clips: Clip[];
};

export type Project = {
  resolution: { width: number; height: number };
  fps: number;
  tracks: Track[];
};
