import { Modal } from "./ui/Modal";

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "Space", desc: "Play / Pause playback" },
    { key: "J / K / L", desc: "J: Rewind 1s • K: Pause • L: Fast Forward 1s" },
    { key: "← / →", desc: "Step 1 frame backward / forward" },
    { key: "Shift + ← / →", desc: "Step 1 second backward / forward" },
    { key: "Home / End", desc: "Jump to sequence start / end" },
    { key: "S", desc: "Split active clip at playhead" },
    { key: "Cmd + D / Ctrl + D", desc: "Duplicate selected clip" },
    { key: "Cmd + + / Cmd + -", desc: "Zoom timeline scale in / out" },
    { key: "Alt + Wheel", desc: "Zoom timeline centered on cursor" },
    { key: "Delete / Backspace", desc: "Delete selected clip" },
    { key: "Escape", desc: "Deselect clip" },
    { key: "?", desc: "Toggle this Keyboard Shortcuts guide" },
  ];

  return (
    <Modal title="⌨️ Keyboard Shortcuts Reference" onClose={onClose}>
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
