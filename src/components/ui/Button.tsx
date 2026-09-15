import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", children, ...props }, ref) => {
    let variantClass = "tb-btn";
    if (variant === "primary") variantClass += " tb-btn-primary";
    if (variant === "danger") variantClass += " tb-btn-danger";
    if (variant === "ghost") variantClass += " tb-btn-ghost";

    let sizeClass = "";
    if (size === "sm") sizeClass = " btn-sm";
    if (size === "lg") sizeClass = " btn-lg";

    return (
      <button
        ref={ref}
        className={`${variantClass}${sizeClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
