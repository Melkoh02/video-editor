import { type InputHTMLAttributes, forwardRef } from "react";

export interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  valueDisplay?: string | number;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className = "", label, valueDisplay, ...props }, ref) => {
    return (
      <div className="prop-group">
        {label && <label className="prop-label">{label}</label>}
        <input
          ref={ref}
          type="range"
          className={`prop-slider ${className}`.trim()}
          {...props}
        />
        {valueDisplay !== undefined && (
          <div className="prop-slider-val">{valueDisplay}</div>
        )}
      </div>
    );
  }
);

Slider.displayName = "Slider";
