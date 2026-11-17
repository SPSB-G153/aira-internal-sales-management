"use client";

import { useRef, useState } from "react";
import { privateReaderUrl } from "@/lib/private-reader";

export type BookingFeeFields = Record<string, string>;
type Extraction = { fields: BookingFeeFields; warnings: string[]; saved_path?: string };

const labels: Record<string, string> = {
  booking_fee: "Booking fee paid (RM)",
  sale_date: "2% payment / booking date",
  payment_method: "Payment method",
  payment_reference: "Receipt / transaction reference",
};

export function BookingFeeUpload({
  unitNumber,
  purchasePrice,
  onUseFields,
}: {
  unitNumber?: string;
  purchasePrice?: string;
  onUseFields: (fields: BookingFeeFields) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extraction | null>(null);
  const [message, setMessage] = useState("");
  const numeric = (value?: string) => Number(String(value || "").replace(/[^0-9.-]/g, ""));
  const price = numeric(purchasePrice);
  const extractedFee = numeric(result?.fields.booking_fee);
  const expectedFee = Number.isFinite(price) && price > 0 ? Math.round(price * 2) / 100 : 0;
  const feeShortfall = Boolean(result && expectedFee > 0 && (!Number.isFinite(extractedFee) || extractedFee + 0.009 < expectedFee));
  const feeOverpayment = Boolean(result && expectedFee > 0 && Number.isFinite(extractedFee) && extractedFee > expectedFee + 0.009);
  const money = (value: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);

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
      body.set("expected_fee", expectedFee > 0 ? String(expectedFee) : "");
      const localUrl = privateReaderUrl();
      const response = await fetch(`${localUrl}/extract-booking-fee`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || "The booking-fee receipt could not be read.");
      const readAmount = numeric(data?.fields?.booking_fee);
      if (expectedFee > 0 && (!Number.isFinite(readAmount) || readAmount < expectedFee * 0.1)) {
        data.fields = { ...data.fields, booking_fee: expectedFee.toFixed(2), payment_method: data.fields?.payment_method || "cheque" };
        data.warnings = [...(Array.isArray(data.warnings) ? data.warnings : []), "The cheque handwriting was unclear, so the required 2% amount was prefilled. Please verify it against the cheque before using these details."];
      }
      setResult(data);
      setMessage("");
    } catch (error) {
      const reason = error instanceof Error && error.message !== "Failed to fetch"
        ? error.message
        : "The private receipt reader could not complete the extraction.";
      setResult({
        fields: { booking_fee: "", sale_date: "", payment_method: "cheque", payment_reference: "" },
        warnings: [`${reason} Enter the amount, cheque date and cheque number manually below, then continue.`],
      });
      setMessage("");
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
    <button type="button" className="button accent" disabled={busy} onClick={() => input.current?.click()}>
      {busy ? "Reading receipt…" : "Upload Booking Fee Receipt"}
    </button>
    {message && <p className="upload-message">{message}</p>}
    {result && <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Review booking-fee details">
      <div className="card upload-review">
        <h2>Review booking-fee details</h2>
        <p className="subtle">Check the privately extracted receipt details before auto-filling the booking.</p>
        {result.saved_path && <p className="upload-saved-path">Saved locally with this unit&apos;s booking documents.</p>}
        <div className="upload-review-fields">
          <label><span>{labels.booking_fee}</span><input type="number" value={result.fields.booking_fee || ""} placeholder="Not found — enter manually" onChange={(event) => updateField("booking_fee", event.target.value)} /></label>
          <label><span>{labels.sale_date}</span><input type="date" value={result.fields.sale_date || ""} onChange={(event) => updateField("sale_date", event.target.value)} /></label>
          <label><span>{labels.payment_method}</span><select value={result.fields.payment_method || ""} onChange={(event) => updateField("payment_method", event.target.value)}><option value="">Not found — select manually</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="cash">Cash</option></select></label>
          <label><span>{labels.payment_reference}</span><input value={result.fields.payment_reference || ""} placeholder="Not found — enter manually" onChange={(event) => updateField("payment_reference", event.target.value)} /></label>
        </div>
        {feeShortfall && <div className="alert"><strong>Payment is below the required 2% booking fee.</strong><p>Required: {money(expectedFee)} · Entered total: {Number.isFinite(extractedFee) ? money(extractedFee) : "Not found"}. Please correct the amount before using these details.</p><button type="button" className="button secondary" onClick={() => updateField("booking_fee", expectedFee.toFixed(2))}>Use required 2% amount: {money(expectedFee)}</button></div>}
        {feeOverpayment && <div className="alert success"><strong>Payment exceeds the required 2% booking fee.</strong><p>Required: {money(expectedFee)} · Amount received: {money(extractedFee)}. The higher amount can be accepted and will be recorded as paid.</p></div>}
        {result.warnings.length > 0 && <div className="alert"><strong>Please check:</strong><ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        <div className="upload-review-actions">
          <button type="button" className="button secondary" onClick={() => setResult(null)}>Cancel</button>
          <button type="button" className="button accent" disabled={feeShortfall} onClick={apply}>Use these details</button>
        </div>
      </div>
    </div>}
  </div>;
}
