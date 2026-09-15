import { useEffect, useState } from "react";
import { audioEngine } from "../engine/audioEngine";

export function PeakMeter() {
  const [peaks, setPeaks] = useState({ left: 0, right: 0 });

  useEffect(() => {
    let active = true;
    const update = () => {
      if (active) {
        setPeaks(audioEngine.getPeaks());
        requestAnimationFrame(update);
      }
    };
    const rafId = requestAnimationFrame(update);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="audio-peak-meter" title="Master Audio Peak Meter">
      <div className="meter-label">dB</div>
      <div className="meter-channel">
        <div
          className="meter-bar"
          style={{
            height: `${Math.round(peaks.left * 100)}%`,
            background: peaks.left > 0.9 ? "#ef4444" : peaks.left > 0.7 ? "#f59e0b" : "#10b981",
          }}
        />
      </div>
      <div className="meter-channel">
        <div
          className="meter-bar"
          style={{
            height: `${Math.round(peaks.right * 100)}%`,
            background: peaks.right > 0.9 ? "#ef4444" : peaks.right > 0.7 ? "#f59e0b" : "#10b981",
          }}
        />
      </div>
    </div>
  );
}
