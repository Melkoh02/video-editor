import { useRef } from "react";
import { useAppStore } from "../state/store";
import { sourceRegistry } from "../engine/sourceRegistry";
import { nanoid } from "../utils/nanoid";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

export function MediaBin() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaBin = useAppStore((s) => s.mediaBin);
  const addToBin = useAppStore((s) => s.addToBin);
  const removeFromBin = useAppStore((s) => s.removeFromBin);
  const addClip = useAppStore((s) => s.addClip);
  const currentTime = useAppStore((s) => s.currentTime);
  const project = useAppStore((s) => s.project);
  const addTrack = useAppStore((s) => s.addTrack);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sourceId = nanoid();

      try {
        const entry = await sourceRegistry.register(sourceId, file);
        addToBin({
          name: entry.name,
          type: entry.type,
          duration: entry.duration,
          sourceId: entry.sourceId,
          format: file.name.split(".").pop()?.toUpperCase() || "MEDIA",
          width: entry.width,
          height: entry.height,
          thumbnailUrl: entry.thumbnailUrl,
        });
      } catch (err) {
        console.error("Failed to load file:", file.name, err);
      }
    }
  };

  const handleRemoveMedia = (itemId: string, sourceId: string) => {
    sourceRegistry.remove(sourceId);
    removeFromBin(itemId);
  };

  const handleAddClipToTimeline = (item: (typeof mediaBin)[0]) => {
    const targetType: "video" | "audio" = item.type === "audio" ? "audio" : "video";
    const matchingTracks = project.tracks.filter((t) => t.type === targetType);

    let trackId: string;
    if (matchingTracks.length > 0) {
      trackId = matchingTracks[0].id;
    } else {
      trackId = addTrack(targetType);
    }

    addClip(trackId, {
      sourceId: item.sourceId,
      name: item.name,
      mediaType: item.type,
      inPoint: 0,
      outPoint: item.duration,
      timelineStart: currentTime,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      opacity: 1,
      volume: 1,
    });
  };

  return (
    <div className="media-bin-panel">
      <div className="panel-header">
        <span className="panel-title">Media Library</span>
        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
          <Icon name="plus" size={12} style={{ marginRight: 4 }} /> Import Media
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFileUpload(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="media-bin-grid">
        {mediaBin.length === 0 && (
          <div
            className="media-bin-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-icon">
              <Icon name="folder" size={32} />
            </div>
            <div className="dropzone-text">Click to import Videos, Images or Audio</div>
            <div className="dropzone-sub">MP4, WebM, PNG, JPG, MP3, WAV</div>
          </div>
        )}

        {mediaBin.map((item) => (
          <div
            key={item.id}
            className="media-bin-card"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                "application/json",
                JSON.stringify({
                  sourceId: item.sourceId,
                  name: item.name,
                  type: item.type,
                  duration: item.duration,
                  format: item.format,
                })
              );
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            <div className="media-card-preview" style={{ position: "relative", overflow: "hidden" }}>
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                />
              ) : (
                <>
                  {item.type === "video" && <Icon name="video" size={20} />}
                  {item.type === "image" && <Icon name="image" size={20} />}
                  {item.type === "audio" && <Icon name="audio" size={20} />}
                  {item.type === "text" && <Icon name="text" size={20} />}
                </>
              )}
              <span className="media-type-badge" style={{ zIndex: 2 }}>{item.format}</span>
            </div>
            <div className="media-card-info">
              <div className="media-card-title" title={item.name}>
                {item.name}
              </div>
              <div className="media-card-sub">
                {item.duration.toFixed(1)}s {item.width ? `• ${item.width}x${item.height}` : ""}
              </div>
            </div>
            <div className="media-card-actions">
              <button
                className="card-btn"
                title="Add to timeline at playhead"
                onClick={() => handleAddClipToTimeline(item)}
              >
                + Timeline
              </button>
              <button
                className="card-btn card-btn-danger"
                title="Remove from media bin and revoke Object URL"
                onClick={() => handleRemoveMedia(item.id, item.sourceId)}
              >
                <Icon name="close" size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
