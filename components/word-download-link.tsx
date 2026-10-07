"use client";

import { useRef, useState } from "react";

export function WordDownloadLink({href}:{href:string}){
  const started=useRef(false);
  const[downloading,setDownloading]=useState(false);
  const[failed,setFailed]=useState(false);
  return <button
    type="button"
    className={`button secondary${downloading?" disabled":""}`}
    disabled={downloading}
    onClick={async()=>{
      if(started.current)return;
      started.current=true;
      setDownloading(true);
      setFailed(false);
      try{
        const response=await fetch(href,{credentials:"same-origin"});
        if(!response.ok)throw new Error("Word download failed");
        const disposition=response.headers.get("content-disposition")??"";
        const filename=disposition.match(/filename="([^"]+)"/i)?.[1]??"aira-booking-form.docx";
        const url=URL.createObjectURL(await response.blob());
        const link=document.createElement("a");
        link.href=url;
        link.download=filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch{
        setFailed(true);
      }finally{
        started.current=false;
        setDownloading(false);
      }
    }}
  >{downloading?"Downloading Word…":failed?"Retry Word download":"Download Word"}</button>;
}
