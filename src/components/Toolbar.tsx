import { useRef } from "react";
import { useAppStore } from "../state/store";
import { sourceRegistry } from "../engine/sourceRegistry";
import { playbackController } from "../engine/playback";
import { applySideBySideLayout, applyFullscreenLayout } from "../engine/layout";
import { nanoid } from "../utils/nanoid";

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackTargetRef = useRef<"existing" | "new">("existing");
  const playerState = useAppStore((s) => s.playerState);
  const addTrack = useAppStore((s) => s.addTrack);
  const addClip = useAppStore((s) => s.addClip);

  async function handleOpenVideo(file: File, forceNewTrack: boolean) {
    const sourceId = nanoid();
    const entry = await sourceRegistry.register(sourceId, file);

    // Determine target track
    const tracks = useAppStore.getState().project.tracks;
    const videoTracks = tracks.filter((t) => t.type === "video");

    let trackId: string;
    if (!forceNewTrack && videoTracks.length > 0) {
      // Append to first video track
      trackId = videoTracks[0].id;
    } else {
      // Create a new video track
      addTrack("video");
      const updated = useAppStore.getState().project.tracks;
      trackId = updated[updated.length - 1].id;
    }

    // Place clip after last clip on the target track
    const freshTracks = useAppStore.getState().project.tracks;
    const track = freshTracks.find((t) => t.id === trackId);
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

    // After adding to a new track, redistribute layout
    if (forceNewTrack) {
      // Wait a tick for store to settle
      setTimeout(() => applySideBySideLayout(), 0);
    }
  }

  function openFile(forceNewTrack: boolean) {
    trackTargetRef.current = forceNewTrack ? "new" : "existing";
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleOpenVideo(file, trackTargetRef.current === "new");
    e.target.value = "";
  }

  return (
    <div className="toolbar">
      <button className="tb-btn" onClick={() => openFile(false)} title="Add video to first track">
        + Video
      </button>
      <button className="tb-btn" onClick={() => openFile(true)} title="Add video on a new track (side-by-side)">
        + Track
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

      <div className="tb-separator" />

      <button
        className="tb-btn"
        onClick={() => applySideBySideLayout()}
        title="Side-by-side layout"
      >
        ⬜⬜
      </button>
      <button
        className="tb-btn"
        onClick={() => applyFullscreenLayout()}
        title="Fullscreen layout"
      >
        ⬛
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
