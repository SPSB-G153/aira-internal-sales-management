"use client";

import { useEffect, useRef, useState } from "react";
import { BookingFormUpload, type BookingUploadFields } from "@/components/booking-form-upload";
import { PopAdminUpload } from "@/components/pop-admin-upload";
import { SaleForm } from "@/components/sale-form";
import { detailsForUnit, squareFeetToSquareMetres } from "@/lib/unit-details";
import type { Sale } from "@/lib/types";

const numericFields = new Set(["floor_area", "floor_area_sqm", "purchase_price", "booking_fee"]);
const isMalayRace = (race: unknown) => /\b(malay|melayu)\b/i.test(String(race || "").trim());
const fullSex = (value: unknown) => { const normalized = String(value || "").trim().toUpperCase(); return normalized === "M" || normalized === "MALE" ? "Male" : normalized === "F" || normalized === "FEMALE" ? "Female" : String(value || "").trim(); };

function bookingValues(fields: BookingUploadFields): Partial<Sale> {
  const values: Record<string, unknown> = { project_name: "Aira Residence" };
  for (const [key, raw] of Object.entries(fields)) {
    const value = raw.trim();
    if (!value) continue;
    if (numericFields.has(key)) {
      const number = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(number)) values[key] = number;
      continue;
    }
    if (key === "bumi_status" || key === "bumi_status_2") {
      const normalized = value.toLowerCase();
      if (["yes", "true", "bumi"].includes(normalized)) values[key] = true;
      if (["no", "false", "non-bumi", "non bumi"].includes(normalized)) values[key] = false;
      continue;
    }
    if (key === "payment_method") {
      const normalized = value.toLowerCase();
      values[key] = normalized.includes("cheque") ? "cheque" : normalized.includes("bank") || normalized.includes("transfer") ? "bank_transfer" : null;
      continue;
    }
    if (key === "purchaser_type") {
      values[key] = value.toLowerCase().includes("company") ? "company" : "individual";
      continue;
    }
    if (key === "unit_number") {
      values[key] = value.toUpperCase();
      continue;
    }
    values[key] = value;
  }
  const unit = typeof values.unit_number === "string" ? values.unit_number : "";
  const unitDetails = detailsForUnit(unit);
  if (unitDetails) {
    values.floor_area = unitDetails.floorAreaSquareFeet;
    values.floor_area_sqm = squareFeetToSquareMetres(unitDetails.floorAreaSquareFeet);
    values.unit_type = unitDetails.unitType.toUpperCase();
    if (unitDetails.parkingBay) values.car_parking_bay = unitDetails.parkingBay;
  }
  values.bumi_status = isMalayRace(values.customer_race);
  values.customer_sex = fullSex(values.customer_sex);
  if (values.customer_name_2 || values.customer_ic_2) values.customer_sex_2 = fullSex(values.customer_sex_2);
  if (values.customer_name_2 || values.customer_ic_2) values.bumi_status_2 = isMalayRace(values.customer_race_2);
  return values as Partial<Sale>;
}

export function NewSaleIntake({ initialValues }: { initialValues?: Partial<Sale> }) {
  const [mode, setMode] = useState<"booking" | "pop" | null>(initialValues ? "booking" : null);
  const [values, setValues] = useState<Partial<Sale> | undefined>(initialValues);
  const [revision, setRevision] = useState(0);
  const [bookingSource, setBookingSource] = useState<"uploaded" | "manual">("manual");
  const entryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mode || revision === 0) return;
    entryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [mode, revision]);

  return <>
    <section className="card new-sale-intake">
      <div className="new-sale-intake-copy">
        <p className="eyebrow">Start here</p>
        <h2>Upload the completed Booking Form</h2>
        <p className="subtle">The form will be read and its details placed into the booking record for you to review before saving.</p>
      </div>
      <div className="new-sale-intake-actions">
        <BookingFormUpload
          buttonLabel="Upload Booking Form"
          onUseFields={(fields) => {
            setValues(bookingValues(fields));
            setMode("booking");
            setBookingSource("uploaded");
            setRevision((current) => current + 1);
          }}
        />
        <button type="button" className="button secondary" onClick={() => { setValues(initialValues); setMode("booking"); setBookingSource("manual"); setRevision((current) => current + 1); }}>
          Enter booking manually
        </button>
      </div>
      <div className="optional-pop-action">
        <div><strong>POP is optional</strong><span>Use it only when a proposal is required before the purchaser proceeds with booking.</span></div>
        <div className="pop-intake-actions">
          <PopAdminUpload
            showNamecard={false}
            compact
            onUseFields={(fields) => {
              setValues(fields as unknown as Partial<Sale>);
              setMode("pop");
              setRevision((current) => current + 1);
            }}
          />
          <button type="button" className="button secondary pop-intake-button" onClick={() => { setValues(undefined); setMode("pop"); setRevision((current) => current + 1); }}>
            Enter POP manually
          </button>
        </div>
      </div>
    </section>
    {mode && <div ref={entryRef} className="new-sale-entry">
      <div className="new-sale-entry-heading">
        <p className="eyebrow">{mode === "booking" ? "Booking Form" : "Optional POP"}</p>
        <h2>{mode === "booking" ? "Review booking details" : "Prepare proposal details"}</h2>
      </div>
      <SaleForm key={`${mode}-${revision}`} initialValues={values} mode={mode} bookingSource={bookingSource}/>
    </div>}
  </>;
}
