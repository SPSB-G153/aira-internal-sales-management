"use client";
import { useActionState, useState } from "react";
import { saveSale, type FormState } from "@/lib/actions/sales";
import { PopAdminUpload, type PopAdminFields } from "@/components/pop-admin-upload";
import { solicitorForUnit } from "@/lib/unit-solicitor";
import { storeyForUnit } from "@/lib/unit-details";
import { designationForSalesPersonnel, emailForSalesPersonnel, salesPersonnel } from "@/lib/sales-personnel";
import { splitAgencyDetails } from "@/lib/agency-details";
import type { Sale } from "@/lib/types";
type Props = { sale?: Sale; initialValues?: Partial<Sale>; mode?: "booking" | "pop"; bookingSource?: "uploaded" | "manual" };
const Field = ({
  name,
  label,
  type = "text",
  required = false,
  wide = false,
  defaultValue,
  value,
  onChange,
  list,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  defaultValue?: string | number | null;
  value?: string;
  onChange?: (value: string) => void;
  list?: string;
  error?: string;
}) => (
  <div className={`field ${wide ? "full" : ""}`}>
    <label htmlFor={name}>
      {label}
      {required && <span className="required"> *</span>}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      required={required}
      min={type === "number" ? 0 : undefined}
      step={type === "number" ? "0.01" : undefined}
      defaultValue={value === undefined ? defaultValue ?? "" : undefined}
      value={value}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      list={list}
    />
    {error && <p className="error">{error}</p>}
  </div>
);
const Select = ({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string | number | boolean | null;
  options: Array<[string, string]>;
}) => (
  <div className="field">
    <label htmlFor={name}>{label}</label>
    <select
      id={name}
      name={name}
      defaultValue={value == null ? "" : String(value)}
    >
      <option value="">Select</option>
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  </div>
);
const salutation: [
  [string, string],
  [string, string],
  [string, string],
  [string, string],
  [string, string],
] = [
  ["Mr", "Mr"],
  ["Ms", "Ms"],
  ["Mrs", "Mrs"],
  ["Dr", "Dr"],
  ["Company", "Company"],
];
const detailsByUnit: Record<string, { floorArea: number; unitType: string; parkingBay?: string }> = {
  "A-01-03": { floorArea: 5943, unitType: "A2b", parkingBay: "LG3 7, 8, 9" },
  "A-01-3A": { floorArea: 5943, unitType: "A2b", parkingBay: "LG3 33, 34, 35" },
  "A-02-03": { floorArea: 5351, unitType: "A2", parkingBay: "LG3 75, 76, 77" },
  "A-02-05": { floorArea: 4489, unitType: "B", parkingBay: "LG3 16, 17, 18" },
  "A-02-3A": { floorArea: 5351, unitType: "A2", parkingBay: "LG3 82, 83, 84" },
  "A-03-01": { floorArea: 5253, unitType: "A1", parkingBay: "LG3 4, 5, 6" },
  "A-03-03": { floorArea: 5351, unitType: "A2", parkingBay: "LG3 72, 73, 74" },
  "A-03-05": { floorArea: 4489, unitType: "B", parkingBay: "LG3 39, 40, 41" },
  "A-03-3A": { floorArea: 5351, unitType: "A2", parkingBay: "LG3 89, 90, 91" },
  "A-05-03": { floorArea: 5351, unitType: "A2", parkingBay: "LG3 69, 70, 71" },
  "A-07-05": { floorArea: 4489, unitType: "B", parkingBay: "LG2 25, 26, 27" },
  "A-15-03": { floorArea: 5351, unitType: "A2", parkingBay: "LG1 54, 55, 56" },
  "A-G-01": { floorArea: 7201, unitType: "D", parkingBay: "LG2 106, 107, 108, 109" },
  "A-G-02": { floorArea: 5856, unitType: "E", parkingBay: "LG1 1, 2, 3, 4" },
  "A-G-03": { floorArea: 6383, unitType: "F", parkingBay: "LG1 89, 90, 91, 92" },
  "B-01-01": { floorArea: 1894, unitType: "G2", parkingBay: "LG4 80, 81" },
  "B-01-02": { floorArea: 1894, unitType: "H2", parkingBay: "LG4 3, 4" },
  "B-01-03": { floorArea: 1894, unitType: "G1", parkingBay: "LG4 82, 83" },
  "B-01-04": { floorArea: 1894, unitType: "H1", parkingBay: "LG4 1, 2" },
  "B-02-02": { floorArea: 1894, unitType: "H2", parkingBay: "LG4 76, 77" },
  "B-02-04": { floorArea: 1894, unitType: "H1", parkingBay: "LG4 5, 6" },
  "B-03-04": { floorArea: 1894, unitType: "H1", parkingBay: "LG4 9, 10" },
  "B-05-04": { floorArea: 1894, unitType: "H1", parkingBay: "LG4 68, 69" },
  "B-06-03": { floorArea: 1894, unitType: "G1", parkingBay: "LG4 13, 14" },
  "B-08-01": { floorArea: 1894, unitType: "G2", parkingBay: "LG4 42, 43" },
  "B-13A-03": { floorArea: 1894, unitType: "G1", parkingBay: "LG2 114, 115" },
  "B-13-04": { floorArea: 1894, unitType: "H1", parkingBay: "LG2 48, LG3 78" },
  "B-15-01": { floorArea: 1894, unitType: "G2", parkingBay: "LG2 84, 85, 86" },
  "B-3A-03": { floorArea: 1894, unitType: "G1", parkingBay: "LG4 74, 75" },
  "B-3A-04": { floorArea: 1894, unitType: "H1", parkingBay: "LG4 72, 73" },
};
const detailsForUnit = (unit: string) => detailsByUnit[unit.trim().toUpperCase()];
const keepSecondPurchaser = (form: HTMLFormElement) =>
  [
    "customer_salutation_2",
    "customer_name_2",
    "customer_ic_2",
    "customer_tin_2",
    "customer_nationality_2",
    "customer_sex_2",
    "customer_race_2",
    "bumi_status_2",
    "customer_occupation_2",
    "contact_person_2",
    "customer_phone_2",
    "customer_email_2",
    "customer_address_2",
  ].forEach((name) => {
    const input = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
    if (!input) return;
    const previous = form.querySelector(
      `input[type="hidden"][data-second-field="${name}"]`,
    );
    if (previous) previous.remove();
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = name;
    hidden.value = input.value;
    hidden.dataset.secondField = name;
    form.appendChild(hidden);
  });

