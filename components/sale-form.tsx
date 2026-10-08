"use client";
import { useActionState, useState } from "react";
import { saveSale, type FormState } from "@/lib/actions/sales";
import { solicitorForUnit } from "@/lib/unit-solicitor";
import type { Sale } from "@/lib/types";
type Props = { sale?: Sale; initialValues?: Partial<Sale> };
const Field = ({
  name,
  label,
  type = "text",
  required = false,
  wide = false,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  defaultValue?: string | number | null;
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
      defaultValue={defaultValue ?? ""}
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

export function SaleForm({ sale, initialValues }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveSale,
    {},
  );
  const v = (key: keyof Sale) => state.fields?.[key] ?? sale?.[key] ?? initialValues?.[key] ?? "";
  const [price, setPrice] = useState(String(sale?.purchase_price ?? initialValues?.purchase_price ?? ""));
  const [areaFt, setAreaFt] = useState(String(sale?.floor_area ?? initialValues?.floor_area ?? ""));
  const [areaM, setAreaM] = useState(String(sale?.floor_area_sqm ?? initialValues?.floor_area_sqm ?? ""));
  const [unitType, setUnitType] = useState(String(sale?.unit_type ?? initialValues?.unit_type ?? state.fields?.unit_type ?? ""));
  const [parkingBay, setParkingBay] = useState(String(sale?.car_parking_bay ?? initialValues?.car_parking_bay ?? state.fields?.car_parking_bay ?? ""));
  const [solicitorName, setSolicitorName] = useState(String(sale?.solicitor_name ?? initialValues?.solicitor_name ?? state.fields?.solicitor_name ?? ""));
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
  const earnest = price === "" ? "" : (Number(price) * 0.02).toFixed(2);
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
    const details = detailsForUnit(unit);
    if (!details) return;
    setUnitType(details.unitType);
    if (details.parkingBay) setParkingBay(details.parkingBay);
    changeFt(String(details.floorArea));
  };
  return (
    <form action={action} className="card form-card">
      {sale && <input type="hidden" name="id" value={sale.id} />}{" "}
      {state.error && <div className="alert">{state.error}</div>}
      <section className="form-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">POP form</p>
            <h2>Purchaser particulars</h2>
          </div>
          <span className="template-step">Editable proposal</span>
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
            label="Nationality"
            defaultValue={v("customer_nationality")}
          />
          <Select
            name="customer_sex"
            label="Sex"
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
            label="Occupation"
            defaultValue={v("customer_occupation")}
          />
          <Field
            name="contact_person"
            label="Contact person"
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
              defaultValue={v("unit_number")}
              onChange={(event) => applyUnitDetails(event.target.value)}
            />
            <p className="subtle">The handling lawyer, unit type and area are filled automatically for listed units.</p>
          </div>
          <Field
            name="storey_number"
            label="Storey number"
            defaultValue={v("storey_number")}
          />
          <div className="field">
            <label htmlFor="unit_type">Unit type</label>
            <input id="unit_type" name="unit_type" value={unitType} onChange={(event) => setUnitType(event.target.value)} />
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
      <section className="form-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">POP approval notes</p>
            <h2>Notes / remarks for POP</h2>
          </div>
          <span className="template-step">Shown in POP approval boxes</span>
        </div>
        <div className="form-grid">
          <div className="field full"><label htmlFor="pop_proposal_note">1. SBDM/BDM&apos;s Proposal - note / remark</label><textarea id="pop_proposal_note" name="pop_proposal_note" rows={4} defaultValue={v("pop_proposal_note")}/></div>
          <div className="field full"><label htmlFor="pop_recommendation_note">2. Recommendation - note / remark</label><textarea id="pop_recommendation_note" name="pop_recommendation_note" rows={4} defaultValue={v("pop_recommendation_note")}/></div>
          <div className="field full"><label htmlFor="pop_feasibility_note">3. Feasibility Check - note / remark</label><textarea id="pop_feasibility_note" name="pop_feasibility_note" rows={3} defaultValue={v("pop_feasibility_note")}/></div>
          <div className="field full"><label htmlFor="pop_comments_note">4. Comments/Approval - note / remark</label><textarea id="pop_comments_note" name="pop_comments_note" rows={4} defaultValue={v("pop_comments_note")}/></div>
        </div>
      </section>
      <section className="form-section">
        <h2>Offer and deposit</h2>
        <div className="form-grid">
          <div className="field">
            <label>
              Purchase price (RM)<span className="required"> *</span>
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
          </div>
          <div className="field">
            <label>Earnest deposit (RM) · 2% automatic</label>
            <input name="booking_fee" type="number" readOnly value={earnest} />
          </div>
          <Field
            name="rebate_amount"
            label="Rebate amount (RM, if any)"
            type="number"
            defaultValue={v("rebate_amount")}
          />
          <Field
            name="quoted_id_net_selling_price"
            label="Quoted ID net selling price (RM, if any)"
            type="number"
            defaultValue={v("quoted_id_net_selling_price")}
          />
        </div>
      </section>
      <section className="form-section">
        <h2>{sale ? "Booking administration" : "POP administration"}</h2>
        <div className="form-grid">
          <Field
            name="sale_reference"
            label="POP reference (auto if blank)"
            defaultValue={v("sale_reference")}
          />
          <Field
            name="salesperson_name"
            label="Sales personnel name"
            defaultValue={v("salesperson_name")}
          />
          <Field
            name="salesperson_designation"
            label="Sales personnel designation"
            defaultValue={v("salesperson_designation")}
          />
          <Field
            name="salesperson_mobile"
            label="Sales personnel mobile no."
            type="tel"
            defaultValue={v("salesperson_mobile")}
          />
          <Field
            name="salesperson_email"
            label="Sales personnel email"
            type="email"
            defaultValue={v("salesperson_email")}
          />
          <Field
            name="agent_company"
            label="Sales agency / company"
            defaultValue={v("agent_company")}
          />
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
            label="Proposal date"
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
        <button className="button" disabled={pending}>
          {pending ? "Saving…" : sale ? "Save POP changes" : "Save POP"}
        </button>
      </div>
    </form>
  );
}
