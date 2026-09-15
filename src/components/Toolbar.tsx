import { useRef } from "react";
import { useAppStore } from "../state/store";
import { sourceRegistry } from "../engine/sourceRegistry";
import { playbackController } from "../engine/playback";
import { applySideBySideLayout, applyFullscreenLayout } from "../engine/layout";
import { nanoid } from "../utils/nanoid";
import { Button } from "./ui/Button";

export function Toolbar({ onToggleShortcuts }: { onToggleShortcuts: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackTargetRef = useRef<"existing" | "new">("existing");
  const playerState = useAppStore((s) => s.playerState);
  const addTrack = useAppStore((s) => s.addTrack);
  const addClip = useAppStore((s) => s.addClip);

  async function handleOpenVideo(file: File, forceNewTrack: boolean) {
    const sourceId = nanoid();
    const entry = await sourceRegistry.register(sourceId, file);

    const tracks = useAppStore.getState().project.tracks;
    const videoTracks = tracks.filter((t) => t.type === "video");

    let trackId: string;
    if (!forceNewTrack && videoTracks.length > 0) {
      trackId = videoTracks[0].id;
    } else {
      addTrack("video");
      const updated = useAppStore.getState().project.tracks;
      trackId = updated[updated.length - 1].id;
    }

    const freshTracks = useAppStore.getState().project.tracks;
    const track = freshTracks.find((t) => t.id === trackId);
    let timelineStart = 0;
    if (track && track.clips.length > 0) {
      const last = track.clips[track.clips.length - 1];
      timelineStart = last.timelineStart + (last.outPoint - last.inPoint);
    }

    addClip(trackId, {
      sourceId,
      name: entry.name || file.name,
      mediaType: entry.type || "video",
      inPoint: 0,
      outPoint: entry.duration,
      timelineStart,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      opacity: 1,
      volume: 1,
    });

    if (forceNewTrack) {
      setTimeout(() => applySideBySideLayout(), 0);
    }
  }

  function handleAddTextClip() {
    const store = useAppStore.getState();
    const videoTracks = store.project.tracks.filter((t) => t.type === "video");

    let trackId: string;
    if (videoTracks.length > 0) {
      trackId = videoTracks[0].id;
    } else {
      trackId = store.addTrack("video");
    }

    const sourceId = nanoid();
    store.addClip(trackId, {
      sourceId,
      name: "Text Overlay",
      mediaType: "text",
      inPoint: 0,
      outPoint: 5,
      timelineStart: store.currentTime,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      opacity: 1,
      text: {
        content: "Sample Title",
        fontSize: 64,
        fontFamily: "Inter",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 4,
      },
    });
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
      <Button onClick={() => openFile(false)} title="Add video to first track">
        + Video
      </Button>
      <Button onClick={() => openFile(true)} title="Add video on a new track (side-by-side)">
        + Track
      </Button>
      <Button variant="primary" onClick={handleAddTextClip} title="Add text overlay clip at playhead">
        + Text
      </Button>

      <div className="tb-separator" />

      <Button
        disabled={playerState === "playing"}
        onClick={() => playbackController.play()}
        title="Play (Space)"
      >
        ▶
      </Button>
      <Button
        disabled={playerState !== "playing"}
        onClick={() => playbackController.pause()}
        title="Pause (K / Space)"
      >
        ⏸
      </Button>
      <Button
        onClick={() => playbackController.stop()}
        title="Stop"
      >
        ⏹
      </Button>

      <div className="tb-separator" />

      <Button
        onClick={() => applySideBySideLayout()}
        title="Side-by-side layout"
      >
        ⬜⬜
      </Button>
      <Button
        onClick={() => applyFullscreenLayout()}
        title="Fullscreen layout"
      >
        ⬛
      </Button>

      <div className="tb-separator" />

      <Button
        onClick={onToggleShortcuts}
        title="Keyboard Shortcuts Reference (?)"
      >
        ⌨️ Shortcuts
      </Button>

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
