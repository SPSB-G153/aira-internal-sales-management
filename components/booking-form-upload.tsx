"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Extraction={fields:Record<string,string>;warnings:string[];saved_path?:string};
type SavedDocument={id:string;type:string;wordFilename:string;pdfFilename:string|null};

const labels:Record<string,string>={
  customer_name:"Purchaser 1 name",customer_ic:"Purchaser 1 NRIC / passport",customer_salutation:"Purchaser 1 salutation",customer_tin:"Purchaser 1 TIN",customer_nationality:"Purchaser 1 nationality",customer_sex:"Purchaser 1 sex",customer_race:"Purchaser 1 race",bumi_status:"Purchaser 1 Bumi status",customer_occupation:"Purchaser 1 occupation",contact_person:"Contact person 1",customer_phone:"Mobile number 1",customer_email:"Email 1",customer_address:"Correspondence address 1",
  customer_name_2:"Purchaser 2 name",customer_ic_2:"Purchaser 2 NRIC / passport",customer_salutation_2:"Purchaser 2 salutation",customer_tin_2:"Purchaser 2 TIN",customer_nationality_2:"Purchaser 2 nationality",customer_sex_2:"Purchaser 2 sex",customer_race_2:"Purchaser 2 race",bumi_status_2:"Purchaser 2 Bumi status",customer_occupation_2:"Purchaser 2 occupation",contact_person_2:"Contact person 2",customer_phone_2:"Mobile number 2",customer_email_2:"Email 2",customer_address_2:"Correspondence address 2",
  sale_date:"Booking date",unit_number:"Parcel / unit number",storey_number:"Storey",unit_type:"Type",floor_area_sqm:"Area (square metres)",floor_area:"Area (square feet)",purchase_price:"Purchase price",car_parking_bay:"Car parking bay",payment_method:"Payment method",payment_reference:"Cheque / payment reference",purchaser_type:"Purchaser type",
};

export function BookingFormUpload({documentId}:{documentId:string}){
  const input=useRef<HTMLInputElement>(null);
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[result,setResult]=useState<Extraction|null>(null);
  const[message,setMessage]=useState("");
  const entries=result?Object.entries(result.fields).filter(([,value])=>value.trim()):[];

  async function extract(file:File){
    setBusy(true);setMessage("Reading handwriting…");setResult(null);
    try{
      const body=new FormData();body.set("file",file);
      const localUrl=process.env.NEXT_PUBLIC_BOOKING_OCR_URL||"http://127.0.0.1:8765";
      const response=await fetch(`${localUrl}/extract`,{method:"POST",body});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"The Booking Form could not be read.");
      setResult(data);setMessage("");
    }catch(error){setMessage(error instanceof Error&&error.message!=="Failed to fetch"?error.message:"Start the private Booking Form reader on this computer, then try again.");}
    finally{setBusy(false);if(input.current)input.current.value="";}
  }

  async function apply(){
    if(!result)return;
    setBusy(true);setMessage("Saving extracted information…");
    try{
      const response=await fetch(`/api/documents/${documentId}/booking-upload`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:result.fields})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"The extracted information could not be saved.");
      const localUrl=process.env.NEXT_PUBLIC_BOOKING_OCR_URL||"http://127.0.0.1:8765";
      const files=Array.isArray(data.files)?data.files as SavedDocument[]:[];
      const unitNumber=String(data.unit_number||result.fields.unit_number||"").trim();
      let localCopies=0;
      let localSaveFailed=false;
      try{
        for(const item of files){
          const exports=[{url:`/api/documents/${item.id}/word?layout=2026-10-07-j`,filename:item.wordFilename}];
          if(item.pdfFilename)exports.push({url:item.type==="booking_form"?`/api/documents/${item.id}/booking-pdf`:`/api/documents/${item.id}/pop-pdf`,filename:item.pdfFilename});
          for(const exported of exports){
            const download=await fetch(exported.url,{cache:"no-store"});
            if(!download.ok)continue;
            const body=new FormData();body.set("unit_number",unitNumber);body.set("filename",exported.filename);body.set("file",await download.blob(),exported.filename);
            const saved=await fetch(`${localUrl}/save-file`,{method:"POST",body});if(saved.ok)localCopies+=1;else localSaveFailed=true;
          }
        }
      }catch{localSaveFailed=true;}
      setResult(null);setMessage(`Information saved and letters refreshed.${localCopies?` ${localCopies} document files saved in C:\\AIRA Booking\\${unitNumber}.`:""}${localSaveFailed?" Some local document copies could not be saved.":""}`);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"The extracted information could not be saved.");}
    finally{setBusy(false);}
  }

  return <div className="booking-upload">
    <input ref={input} hidden type="file" accept="application/pdf,.pdf" onChange={event=>{const file=event.target.files?.[0];if(file)void extract(file);}}/>
    <button type="button" className="button secondary upload-button" disabled={busy} onClick={()=>input.current?.click()}>{busy?"Reading…":"Upload"}</button>
    {message&&<small className="upload-message" role="status">{message}</small>}
    {result&&<div className="upload-modal" role="dialog" aria-modal="true" aria-label="Review extracted Booking Form information">
      <div className="card upload-review">
        <h2>Review extracted information</h2>
        <p className="subtle">Check the handwriting results before saving them to the sale and refreshing the letters.</p>
        {result.saved_path&&<p className="upload-saved-path">Saved locally: <strong>{result.saved_path}</strong></p>}
        {entries.length?<dl>{entries.map(([key,value])=><div key={key}><dt>{labels[key]||key}</dt><dd>{value}</dd></div>)}</dl>:<p>No handwritten information was found.</p>}
        {result.warnings.length>0&&<div className="alert"><strong>Please check:</strong><ul>{result.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div>}
        <div className="upload-review-actions"><button type="button" className="button secondary" disabled={busy} onClick={()=>setResult(null)}>Cancel</button><button type="button" className="button accent" disabled={busy||entries.length===0} onClick={()=>void apply()}>Save information</button></div>
      </div>
    </div>}
  </div>;
}
