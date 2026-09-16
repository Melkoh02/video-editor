import { Modal } from "./ui/Modal";
import { Icon } from "./ui/Icon";

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "Space / K", desc: "Play / Pause playback" },
    { key: "J / L", desc: "J: Rewind 1s • L: Fast Forward 1s" },
    { key: "← / →", desc: "Step 1 frame backward / forward" },
    { key: "Shift + ← / →", desc: "Step 1 second backward / forward" },
    { key: "Home / End", desc: "Jump to sequence start / end" },
    { key: "I / O", desc: "Set Work Area In Point / Out Point at playhead" },
    { key: "B / N", desc: "Set Beginning / End of Work Area range" },
    { key: "Alt + X", desc: "Clear Work Area In/Out range" },
    { key: "S / Cmd + Shift + D", desc: "Split active clip at playhead (After Effects)" },
    { key: "P / R / T", desc: "Reveal Keyframes: P (Position), R (Rotation), T (Opacity)" },
    { key: "F9", desc: "Easy Ease keyframe interpolation" },
    { key: "[ / ]", desc: "Move selected clip Start / End to current playhead" },
    { key: "Alt + [ / Alt + ]", desc: "Trim selected clip In Point / Out Point to playhead" },
    { key: "M", desc: "Add Sequence Marker at playhead" },
    { key: "N", desc: "Toggle Magnet Timeline Snapping" },
    { key: "Cmd + Z / Cmd + Shift + Z", desc: "Undo / Redo action" },
    { key: "Cmd + D / Ctrl + D", desc: "Duplicate selected clip" },
    { key: "Cmd + + / Cmd + -", desc: "Zoom timeline scale in / out" },
    { key: "Alt + Wheel", desc: "Zoom timeline centered on cursor" },
    { key: "Delete / Shift + Delete", desc: "Delete clip / Ripple Delete (collapse gap)" },
    { key: "Escape", desc: "Deselect clip" },
    { key: "?", desc: "Toggle Keyboard Shortcuts guide" },
  ];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="keyboard" size={16} />
          <span>Keyboard Shortcuts Reference</span>
        </div>
      }
      onClose={onClose}
    >
      <table className="shortcuts-table">
        <tbody>
          {shortcuts.map((s, idx) => (
            <tr key={idx}>
              <td className="shortcut-key">
                <kbd>{s.key}</kbd>
              </td>
              <td className="shortcut-desc">{s.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
