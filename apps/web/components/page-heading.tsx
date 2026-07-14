import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div>
      {actions ? <div className="button-row">{actions}</div> : null}
    </header>
  );
}
