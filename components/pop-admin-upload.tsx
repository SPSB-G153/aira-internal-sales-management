"use client";

import { useRef, useState } from "react";
import { findSavedAgentDetails, findSavedSalespersonDetails, savePopAdminDetails, saveUploadedPopDetails } from "@/lib/actions/sales";
import { privateReaderUrl } from "@/lib/private-reader";
import { profileForSalesPersonnel } from "@/lib/sales-personnel";

export type PopAdminFields = Record<string, string>;
type Extraction = { fields: PopAdminFields; warnings: string[]; saved_path?: string };

const labels: Record<string, string> = {
  customer_name: "Purchaser name",
  purchaser_type: "Purchaser type",
  project_name: "Project",
  unit_number: "Unit number",
  purchase_price: "SPA / purchase price",
  sale_date: "Proposal date",
  sale_reference: "POP / booking reference",
  salesperson_name: "Sales personnel name",
  salesperson_designation: "Sales personnel designation",
  salesperson_mobile: "Sales personnel mobile no.",
  salesperson_email: "Sales personnel email",
  agent_company: "Sales agency / company",
  agent_address: "Sales agency / company address (if any)",
  agent_name: "Agent name",
  agent_designation: "Agent designation",
  agent_mobile: "Agent mobile no.",
  agent_email: "Agent email",
};
const namecardFields = ["agent_name", "agent_designation", "agent_mobile", "agent_email", "agent_company", "agent_address"];

