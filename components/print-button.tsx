"use client";

export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return <button className="button secondary no-print" onClick={() => window.print()}>{label}</button>;
}
