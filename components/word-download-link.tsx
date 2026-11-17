"use client";

import { useRef, useState } from "react";

let downloadLocked=false;

type DirectSavePicker=(options:{suggestedName:string;types:Array<{description:string;accept:Record<string,string[]>}>})=>Promise<{createWritable:()=>Promise<{write:(data:Blob)=>Promise<void>;close:()=>Promise<void>}>}>;

export function WordDownloadLink({href,filename}:{href:string;filename:string}){
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
        const directSave=(window as unknown as {showSaveFilePicker?:DirectSavePicker}).showSaveFilePicker;
        const fileHandle=directSave?await directSave({suggestedName:filename,types:[{description:"Microsoft Word document",accept:{"application/vnd.openxmlformats-officedocument.wordprocessingml.document":[".docx"]}}]}):null;
        const response=await fetch(href,{credentials:"same-origin"});
        if(!response.ok)throw new Error("The Word file could not be downloaded.");
        const blob=await response.blob();
        if(fileHandle){
          const writable=await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }else{
          const objectUrl=URL.createObjectURL(blob);
          const anchor=document.createElement("a");
          anchor.href=objectUrl;
          anchor.download=filename;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
        }
      }catch(downloadError){
        if(!(downloadError instanceof DOMException&&downloadError.name==="AbortError"))setError(downloadError instanceof Error?downloadError.message:"The Word file could not be downloaded.");
      }finally{
        started.current=false;
        downloadLocked=false;
        setDownloading(false);
      }
    }}
  >{downloading?"Downloading Word…":"Download Word"}</button>;
}
