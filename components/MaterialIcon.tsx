import type { CSSProperties } from "react";

type Props = {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
  label?: string;
};

export function MaterialIcon({ name, size = 20, filled = false, className = "", label }: Props) {
  const style: CSSProperties = {
    fontSize: `${size}px`,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 550, 'GRAD' 0, 'opsz' ${Math.max(20, Math.min(48, size))}`,
  };

  return (
    <span
      className={`material-symbols-rounded nivoxIcon ${className}`.trim()}
      style={style}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
