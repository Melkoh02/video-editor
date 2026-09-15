/**
 * SourceRegistry maps sourceId → HTMLVideoElement.
 *
 * For preview/playback we use <video> elements — they handle decode
 * universally (including Safari) and are far simpler than a VideoDecoder
 * loop. WebCodecs will be used for the *export* pipeline, not preview.
 */

export type SourceEntry = {
  sourceId: string;
  videoEl: HTMLVideoElement;
  duration: number; // seconds
  width: number;
  height: number;
  file: File;
};

class SourceRegistry {
  private entries = new Map<string, SourceEntry>();

  async register(sourceId: string, file: File): Promise<SourceEntry> {
    if (this.entries.has(sourceId)) {
      return this.entries.get(sourceId)!;
    }

    const url = URL.createObjectURL(file);
    const videoEl = document.createElement("video");
    videoEl.src = url;
    videoEl.preload = "auto";
    videoEl.muted = true;
    videoEl.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      videoEl.onloadedmetadata = () => resolve();
      videoEl.onerror = () => reject(new Error(`Failed to load video: ${file.name}`));
    });

    const entry: SourceEntry = {
      sourceId,
      videoEl,
      duration: videoEl.duration,
      width: videoEl.videoWidth,
      height: videoEl.videoHeight,
      file,
    };

    this.entries.set(sourceId, entry);
    return entry;
  }

  get(sourceId: string): SourceEntry | undefined {
    return this.entries.get(sourceId);
  }

  remove(sourceId: string) {
    const entry = this.entries.get(sourceId);
    if (entry) {
      URL.revokeObjectURL(entry.videoEl.src);
      this.entries.delete(sourceId);
    }
  }
}

// Singleton
export const sourceRegistry = new SourceRegistry();
