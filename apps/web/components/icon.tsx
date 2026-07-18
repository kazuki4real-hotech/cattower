import type { MaterialSymbolRoundedName } from "@/components/material-symbols";

type IconProps = {
  name: MaterialSymbolRoundedName;
  filled?: boolean;
  className?: string;
  variant?: "rounded" | "outlined";
};

export function Icon({
  name,
  filled = false,
  className = "",
  variant = "rounded",
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-${variant}${filled ? " filled" : ""}${className ? ` ${className}` : ""}`}
    >
      {name}
    </span>
  );
}
