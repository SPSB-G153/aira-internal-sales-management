"use client";

import { useRef, useState } from "react";
import { findSavedAgentDetails, findSavedSalespersonDetails, savePopAdminDetails, saveUploadedPopDetails } from "@/lib/actions/sales";
import { privateReaderUrl } from "@/lib/private-reader";
import { profileForSalesPersonnel } from "@/lib/sales-personnel";
import { purchaserNameWithoutSalutation } from "@/lib/purchaser-name";
import { approvedAgentDetailsForUnit } from "@/lib/agency-details";

export type PopAdminFields = Record<string, string>;
type Extraction = { fields: PopAdminFields; warnings: string[]; saved_path?: string; cached?: boolean };

const labels: Record<string, string> = {
  customer_name: "Purchaser name",
  customer_name_2: "Purchaser 2 name",
  purchaser_type: "Purchaser type",
  project_name: "Project",
  unit_number: "Unit number",
  unit_type: "Unit type",
  floor_area: "Floor area (square feet)",
  purchase_price: "SPA / purchase price",
  approved_selling_price: "Approved selling price",
  additional_revenue: "Additional revenue",
  repeat_buyer_discount: "Repeat-buyer discount",
  rebate_amount: "Rebate amount",
  sale_date: "Proposal date",
  sale_reference: "POP / booking reference",
  salesperson_name: "Sales personnel name",
  pop_assisting_member_2: "Second sales personnel name",
  salesperson_2_designation: "Second sales personnel designation",
  salesperson_2_mobile: "Second sales personnel mobile no.",
  salesperson_2_email: "Second sales personnel email",
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
const staffReviewFields = new Set(["salesperson_name", "salesperson_designation", "salesperson_mobile", "salesperson_email", "pop_assisting_member_2", "salesperson_2_designation", "salesperson_2_mobile", "salesperson_2_email"]);
const moneyFields = new Set(["purchase_price", "approved_selling_price", "additional_revenue", "repeat_buyer_discount", "rebate_amount"]);

function formatReviewFields(fields: PopAdminFields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    const raw = String(value || "").trim();
    if (key === "customer_name" || key === "customer_name_2") return [key, purchaserNameWithoutSalutation(raw)];
    if (!moneyFields.has(key) || !/^\d+(?:\.\d+)?$/.test(raw)) return [key, value];
    const amount = Number(raw);
    return [key, Number.isFinite(amount) ? amount.toLocaleString("en-MY", { maximumFractionDigits: 2 }) : value];
  }));
}

