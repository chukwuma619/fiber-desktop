import type { ReactNode } from "react";

export function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="hiw-step">
      <span className="hiw-step-num">{n}</span>
      <p className="hiw-step-text">{text}</p>
    </div>
  );
}

export function Callout({
  kind = "info",
  children,
}: {
  kind?: "info" | "warn" | "tip";
  children: ReactNode;
}) {
  return <div className={`hiw-callout hiw-callout-${kind}`}>{children}</div>;
}

export function Code({ children }: { children: string }) {
  return <code className="hiw-code">{children}</code>;
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="hiw-pill">{children}</span>;
}
