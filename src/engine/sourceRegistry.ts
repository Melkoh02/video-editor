/**
 * SourceRegistry maps sourceId → SourceEntry.
 * Supports Video (<video>), Audio (<audio>), and Image (<img>) media elements.
 */

import type { MediaType } from "../types";

export type SourceEntry = {
  sourceId: string;
  type: MediaType;
  element: HTMLVideoElement | HTMLAudioElement | HTMLImageElement;
  duration: number; // seconds
  width: number;
  height: number;
  file: File;
  name: string;
  url: string;
  thumbnailUrl?: string;
};

function captureMediaThumbnail(element: HTMLVideoElement | HTMLImageElement): string {
  try {
    const canvas = document.createElement("canvas");
    const isVideo = element instanceof HTMLVideoElement;
    const w = isVideo ? element.videoWidth || 1920 : element.naturalWidth || 1920;
    const h = isVideo ? element.videoHeight || 1080 : element.naturalHeight || 1080;
    const aspect = w / (h || 1);

    canvas.width = 160;
    canvas.height = Math.round(160 / aspect);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.75);
    }
  } catch {
    // Canvas Security/CORS fallback
  }
  return "";
}

class SourceRegistry {
  private entries = new Map<string, SourceEntry>();

  async register(sourceId: string, file: File): Promise<SourceEntry> {
    if (this.entries.has(sourceId)) {
      return this.entries.get(sourceId)!;
    }

    const type = this.detectType(file);
    const url = URL.createObjectURL(file);

    let entry: SourceEntry;

    if (type === "video") {
      const videoEl = document.createElement("video");
      videoEl.src = url;
      videoEl.preload = "auto";
      videoEl.muted = true;
      videoEl.currentTime = 0.5; // Seek into 0.5s for video frame preview

      await new Promise<void>((resolve, reject) => {
        videoEl.onseeked = () => resolve();
        videoEl.onloadedmetadata = () => {
          if (videoEl.currentTime === 0.5) resolve();
        };
        videoEl.onerror = () => reject(new Error(`Failed to load video: ${file.name}`));
        // Fallback safety timeout
        setTimeout(() => resolve(), 800);
      });

      const thumb = captureMediaThumbnail(videoEl);

      entry = {
        sourceId,
        type: "video",
        element: videoEl,
        duration: videoEl.duration || 10,
        width: videoEl.videoWidth || 1920,
        height: videoEl.videoHeight || 1080,
        file,
        name: file.name,
        url,
        thumbnailUrl: thumb,
      };
    } else if (type === "audio") {
      const audioEl = document.createElement("audio");
      audioEl.src = url;
      audioEl.preload = "auto";

      await new Promise<void>((resolve, reject) => {
        audioEl.onloadedmetadata = () => resolve();
        audioEl.onerror = () => reject(new Error(`Failed to load audio: ${file.name}`));
      });

      entry = {
        sourceId,
        type: "audio",
        element: audioEl,
        duration: audioEl.duration || 10,
        width: 0,
        height: 0,
        file,
        name: file.name,
        url,
      };
    } else {
      // Image
      const img = new Image();
      img.src = url;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      });

      const thumb = captureMediaThumbnail(img);

      entry = {
        sourceId,
        type: "image",
        element: img,
        duration: 5, // default 5 seconds for static images
        width: img.naturalWidth || 1920,
        height: img.naturalHeight || 1080,
        file,
        name: file.name,
        url,
        thumbnailUrl: thumb,
      };
    }

    this.entries.set(sourceId, entry);
    return entry;
  }

  get(sourceId: string): SourceEntry | undefined {
    return this.entries.get(sourceId);
  }

  remove(sourceId: string) {
    const entry = this.entries.get(sourceId);
    if (entry) {
      URL.revokeObjectURL(entry.url);
      this.entries.delete(sourceId);
    }
  }

  private detectType(file: File): MediaType {
    const mime = file.type.toLowerCase();
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("image/")) return "image";

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["mp4", "webm", "mov", "m4v", "mkv", "avi"].includes(ext)) return "video";
    if (["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(ext)) return "audio";
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "image";

    return "video";
  }
}

// Singleton
export const sourceRegistry = new SourceRegistry();
