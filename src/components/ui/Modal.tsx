import { type HTMLAttributes, useEffect } from "react";
import { Button } from "./Button";

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  onClose: () => void;
}

export function Modal({ title, onClose, children, className = "", ...props }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <Button size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
