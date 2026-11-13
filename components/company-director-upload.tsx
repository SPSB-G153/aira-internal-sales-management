"use client";

import { useRef, useState } from "react";
import { privateReaderUrl } from "@/lib/private-reader";

export type DirectorFields = Record<string, string>;

const labels: Record<string, string> = {
  director_1_name: "Authorised director 1 name",
  director_1_designation: "Director 1 designation",
  director_1_mobile: "Director 1 mobile number",
  director_1_email: "Director 1 email",
  director_2_name: "Authorised director 2 name",
  director_2_designation: "Director 2 designation",
  director_2_mobile: "Director 2 mobile number",
  director_2_email: "Director 2 email",
};

export function CompanyDirectorUpload({ onUseFields }: { onUseFields: (fields: DirectorFields) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<DirectorFields | null>(null);

  async function extract(file: File) {
    setBusy(true);
    setMessage("Reading the director document privately on this computer…");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`${privateReaderUrl()}/extract-company-directors`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || "The director document could not be read.");
      setFields(data.fields || {});
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The director document could not be read.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return <div className="booking-upload">
    <input ref={input} hidden type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void extract(file);
    }} />
    <button type="button" className="button secondary compact-button" disabled={busy} onClick={() => input.current?.click()}>
      {busy ? "Reading director document…" : "Upload director document"}
    </button>
    {message && <p className="upload-message" role="status">{message}</p>}
    {fields && <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Review authorised director details">
      <div className="card upload-review">
        <h2>Review authorised director details</h2>
        <p className="subtle">The company remains the purchaser. Check the director records before using them.</p>
        <div className="upload-review-fields">
          {Object.keys(labels).map((key) => <label key={key}><span>{labels[key]}</span><input value={fields[key] || ""} placeholder="Not found — enter manually" onChange={(event) => setFields((current) => ({ ...(current || {}), [key]: event.target.value }))} /></label>)}
        </div>
        <div className="upload-review-actions">
          <button type="button" className="button secondary" onClick={() => setFields(null)}>Cancel</button>
          <button type="button" className="button accent" onClick={() => { onUseFields(fields); setFields(null); }}>Use these director details</button>
        </div>
      </div>
    </div>}
  </div>;
}