export function PopAdminUpload({ saleId, unitNumber, expectedCompany, onUseFields, showNamecard = true, compact = false }: {
  saleId?: string;
  unitNumber?: string;
  expectedCompany?: string;
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
      if (source === "namecard") {
        body.set("expected_company", result?.fields.agent_company || expectedCompany || "");
      }
      const localUrl = privateReaderUrl();
      const endpoint = source === "pop" ? "extract-pop-admin" : "extract-namecard-admin";
      const response = await fetch(`${localUrl}/${endpoint}`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || `The ${source === "pop" ? "POP Form" : "namecard"} could not be read.`);
      const extracted = data as Extraction;
      if (source === "pop") {
        extracted.fields = formatReviewFields(extracted.fields);
        const staff = profileForSalesPersonnel(extracted.fields.salesperson_name || "");
        if (staff) extracted.fields = {
          ...extracted.fields,
          salesperson_name: staff.name,
          salesperson_designation: staff.designation,
          salesperson_email: staff.email,
          salesperson_mobile: staff.mobile || extracted.fields.salesperson_mobile || "",
        };
        const secondStaff = profileForSalesPersonnel(extracted.fields.pop_assisting_member_2 || "");
        if (secondStaff) extracted.fields = {
          ...extracted.fields,
          pop_assisting_member_2: secondStaff.name,
          salesperson_2_designation: secondStaff.designation,
          salesperson_2_mobile: secondStaff.mobile,
          salesperson_2_email: secondStaff.email,
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
      const approvedAgent = approvedAgentDetailsForUnit(extracted.fields.unit_number);
      if (approvedAgent) extracted.fields = { ...extracted.fields, ...approvedAgent };
      setResult((current) => mergeIntoPop && current ? {
        ...current,
        fields: {
          ...current.fields,
          ...Object.fromEntries(Object.entries(extracted.fields).filter(([key, value]) => key !== "agent_company" && value?.trim())),
          // The POP identifies the appointed agency. A namecard may also carry
          // principal/network branding, which must not replace that agency.
          agent_company: current.fields.agent_company?.trim() || extracted.fields.agent_company?.trim() || "",
        },
        warnings: [...current.warnings, ...extracted.warnings],
      } : extracted);
      setMessage(extracted.cached ? "Previous private reading reused — no new POP scan was needed." : "");
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
      // Move to the next step immediately. Saving the POP must never block the
      // user from reaching the Booking Form upload.
      setResult(null);
      onUseFields(fields);
      window.setTimeout(() => document.getElementById("booking-form-upload")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      const saved = await saveUploadedPopDetails(fields);
      if (saved.saleId) onUseFields({ ...fields, id: saved.saleId });
      else setMessage(saved.error || "The POP details could not be saved. Please upload the POP again before finishing the booking.");
      return;
    }
    setBusy(true);
    setMessage("Saving the POP administration details to the booking and letters…");
    const saved = await savePopAdminDetails(saleId, fields);
    setBusy(false);
    if (!saved.error) onUseFields(fields);
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
    {message && !result && <p className="upload-message" role="status">{message}</p>}
    {(agentDocuments.appointment || agentDocuments.fee) && <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Agent letters ready">
      <div className="card upload-review agent-letter-ready-card">
        <h2>Agent letters are ready</h2>
        <p className="subtle">Choose either letter to preview. The preview page provides both PDF/print and Word download.</p>
        <div className="form-actions agent-letter-actions">
          {agentDocuments.appointment && <a className="button accent" href={`/documents/${agentDocuments.appointment}`}>Agency Appointment Letter</a>}
          {agentDocuments.fee && <a className="button secondary" href={`/documents/${agentDocuments.fee}`}>Agent&apos;s Fee Arrangement</a>}
        </div>
      </div>
    </div>}
    {result && <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Review POP administration details">
      <div className="card upload-review">
        <h2>Review {reviewSource} administration details</h2>
        <p className="subtle">Check the privately extracted details before adding them to the form. Agency/company is filled only when it is shown.</p>
        {result.saved_path && <p className="upload-saved-path">Saved locally with this unit&apos;s booking documents.</p>}
        {message && <p className="upload-message" role="status">{message}</p>}
        <div className="upload-review-fields">
          {(reviewSource === "namecard" ? namecardFields : Object.keys(labels).filter((key) => !staffReviewFields.has(key))).map((key) => <label key={key}><span>{labels[key]}</span><input value={result.fields[key] || ""} placeholder="Not found — enter manually" onChange={(event) => updateField(key, event.target.value)} /></label>)}
          {reviewSource === "POP Form" && <>
            <div className="purchaser-one-column">
              <div className="purchaser-column-title"><span>01</span><h3>Sales Personnel 1</h3></div>
              {[["salesperson_name","Name"],["salesperson_designation","Designation"],["salesperson_mobile","Mobile number"],["salesperson_email","Email"]].map(([key,label])=><label key={key}><span>{label}</span><input value={result.fields[key]||""} placeholder="Not found — enter manually" onChange={(event)=>updateField(key,event.target.value)}/></label>)}
            </div>
            {result.fields.pop_assisting_member_2?.trim() && <div className="purchaser-two-column">
              <div className="purchaser-column-title"><span>02</span><h3>Sales Personnel 2</h3></div>
              {[["pop_assisting_member_2","Name"],["salesperson_2_designation","Designation"],["salesperson_2_mobile","Mobile number"],["salesperson_2_email","Email"]].map(([key,label])=><label key={key}><span>{label}</span><input value={result.fields[key]||""} placeholder="Not found — enter manually" onChange={(event)=>updateField(key,event.target.value)}/></label>)}
            </div>}
          </>}
        </div>
        {reviewSource === "POP Form" && <button type="button" className="button secondary compact-upload-button" disabled={busy} onClick={() => namecardInput.current?.click()}>
          {busySource === "namecard" ? "Reading agent namecard…" : "Add agent namecard"}
        </button>}
        <div className="upload-review-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={() => setResult(null)}>Cancel</button>
          {saleId
            ? <button type="button" className="button accent" disabled={busy} onClick={() => void apply()}>{busy ? "Saving details…" : "Save these details"}</button>
            : <button type="button" className="button accent" onClick={() => void apply()}>Continue with these details</button>}
        </div>
      </div>
    </div>}
  </div>;
}
