"use client";

import { useRef, useState } from "react";

export type BookingFeeFields = Record<string, string>;
type Extraction = { fields: BookingFeeFields; warnings: string[]; saved_path?: string };

const labels: Record<string, string> = {
  booking_fee: "Booking fee paid (RM)",
  sale_date: "Payment / booking date",
  payment_method: "Payment method",
  payment_reference: "Receipt / transaction reference",
};

export function BookingFeeUpload({
  unitNumber,
  onUseFields,
}: {
  unitNumber?: string;
  onUseFields: (fields: BookingFeeFields) => void;
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
    setMessage("Reading the booking-fee receipt privately on this computer…");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("unit_number", unitNumber || "");
      const localUrl = process.env.NEXT_PUBLIC_BOOKING_OCR_URL || "http://127.0.0.1:8765";
      const response = await fetch(`${localUrl}/extract-booking-fee`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || "The booking-fee receipt could not be read.");
      setResult(data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The booking-fee receipt could not be read.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function apply() {
    if (!result) return;
    onUseFields(result.fields);
    setResult(null);
    setMessage("Booking-fee details added to the booking form below.");
  }

  return <div className="booking-upload">
    <input
      ref={input}
      type="file"
      accept="application/pdf,image/png,image/jpeg,image/webp"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void extract(file);
      }}
    />
    <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>
      {busy ? "Reading receipt…" : "Upload Booking Fee Receipt"}
    </button>
    {message && <p className="upload-message">{message}</p>}
    {result && <div className="upload-review-backdrop" role="dialog" aria-modal="true" aria-label="Review booking-fee details">
      <div className="upload-review-card">
        <h2>Review booking-fee details</h2>
        <p className="subtle">Check the privately extracted receipt details before auto-filling the booking.</p>
        {result.saved_path && <p className="upload-saved-path">Saved locally with this unit&apos;s booking documents.</p>}
        <div className="upload-review-fields">
          <label><span>{labels.booking_fee}</span><input type="number" value={result.fields.booking_fee || ""} placeholder="Not found — enter manually" onChange={(event) => updateField("booking_fee", event.target.value)} /></label>
          <label><span>{labels.sale_date}</span><input type="date" value={result.fields.sale_date || ""} onChange={(event) => updateField("sale_date", event.target.value)} /></label>
          <label><span>{labels.payment_method}</span><select value={result.fields.payment_method || ""} onChange={(event) => updateField("payment_method", event.target.value)}><option value="">Not found — select manually</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option></select></label>
          <label><span>{labels.payment_reference}</span><input value={result.fields.payment_reference || ""} placeholder="Not found — enter manually" onChange={(event) => updateField("payment_reference", event.target.value)} /></label>
        </div>
        <div className="upload-review-actions">
          <button type="button" className="button secondary" onClick={() => setResult(null)}>Cancel</button>
          <button type="button" className="button accent" onClick={apply}>Use these details</button>
        </div>
      </div>
    </div>}
  </div>;
}
