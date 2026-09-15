/**
 * AudioEngine — manages audio levels and Web Audio API peak metering.
 */

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private peakLeft = 0;
  private peakRight = 0;

  init() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
    } catch (e) {
      console.warn("Web Audio API not supported in this browser environment", e);
    }
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  getPeaks(): { left: number; right: number } {
    return { left: this.peakLeft, right: this.peakRight };
  }

  setPeaks(left: number, right: number) {
    this.peakLeft = left;
    this.peakRight = right;
  }
}

export const audioEngine = new AudioEngine();
