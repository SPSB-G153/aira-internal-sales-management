"use client";

import { useRef, useState } from "react";

export type PopAdminFields = Record<string, string>;
type Extraction = { fields: PopAdminFields; warnings: string[]; saved_path?: string };

const labels: Record<string, string> = {
  sale_reference: "POP / booking reference",
  salesperson_name: "Sales personnel name",
  salesperson_designation: "Sales personnel designation",
  salesperson_mobile: "Sales personnel mobile no.",
  salesperson_email: "Sales personnel email",
  agent_company: "Sales agency / company",
};

export function PopAdminUpload({ unitNumber, onUseFields }: {
  unitNumber?: string;
  onUseFields: (fields: PopAdminFields) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extraction | null>(null);
  const [message, setMessage] = useState("");

  function updateField(key: string, value: string) {
    setResult((current) => current ? { ...current, fields: { ...current.fields, [key]: value } } : current);
  }

  async function extract(file: File) {
    setBusy(true);
    setResult(null);
    setMessage("Reading the POP Form privately on this computer…");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("unit_number", unitNumber || "");
      const localUrl = process.env.NEXT_PUBLIC_BOOKING_OCR_URL || "http://127.0.0.1:8765";
      const response = await fetch(`${localUrl}/extract-pop-admin`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || "The POP Form could not be read.");
      setResult(data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The POP Form could not be read.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function apply() {
    if (!result) return;
    onUseFields(result.fields);
    setResult(null);
    setMessage("POP administration details added. Review them below before saving.");
  }

  return <div className="booking-upload">
    <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void extract(file);
    }} />
    <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>
      {busy ? "Reading POP Form…" : "Upload POP Form"}
    </button>
    {message && <p className="upload-message" role="status">{message}</p>}
    {result && <div className="upload-review-backdrop" role="dialog" aria-modal="true" aria-label="Review POP administration details">
      <div className="upload-review-card">
        <h2>Review POP administration details</h2>
        <p className="subtle">Check the privately extracted details before adding them to the booking.</p>
        {result.saved_path && <p className="upload-saved-path">Saved locally with this unit&apos;s booking documents.</p>}
        <div className="upload-review-fields">
          {Object.keys(labels).map((key) => <label key={key}><span>{labels[key]}</span><input value={result.fields[key] || ""} placeholder="Not found — enter manually" onChange={(event) => updateField(key, event.target.value)} /></label>)}
        </div>
        <div className="upload-review-actions">
          <button type="button" className="button secondary" onClick={() => setResult(null)}>Cancel</button>
          <button type="button" className="button accent" onClick={apply}>Use these details</button>
        </div>
      </div>
    </div>}
  </div>;
}
