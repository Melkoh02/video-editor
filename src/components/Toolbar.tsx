import { useRef } from "react";
import { useAppStore } from "../state/store";
import { sourceRegistry } from "../engine/sourceRegistry";
import { playbackController } from "../engine/playback";
import { nanoid } from "../utils/nanoid";

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerState = useAppStore((s) => s.playerState);
  const addTrack = useAppStore((s) => s.addTrack);
  const addClip = useAppStore((s) => s.addClip);
  const project = useAppStore((s) => s.project);

  async function handleOpenVideo(file: File) {
    const sourceId = nanoid();
    const entry = await sourceRegistry.register(sourceId, file);

    // Find or create a video track
    let trackId: string;
    const existingVideoTrack = project.tracks.find((t) => t.type === "video");
    if (existingVideoTrack) {
      trackId = existingVideoTrack.id;
    } else {
      trackId = nanoid();
      addTrack("video");
      // Track is added synchronously; fetch from store
      const tracks = useAppStore.getState().project.tracks;
      const newTrack = tracks[tracks.length - 1];
      trackId = newTrack.id;
    }

    // Place clip at timeline position 0 (or after last clip on track)
    const tracks = useAppStore.getState().project.tracks;
    const track = tracks.find((t) => t.id === trackId);
    let timelineStart = 0;
    if (track && track.clips.length > 0) {
      const last = track.clips[track.clips.length - 1];
      timelineStart = last.timelineStart + (last.outPoint - last.inPoint);
    }

    addClip(trackId, {
      sourceId,
      inPoint: 0,
      outPoint: entry.duration,
      timelineStart,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      volume: 1,
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleOpenVideo(file);
    // Reset input so same file can be re-opened
    e.target.value = "";
  }

  return (
    <div className="toolbar">
      <button
        className="tb-btn"
        onClick={() => fileInputRef.current?.click()}
        title="Open video file"
      >
        + Video
      </button>

      <div className="tb-separator" />

      <button
        className="tb-btn"
        disabled={playerState === "playing"}
        onClick={() => playbackController.play()}
        title="Play"
      >
        ▶
      </button>
      <button
        className="tb-btn"
        disabled={playerState !== "playing"}
        onClick={() => playbackController.pause()}
        title="Pause"
      >
        ⏸
      </button>
      <button
        className="tb-btn"
        onClick={() => playbackController.stop()}
        title="Stop"
      >
        ⏹
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={onFileChange}
      />
    </div>
  );
}
