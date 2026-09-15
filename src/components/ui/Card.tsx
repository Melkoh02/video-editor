import { type HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", header, children, ...props }, ref) => {
    return (
      <div ref={ref} className={`inspector-card ${className}`.trim()} {...props}>
        {header && <div className="card-header-badge">{header}</div>}
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
