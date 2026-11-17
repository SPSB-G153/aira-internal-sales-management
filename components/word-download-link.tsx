"use client";

import { useRef, useState } from "react";

let downloadLocked=false;

export function WordDownloadLink({href}:{href:string}){
  const started=useRef(false);
  const[downloading,setDownloading]=useState(false);
  const[error,setError]=useState("");
  return <button
    type="button"
    className={`button secondary${downloading?" disabled":""}`}
    disabled={downloading}
    title={error||undefined}
    onClick={async()=>{
      if(started.current||downloadLocked)return;
      started.current=true;
      downloadLocked=true;
      setDownloading(true);
      setError("");
      try{
        // Wait until the server has finished building the complete Word file
        // before handing it to the browser. This prevents a slow generation
        // request from leaving an Unconfirmed .crdownload file behind.
        const response=await fetch(href,{credentials:"same-origin"});
        if(!response.ok)throw new Error("The Word file could not be downloaded.");
        const blob=await response.blob();
        const disposition=response.headers.get("content-disposition")||"";
        const encoded=disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
        const quoted=disposition.match(/filename="([^"]+)"/i)?.[1];
        const filename=encoded?decodeURIComponent(encoded):quoted||"document.docx";
        const objectUrl=URL.createObjectURL(blob);
        const anchor=document.createElement("a");
        anchor.href=objectUrl;
        anchor.download=filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
      }catch(downloadError){
        setError(downloadError instanceof Error?downloadError.message:"The Word file could not be downloaded.");
      }finally{
        started.current=false;
        downloadLocked=false;
        setDownloading(false);
      }
    }}
  >{downloading?"Downloading Word…":"Download Word"}</button>;
}