export function SaleForm({ sale, initialValues, mode, bookingSource = "manual" }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveSale,
    {},
  );
  const v = (key: keyof Sale) => {
    const value = state.fields?.[key] ?? sale?.[key] ?? initialValues?.[key] ?? "";
    return typeof value === "boolean" ? String(value) : value;
  };
  const entryMode = sale ? (sale.status === "draft" ? "pop" : "booking") : mode ?? "booking";
  const storedAgency = splitAgencyDetails(sale?.agent_company ?? initialValues?.agent_company ?? "");
  const [price, setPrice] = useState(String(sale?.purchase_price ?? initialValues?.purchase_price ?? ""));
  const [bookingFee, setBookingFee] = useState(() => {
    const supplied = sale?.booking_fee ?? initialValues?.booking_fee;
    return supplied == null ? "" : String(supplied);
  });
  const [areaFt, setAreaFt] = useState(String(sale?.floor_area ?? initialValues?.floor_area ?? ""));
  const [areaM, setAreaM] = useState(String(sale?.floor_area_sqm ?? initialValues?.floor_area_sqm ?? ""));
  const [unitType, setUnitType] = useState(String(sale?.unit_type ?? initialValues?.unit_type ?? state.fields?.unit_type ?? "").toUpperCase());
  const [parkingBay, setParkingBay] = useState(String(sale?.car_parking_bay ?? initialValues?.car_parking_bay ?? state.fields?.car_parking_bay ?? ""));
  const [storeyNumber, setStoreyNumber] = useState(String(sale?.storey_number ?? initialValues?.storey_number ?? state.fields?.storey_number ?? ""));
  const [solicitorName, setSolicitorName] = useState(String(sale?.solicitor_name ?? initialValues?.solicitor_name ?? state.fields?.solicitor_name ?? ""));
  const [unitNumber, setUnitNumber] = useState(String(sale?.unit_number ?? initialValues?.unit_number ?? state.fields?.unit_number ?? ""));
  const [popAdmin, setPopAdmin] = useState<Record<string, string>>({
    sale_reference: String(v("sale_reference")),
    salesperson_name: String(v("salesperson_name")),
    salesperson_designation: String(v("salesperson_designation")),
    salesperson_mobile: String(v("salesperson_mobile")),
    salesperson_email: String(v("salesperson_email")),
    agent_company: String(state.fields?.agent_company ?? storedAgency.company),
    agent_address: String(state.fields?.agent_address ?? storedAgency.address),
    agent_name: String(state.fields?.agent_name ?? storedAgency.agent_name),
    agent_designation: String(state.fields?.agent_designation ?? storedAgency.agent_designation),
    agent_mobile: String(state.fields?.agent_mobile ?? storedAgency.agent_mobile),
    agent_email: String(state.fields?.agent_email ?? storedAgency.agent_email),
  });
  const applyPopAdmin = (fields: PopAdminFields) => setPopAdmin((current) => {
    const next = { ...current };
    Object.keys(current).forEach((key) => { if (fields[key]?.trim()) next[key] = fields[key]; });
    const staffEmail = emailForSalesPersonnel(next.salesperson_name);
    if (staffEmail) next.salesperson_email = staffEmail;
    return next;
  });
  const [secondOpen, setSecondOpen] = useState(false);
  const [hasSecond, setHasSecond] = useState(
    Boolean(sale?.customer_name_2 || initialValues?.customer_name_2 || state.fields?.customer_name_2),
  );
  const [secondRelationship, setSecondRelationship] = useState<"spouse" | "joint">("joint");
  const [purchaserType, setPurchaserType] = useState<"individual" | "company">(
    sale?.purchaser_type === "company" || initialValues?.purchaser_type === "company" || state.fields?.purchaser_type === "company"
      ? "company"
      : "individual",
  );
  const changeFt = (x: string) => {
    setAreaFt(x);
    setAreaM(x === "" ? "" : (Number(x) * 0.092903).toFixed(2));
  };
  const changeM = (x: string) => {
    setAreaM(x);
    setAreaFt(x === "" ? "" : (Number(x) * 10.7639).toFixed(2));
  };
  const applyUnitDetails = (unit: string) => {
    setSolicitorName(solicitorForUnit(unit));
    setStoreyNumber(storeyForUnit(unit));
    const details = detailsForUnit(unit);
    if (!details) return;
    setUnitType(details.unitType);
    if (details.parkingBay) setParkingBay(details.parkingBay);
    changeFt(String(details.floorArea));
  };
  return (
    <form action={action} className="card form-card">
      {sale && <input type="hidden" name="id" value={sale.id} />}{" "}
      <input type="hidden" name="entry_mode" value={entryMode} />
      <input type="hidden" name="booking_source" value={bookingSource} />
      {state.error && <div className="alert">{state.error}</div>}
      <section className="form-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{entryMode === "booking" ? "Booking Form" : "POP form"}</p>
            <h2>Purchaser particulars</h2>
          </div>
          <span className="template-step">{entryMode === "booking" ? "Verified booking" : "Editable proposal"}</span>
        </div>
        <div className="form-grid">
          <div className="field full purchaser-type-field">
            <label>Purchaser type</label>
            <div className="purchaser-type-options" role="radiogroup" aria-label="Purchaser type">
              <label><input type="radio" name="purchaser_type" value="individual" checked={purchaserType === "individual"} onChange={() => setPurchaserType("individual")} /><span>Individual</span></label>
              <label><input type="radio" name="purchaser_type" value="company" checked={purchaserType === "company"} onChange={() => setPurchaserType("company")} /><span>Company</span></label>
            </div>
            <p className="subtle">This selects the correct supporting-document requirements for the booking and acceptance letters.</p>
          </div>
          <Select
            name="customer_salutation"
            label="Salutation"
            value={v("customer_salutation")}
            options={salutation}
          />
          <Field
            name="customer_name"
            label="Purchaser 1 full name"
            required
            defaultValue={v("customer_name")}
            error={state.fieldErrors?.customer_name}
          />
          <Field
            name="customer_ic"
            label="Purchaser 1 IC / Passport / Company No."
            defaultValue={v("customer_ic")}
          />
          <div className="field">
            <label>Joint purchase</label>
            <button
              type="button"
              className="button secondary compact-button"
              onClick={() => setSecondOpen(true)}
            >
              {hasSecond ? "Edit purchaser 2" : "Add purchaser 2"}
            </button>
            <p className="subtle">For spouses or another joint purchaser.</p>
          </div>
          <Field
            name="customer_tin"
            label="TIN number"
            defaultValue={v("customer_tin")}
          />
          <Field
            name="customer_nationality"
            label={purchaserType === "company" ? "Director nationality" : "Nationality"}
            defaultValue={v("customer_nationality")}
          />
          <Select
            name="customer_sex"
            label={purchaserType === "company" ? "Director sex" : "Sex"}
            value={v("customer_sex")}
            options={[
              ["Female", "Female"],
              ["Male", "Male"],
            ]}
          />
          <Field
            name="customer_race"
            label="Race"
            defaultValue={v("customer_race")}
          />
          <Select
            name="bumi_status"
            label="Bumiputera status"
            value={v("bumi_status")}
            options={[
              ["true", "Yes"],
              ["false", "No"],
            ]}
          />
          <Field
            name="customer_occupation"
            label={purchaserType === "company" ? "Director position / occupation" : "Occupation"}
            defaultValue={v("customer_occupation")}
          />
          <Field
            name="contact_person"
            label={purchaserType === "company" ? "Director / contact person" : "Contact person"}
            defaultValue={v("contact_person")}
          />
          <Field
            name="customer_phone"
            label="Mobile number"
            defaultValue={v("customer_phone")}
          />
          <Field
            name="customer_email"
            label="Email"
            type="email"
            defaultValue={v("customer_email")}
            error={state.fieldErrors?.customer_email}
          />
          <Field
            name="customer_address"
            label="Correspondence address"
            wide
            defaultValue={v("customer_address")}
          />
        </div>
      </section>
      {secondOpen && (
        <div
          className="purchaser-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Purchaser 2 particulars"
        >
          <div className="purchaser-modal-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Joint purchase</p>
                  <h2>{secondRelationship === "spouse" ? "Spouse particulars" : "Purchaser 2 particulars"}</h2>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={() => setSecondOpen(false)}
              >
                Close
              </button>
            </div>
            <label className="spouse-check">
              <input
                type="checkbox"
                checked={secondRelationship === "spouse"}
                onChange={(event) =>
                  setSecondRelationship(event.target.checked ? "spouse" : "joint")
                }
              />
              <span>Spouse</span>
            </label>
            <p className="subtle">
              Complete these details for the second purchaser, then select Done.
            </p>
            <div className="form-grid">
              <Select
                name="customer_salutation_2"
                label="Salutation"
                value={v("customer_salutation_2")}
                options={salutation}
              />
              <Field
                name="customer_name_2"
                label="Purchaser 2 full name"
                defaultValue={v("customer_name_2")}
              />
              <Field
                name="customer_ic_2"
                label="Purchaser 2 IC / Passport / Company No."
                defaultValue={v("customer_ic_2")}
              />
              <Field
                name="customer_tin_2"
                label="TIN number"
                defaultValue={v("customer_tin_2")}
              />
              <Field
                name="customer_nationality_2"
                label="Nationality"
                defaultValue={v("customer_nationality_2")}
              />
              <Select
                name="customer_sex_2"
                label="Sex"
                value={v("customer_sex_2")}
                options={[
                  ["Female", "Female"],
                  ["Male", "Male"],
                ]}
              />
              <Field
                name="customer_race_2"
                label="Race"
                defaultValue={v("customer_race_2")}
              />
              <Select
                name="bumi_status_2"
                label="Bumiputera status"
                value={v("bumi_status_2")}
                options={[
                  ["true", "Yes"],
                  ["false", "No"],
                ]}
              />
              <Field
                name="customer_occupation_2"
                label="Occupation"
                defaultValue={v("customer_occupation_2")}
              />
              <Field
                name="contact_person_2"
                label="Contact person"
                defaultValue={v("contact_person_2")}
              />
              <Field
                name="customer_phone_2"
                label="Mobile number"
                defaultValue={v("customer_phone_2")}
              />
              <Field
                name="customer_email_2"
                label="Email"
                type="email"
                defaultValue={v("customer_email_2")}
              />
              <Field
                name="customer_address_2"
                label="Correspondence address"
                wide
                defaultValue={v("customer_address_2")}
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="button"
                onClick={(event) => {
                  if (event.currentTarget.form) keepSecondPurchaser(event.currentTarget.form);
                  setHasSecond(true);
                  setSecondOpen(false);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="form-section">
        <h2>Property details</h2>
        <div className="form-grid">
          <Field
            name="project_name"
            label="Project"
            required
            defaultValue={v("project_name")}
            error={state.fieldErrors?.project_name}
          />
          <div className="field">
            <label htmlFor="unit_number">Parcel / unit number</label>
            <input
              id="unit_number"
              name="unit_number"
              value={unitNumber}
              onChange={(event) => { setUnitNumber(event.target.value); applyUnitDetails(event.target.value); }}
            />
            <p className="subtle">The handling lawyer, unit type and area are filled automatically for listed units.</p>
          </div>
          <div className="field">
            <label htmlFor="storey_number">Storey number</label>
            <input id="storey_number" name="storey_number" value={storeyNumber} onChange={(event) => setStoreyNumber(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="unit_type">Unit type</label>
            <input id="unit_type" name="unit_type" value={unitType} onChange={(event) => setUnitType(event.target.value.toUpperCase())} />
          </div>
          <div className="field">
            <label>Area (sq ft)</label>
            <input
              name="floor_area"
              type="number"
              value={areaFt}
              onChange={(e) => changeFt(e.target.value)}
            />
            <p className="subtle">Enter either value.</p>
          </div>
          <div className="field">
            <label>Area (sq m)</label>
            <input
              name="floor_area_sqm"
              type="number"
              value={areaM}
              onChange={(e) => changeM(e.target.value)}
            />
            <p className="subtle">Automatically converted.</p>
          </div>
          <div className="field">
            <label htmlFor="car_parking_bay">Car parking bay</label>
            <input id="car_parking_bay" name="car_parking_bay" value={parkingBay} onChange={(event) => setParkingBay(event.target.value)} />
          </div>
        </div>
      </section>
      {entryMode === "pop" && <section className="form-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">POP approval notes</p>
            <h2>Notes / remarks for POP</h2>
          </div>
          <span className="template-step">Shown in POP approval boxes</span>
        </div>
        <div className="form-grid">
          <div className="field full"><label htmlFor="pop_proposal_note">1. SBDM/BDM&apos;s Proposal - notes</label><textarea id="pop_proposal_note" name="pop_proposal_note" rows={4} defaultValue={v("pop_proposal_note")}/></div>
          <div className="field full"><label htmlFor="pop_conditions_note">Conditions of Sale</label><textarea id="pop_conditions_note" name="pop_conditions_note" rows={5} defaultValue={v("pop_conditions_note")}/></div>
          <div className="field full"><label htmlFor="pop_comments_note">2. Comments / Approval</label><textarea id="pop_comments_note" name="pop_comments_note" rows={4} defaultValue={v("pop_comments_note")}/></div>
        </div>
      </section>}
      <section className="form-section">
        <h2>{entryMode === "pop" ? "POP pricing" : "Offer and deposit"}</h2>
        {entryMode === "pop" && <p className="subtle"><b>POP only:</b> Purchase Price and SPA Price are the same amount. This POP does not change any previous Booking Form record.</p>}
        <div className="form-grid">
          {entryMode === "pop" && <Field name="approved_selling_price" label="Approved selling price (RM)" type="number" defaultValue={v("approved_selling_price")} />}
          <div className="field">
            <label>
              {entryMode === "pop" ? "Purchase Price / SPA Price (same amount) (RM)" : "Purchase price (RM)"}<span className="required"> *</span>
            </label>
            <input
              name="purchase_price"
              type="number"
              required
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {state.fieldErrors?.purchase_price && <p className="error">{state.fieldErrors.purchase_price}</p>}
          </div>
          {entryMode === "booking" && <div className="field">
            <label>Booking fee paid (RM)</label>
            <input name="booking_fee" type="number" min="0" step="0.01" value={bookingFee} onChange={(event) => setBookingFee(event.target.value)} />
            <p className="subtle">Use the actual amount shown in the uploaded banking receipt.</p>
            {state.fieldErrors?.booking_fee && <p className="error">{state.fieldErrors.booking_fee}</p>}
          </div>}
          {entryMode === "pop" && <>
            <Field name="additional_revenue" label="Additional revenue (RM)" type="number" defaultValue={v("additional_revenue")} />
            <Field name="repeat_buyer_discount" label="Repeat buyer discount offered (RM)" type="number" defaultValue={v("repeat_buyer_discount")} />
          </>}
          <Field
            name="rebate_amount"
            label={entryMode === "pop" ? "ID rebate proposed (RM)" : "Rebate amount (RM, if any)"}
            type="number"
            defaultValue={v("rebate_amount")}
          />
          {entryMode === "booking" && <Field
            name="quoted_id_net_selling_price"
            label="Quoted ID net selling price (RM, if any)"
            type="number"
            defaultValue={v("quoted_id_net_selling_price")}
          />}
        </div>
      </section>
      {entryMode === "pop" && <section className="form-section">
        <h2>POP introduction and assisting team</h2>
        <div className="form-grid">
          <Field name="pop_introduction_agent" label="Introduction by - Agent" defaultValue={v("pop_introduction_agent")} />
          <Field name="pop_introduction_spsb" label="Introduction by - SPSB" defaultValue={v("pop_introduction_spsb")} />
          <Field name="pop_assisting_member_2" label="Second team member assisting" defaultValue={v("pop_assisting_member_2")} />
        </div>
      </section>}
      <section className="form-section">
        <div className="section-heading">
          <div><h2>{entryMode === "booking" ? "Booking administration" : "POP administration"}</h2><p className="subtle">Upload the POP Form to fill the sales administration details, or edit them manually.</p></div>
          <PopAdminUpload saleId={sale?.id} unitNumber={unitNumber} onUseFields={applyPopAdmin} />
        </div>
        <div className="form-grid">
          <Field
            name="sale_reference"
            label={`${entryMode === "booking" ? "Booking" : "POP"} reference (auto if blank)`}
            value={popAdmin.sale_reference}
            onChange={(value) => setPopAdmin((current) => ({ ...current, sale_reference: value }))}
          />
          <Field
            name="salesperson_name"
            label="Sales personnel name"
            value={popAdmin.salesperson_name}
            list="sales-personnel-list"
            onChange={(value) => setPopAdmin((current) => ({ ...current, salesperson_name: value, salesperson_email: emailForSalesPersonnel(value) || current.salesperson_email, salesperson_designation: designationForSalesPersonnel(value) }))}
          />
          <datalist id="sales-personnel-list">{salesPersonnel.map((person) => <option key={person.email} value={person.name} />)}</datalist>
          <Field
            name="salesperson_designation"
            label="Sales personnel designation"
            value={popAdmin.salesperson_designation}
            onChange={(value) => setPopAdmin((current) => ({ ...current, salesperson_designation: value }))}
          />
          <Field
            name="salesperson_mobile"
            label="Sales personnel mobile no."
            type="tel"
            value={popAdmin.salesperson_mobile}
            onChange={(value) => setPopAdmin((current) => ({ ...current, salesperson_mobile: value }))}
          />
          <Field
            name="salesperson_email"
            label="Sales personnel email"
            type="email"
            value={popAdmin.salesperson_email}
            onChange={(value) => setPopAdmin((current) => ({ ...current, salesperson_email: value }))}
          />
          <Field
            name="agent_company"
            label="Sales agency / company"
            value={popAdmin.agent_company}
            onChange={(value) => setPopAdmin((current) => ({ ...current, agent_company: value }))}
          />
          <Field name="agent_name" label="Agent name (from namecard)" value={popAdmin.agent_name} onChange={(value) => setPopAdmin((current) => ({ ...current, agent_name: value }))} />
          <Field name="agent_designation" label="Agent designation" value={popAdmin.agent_designation} onChange={(value) => setPopAdmin((current) => ({ ...current, agent_designation: value }))} />
          <Field name="agent_mobile" label="Agent mobile no." type="tel" value={popAdmin.agent_mobile} onChange={(value) => setPopAdmin((current) => ({ ...current, agent_mobile: value }))} />
          <Field name="agent_email" label="Agent email" type="email" value={popAdmin.agent_email} onChange={(value) => setPopAdmin((current) => ({ ...current, agent_email: value }))} />
          <div className="field full">
            <label htmlFor="agent_address">Sales agency / company address (if any)</label>
            <textarea
              id="agent_address"
              name="agent_address"
              value={popAdmin.agent_address}
              placeholder="Enter manually if no namecard is provided"
              onChange={(event) => setPopAdmin((current) => ({ ...current, agent_address: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="solicitor_name">Handling lawyer</label>
            <select id="solicitor_name" name="solicitor_name" value={solicitorName} onChange={(event) => setSolicitorName(event.target.value)}>
              <option value="">Select</option>
              <option value="Zaid Ibrahim & Co">Zaid Ibrahim & Co (ZICO)</option>
              <option value="Jeff Leong, Poon & Wong">Jeff Leong, Poon & Wong (JLPW)</option>
            </select>
          </div>
          <Field
            name="sale_date"
            label={entryMode === "booking" ? "Booking date" : "Proposal date"}
            type="date"
            defaultValue={v("sale_date")}
          />
          <div className="field">
            <label>Deposit payment method</label>
            <div className="payment-method-options" role="radiogroup" aria-label="Deposit payment method">
              <label>
                <input type="radio" name="payment_method" value="cheque" defaultChecked={v("payment_method") === "cheque"} />
                <span>Cheque</span>
              </label>
              <label>
                <input type="radio" name="payment_method" value="bank_transfer" defaultChecked={v("payment_method") === "bank_transfer"} />
                <span>Bank transfer</span>
              </label>
            </div>
          </div>
          <Field
            name="payment_reference"
            label="Cheque no. / bank-transfer reference"
            defaultValue={v("payment_reference")}
          />
        </div>
      </section>
      <section className="form-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Letter approval</p>
            <h2>Approver details</h2>
          </div>
          <span className="template-step">Copied to generated letters</span>
        </div>
        <div className="form-grid">
          <Field
            name="authorised_signatory_name"
            label="Approver name"
            defaultValue={v("authorised_signatory_name")}
          />
          <Field
            name="authorised_signatory_position"
            label="Approver designation"
            defaultValue={v("authorised_signatory_position")}
          />
        </div>
      </section>
      <div className="form-actions">
        {entryMode === "booking" && (!sale || sale.status === "booking_draft") && <button type="submit" name="save_intent" value="draft" className="button secondary" disabled={pending}>
          {pending ? "Saving…" : sale ? "Save draft changes" : "Save as draft"}
        </button>}
        <button type="submit" name="save_intent" value="final" className="button" disabled={pending}>
          {pending ? "Saving…" : entryMode === "booking" ? (sale ? "Save booking changes" : "Create booking") : (sale ? "Save POP changes" : "Save POP")}
        </button>
        {entryMode === "booking" && !sale && <button type="submit" name="save_intent" value="final_and_new" className="button secondary" disabled={pending}>
          {pending ? "Saving…" : "Save & upload another"}
        </button>}
      </div>
    </form>
  );
}
