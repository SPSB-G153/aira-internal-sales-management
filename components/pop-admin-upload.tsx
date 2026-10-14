"use client";

import { useRef, useState } from "react";
import { savePopAdminDetails } from "@/lib/actions/sales";

export type PopAdminFields = Record<string, string>;
type Extraction = { fields: PopAdminFields; warnings: string[]; saved_path?: string };

const labels: Record<string, string> = {
  sale_reference: "POP / booking reference",
  salesperson_name: "Sales personnel name",
  salesperson_designation: "Sales personnel designation",
  salesperson_mobile: "Sales personnel mobile no.",
  salesperson_email: "Sales personnel email",
  agent_company: "Sales agency / company",
  agent_address: "Sales agency / company address (if any)",
};

export function PopAdminUpload({ saleId, unitNumber, onUseFields }: {
  saleId?: string;
  unitNumber?: string;
  onUseFields: (fields: PopAdminFields) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const namecardInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [busySource, setBusySource] = useState<"pop" | "namecard" | null>(null);
  const [reviewSource, setReviewSource] = useState<"POP Form" | "namecard">("POP Form");
  const [result, setResult] = useState<Extraction | null>(null);
  const [message, setMessage] = useState("");

  function updateField(key: string, value: string) {
    setResult((current) => current ? { ...current, fields: { ...current.fields, [key]: value } } : current);
  }

  async function extract(file: File, source: "pop" | "namecard") {
    setBusy(true);
    setBusySource(source);
    setResult(null);
    setReviewSource(source === "pop" ? "POP Form" : "namecard");
    setMessage(`Reading the ${source === "pop" ? "POP Form" : "namecard"} privately on this computer…`);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("unit_number", unitNumber || "");
      const localUrl = process.env.NEXT_PUBLIC_BOOKING_OCR_URL || "http://127.0.0.1:8765";
      const endpoint = source === "pop" ? "extract-pop-admin" : "extract-namecard-admin";
      const response = await fetch(`${localUrl}/${endpoint}`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || `The ${source === "pop" ? "POP Form" : "namecard"} could not be read.`);
      setResult(data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `The ${source === "pop" ? "POP Form" : "namecard"} could not be read.`);
    } finally {
      setBusy(false);
      setBusySource(null);
      if (input.current) input.current.value = "";
      if (namecardInput.current) namecardInput.current.value = "";
    }
  }

  async function apply() {
    if (!result) return;
    const fields = result.fields;
    onUseFields(fields);
    setResult(null);
    if (!saleId) {
      setMessage("POP administration details filled below. Review them, then click Save to create the booking and letters.");
      return;
    }
    setBusy(true);
    setMessage("Saving the POP administration details to the booking and letters…");
    const saved = await savePopAdminDetails(saleId, fields);
    setBusy(false);
    setMessage(saved.error || "POP administration details saved and reflected in the booking and letters.");
  }

  return <div className="booking-upload">
    <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void extract(file, "pop");
    }} />
    <input ref={namecardInput} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void extract(file, "namecard");
    }} />
    <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>
      {busySource === "pop" ? "Reading POP Form…" : "Upload POP Form"}
    </button>
    <button type="button" className="button secondary compact-upload-button" disabled={busy} onClick={() => namecardInput.current?.click()}>
      {busySource === "namecard" ? "Reading namecard…" : "Upload namecard (if any)"}
    </button>
    {message && <p className="upload-message" role="status">{message}</p>}
    {result && <div className="upload-review-backdrop" role="dialog" aria-modal="true" aria-label="Review POP administration details">
      <div className="upload-review-card">
        <h2>Review {reviewSource} administration details</h2>
        <p className="subtle">Check the privately extracted details before adding them to the form. Agency/company is filled only when it is shown.</p>
        {result.saved_path && <p className="upload-saved-path">Saved locally with this unit&apos;s booking documents.</p>}
        <div className="upload-review-fields">
          {Object.keys(labels).map((key) => <label key={key}><span>{labels[key]}</span><input value={result.fields[key] || ""} placeholder="Not found — enter manually" onChange={(event) => updateField(key, event.target.value)} /></label>)}
        </div>
        <div className="upload-review-actions">
          <button type="button" className="button secondary" onClick={() => setResult(null)}>Cancel</button>
          <button type="button" className="button accent" onClick={() => void apply()}>Use and save these details</button>
        </div>
      </div>
    </div>}
  </div>;
}
