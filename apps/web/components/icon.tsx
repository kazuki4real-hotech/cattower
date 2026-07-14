type IconProps = {
  name: string;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, filled = false, className = "" }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-rounded${filled ? " filled" : ""}${className ? ` ${className}` : ""}`}
    >
      {name}
    </span>
  );
}
