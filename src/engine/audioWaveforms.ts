/**
 * Audio Waveform Peak Extractor & Cache.
 * Decodes audio/video source files via Web Audio API AudioContext
 * and extracts peak amplitude arrays for timeline waveform rendering.
 */

const waveformCache = new Map<string, number[]>();
const pendingDecodes = new Map<string, Promise<number[] | null>>();

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

/**
 * Extract normalized waveform peaks (default 150 points) from a Blob or URL source
 */
export async function generateWaveformPeaks(
  sourceId: string,
  mediaUrl: string,
  samples: number = 150
): Promise<number[] | null> {
  if (waveformCache.has(sourceId)) {
    return waveformCache.get(sourceId)!;
  }

  if (pendingDecodes.has(sourceId)) {
    return pendingDecodes.get(sourceId)!;
  }

  const decodePromise = (async () => {
    try {
      const response = await fetch(mediaUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = getAudioContext();
      
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0); // Left channel
      const step = Math.floor(channelData.length / samples);
      const peaks: number[] = new Array(samples);

      for (let i = 0; i < samples; i++) {
        const start = i * step;
        let max = 0;
        for (let j = 0; j < step; j += 10) {
          const val = Math.abs(channelData[start + j] || 0);
          if (val > max) max = val;
        }
        peaks[i] = max;
      }

      // Normalize peaks 0 to 1
      const maxPeak = Math.max(...peaks, 0.001);
      const normalized = peaks.map((p) => Math.min(1, p / maxPeak));

      waveformCache.set(sourceId, normalized);
      return normalized;
    } catch (err) {
      console.warn(`[AudioWaveforms] Failed to decode audio for ${sourceId}:`, err);
      return null;
    } finally {
      pendingDecodes.delete(sourceId);
    }
  })();

  pendingDecodes.set(sourceId, decodePromise);
  return decodePromise;
}

/** Synchronously retrieve cached peaks if available */
export function getCachedWaveform(sourceId: string): number[] | undefined {
  return waveformCache.get(sourceId);
}