export function PopAdminUpload({ saleId, unitNumber, onUseFields, showNamecard = true, compact = false }: {
  saleId?: string;
  unitNumber?: string;
  onUseFields: (fields: PopAdminFields) => void;
  showNamecard?: boolean;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const namecardInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [busySource, setBusySource] = useState<"pop" | "namecard" | null>(null);
  const [reviewSource, setReviewSource] = useState<"POP Form" | "namecard">("POP Form");
  const [result, setResult] = useState<Extraction | null>(null);
  const [message, setMessage] = useState("");
  const [agentDocuments, setAgentDocuments] = useState<{ appointment?: string; fee?: string }>({});

  function updateField(key: string, value: string) {
    setResult((current) => current ? { ...current, fields: { ...current.fields, [key]: value } } : current);
  }

  async function extract(file: File, source: "pop" | "namecard", mergeIntoPop = false) {
    setBusy(true);
    setBusySource(source);
    if (!mergeIntoPop) {
      setResult(null);
      setReviewSource(source === "pop" ? "POP Form" : "namecard");
    }
    setMessage(`Reading the ${source === "pop" ? "POP Form" : "namecard"} privately on this computer…`);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("unit_number", unitNumber || "");
      const localUrl = privateReaderUrl();
      const endpoint = source === "pop" ? "extract-pop-admin" : "extract-namecard-admin";
      const response = await fetch(`${localUrl}/${endpoint}`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || `The ${source === "pop" ? "POP Form" : "namecard"} could not be read.`);
      const extracted = data as Extraction;
      if (source === "pop") {
        const staff = profileForSalesPersonnel(extracted.fields.salesperson_name || "");
        if (staff) extracted.fields = {
          ...extracted.fields,
          salesperson_name: staff.name,
          salesperson_designation: staff.designation,
          salesperson_email: staff.email,
          salesperson_mobile: staff.mobile || extracted.fields.salesperson_mobile || "",
        };
        const savedSalesperson = await findSavedSalespersonDetails(extracted.fields.salesperson_name || "");
        if (savedSalesperson) extracted.fields = {
          ...extracted.fields,
          salesperson_designation: extracted.fields.salesperson_designation || savedSalesperson.salesperson_designation,
          salesperson_mobile: extracted.fields.salesperson_mobile || savedSalesperson.salesperson_mobile,
          salesperson_email: extracted.fields.salesperson_email || savedSalesperson.salesperson_email,
        };
        const company = extracted.fields.agent_company?.trim();
        if (company) {
          const savedAgent = await findSavedAgentDetails(company);
          if (savedAgent) extracted.fields = { ...extracted.fields, ...savedAgent };
        }
      }
      setResult((current) => mergeIntoPop && current ? {
        ...current,
        fields: { ...current.fields, ...Object.fromEntries(Object.entries(extracted.fields).filter(([, value]) => value?.trim())) },
        warnings: [...current.warnings, ...extracted.warnings],
      } : extracted);
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
    if (!saleId) {
      setBusy(true);
      setMessage("Saving the uploaded POP and preparing its documents…");
      const saved = await saveUploadedPopDetails(fields);
      setBusy(false);
      if (saved.agencyAppointmentLetterId || saved.agentLetterId) {
        setResult(null);
        setAgentDocuments({ appointment: saved.agencyAppointmentLetterId, fee: saved.agentLetterId });
        setMessage("POP saved. Both agent letters are ready to preview and download.");
        return;
      }
      if (saved.previewDocumentId) { setResult(null); setMessage("POP saved. No agent was indicated, so no agent letters were created."); return; }
      setMessage(saved.error || "The uploaded POP could not be saved. Please correct the extracted details above.");
      return;
    }
    setBusy(true);
    setMessage("Saving the POP administration details to the booking and letters…");
    const saved = await savePopAdminDetails(saleId, fields);
    setBusy(false);
    if (saved.agencyAppointmentLetterId || saved.agentLetterId) {
      setResult(null);
      setAgentDocuments({ appointment: saved.agencyAppointmentLetterId, fee: saved.agentLetterId });
      setMessage("Details saved. Both agent letters are ready to preview and download.");
      return;
    }
    setMessage(saved.error || "POP administration details saved and reflected in the booking and letters.");
  }

  return <div className="booking-upload">
    <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void extract(file, "pop");
    }} />
    <input ref={namecardInput} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void extract(file, "namecard", reviewSource === "POP Form" && Boolean(result));
    }} />
    <button type="button" className={`button secondary${compact ? " pop-intake-button" : ""}`} disabled={busy} onClick={() => input.current?.click()}>
      {busySource === "pop" ? "Reading POP Form…" : saleId ? "Replace POP Form" : "Upload POP Form"}
    </button>
    {showNamecard && <button type="button" className="button secondary compact-upload-button" disabled={busy} onClick={() => namecardInput.current?.click()}>
      {busySource === "namecard" ? "Reading agent namecard…" : saleId ? "Replace agent namecard" : "Upload agent namecard"}
    </button>}
    {message && <p className="upload-message" role="status">{message}</p>}
    {(agentDocuments.appointment || agentDocuments.fee) && <div className="upload-review-backdrop" role="dialog" aria-modal="true" aria-label="Agent letters ready">
      <div className="upload-review-card agent-letter-ready-card">
        <h2>Agent letters are ready</h2>
        <p className="subtle">Choose either letter to preview. The preview page provides both PDF/print and Word download.</p>
        <div className="form-actions agent-letter-actions">
          {agentDocuments.appointment && <a className="button accent" href={`/documents/${agentDocuments.appointment}`}>Agency Appointment Letter</a>}
          {agentDocuments.fee && <a className="button secondary" href={`/documents/${agentDocuments.fee}`}>Agent&apos;s Fee Arrangement</a>}
        </div>
      </div>
    </div>}
    {result && <div className="upload-review-backdrop" role="dialog" aria-modal="true" aria-label="Review POP administration details">
      <div className="upload-review-card">
        <h2>Review {reviewSource} administration details</h2>
        <p className="subtle">Check the privately extracted details before adding them to the form. Agency/company is filled only when it is shown.</p>
        {result.saved_path && <p className="upload-saved-path">Saved locally with this unit&apos;s booking documents.</p>}
        <div className="upload-review-fields">
          {(reviewSource === "namecard" ? namecardFields : Object.keys(labels)).map((key) => <label key={key}><span>{labels[key]}</span><input value={result.fields[key] || ""} placeholder="Not found — enter manually" onChange={(event) => updateField(key, event.target.value)} /></label>)}
        </div>
        {reviewSource === "POP Form" && <button type="button" className="button secondary compact-upload-button" disabled={busy} onClick={() => namecardInput.current?.click()}>
          {busySource === "namecard" ? "Reading agent namecard…" : "Add agent namecard"}
        </button>}
        <div className="upload-review-actions">
          <button type="button" className="button secondary" onClick={() => setResult(null)}>Cancel</button>
          <button type="button" className="button accent" onClick={() => void apply()}>{saleId ? "Save these details" : "Continue with these details"}</button>
        </div>
      </div>
    </div>}
  </div>;
}
