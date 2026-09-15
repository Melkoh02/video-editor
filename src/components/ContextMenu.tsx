import { useEffect, useRef } from "react";
import { Icon } from "./ui/Icon";

export type ContextMenuItem = {
  label: string;
  icon?: Parameters<typeof Icon>[0]["name"];
  shortcut?: string;
  danger?: boolean;
  action: () => void;
};

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu-floating animate-in"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          className={`context-menu-btn ${item.danger ? "danger" : ""}`}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.icon && <Icon name={item.icon} size={14} />}
          <span>{item.label}</span>
          {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
