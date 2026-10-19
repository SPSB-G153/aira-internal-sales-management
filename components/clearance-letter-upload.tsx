"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateHovpAfterClearance } from "@/lib/actions/sales";
import { privateReaderUrl } from "@/lib/private-reader";

export function ClearanceLetterUpload({ saleId, unitNumber }: { saleId: string; unitNumber: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    setMessage("Saving the clearance letter privately on this computer…");
    try {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Please select the clearance letter in PDF format.");
      }
      const body = new FormData();
      body.set("unit_number", unitNumber);
      body.set("filename", `Clearance Letter - ${file.name}`);
      body.set("file", file, file.name);
      const response = await fetch(`${privateReaderUrl()}/save-file`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "The clearance letter could not be saved locally.");

      setMessage("Clearance letter received locally. Issuing the HOVP Letter…");
      startTransition(async () => {
        const issued = await generateHovpAfterClearance(saleId);
        if (issued.error) {
          setError(issued.error);
          setMessage("");
          return;
        }
        setMessage("Clearance letter received locally and HOVP Letter issued.");
        router.refresh();
      });
    } catch (uploadError) {
      setMessage("");
      setError(uploadError instanceof Error && uploadError.message !== "Failed to fetch"
        ? uploadError.message
        : "Start the private Booking Form reader on this computer, then try again.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return <div className="confirm-form">
    <input ref={input} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void upload(file);
    }} />
    <button type="button" className="button accent" disabled={pending} onClick={() => input.current?.click()}>
      {pending ? "Issuing HOVP…" : "Upload Clearance Letter & issue HOVP"}
    </button>
    {message && <p className="upload-message" role="status">{message}</p>}
    {error && <p className="action-error" role="alert">{error}</p>}
  </div>;
}
