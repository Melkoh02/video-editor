import { type InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="prop-group">
        {label && <label className="prop-label">{label}</label>}
        <input
          ref={ref}
          className={`prop-input ${className}`.trim()}
          {...props}
        />
        {error && <span className="prop-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
