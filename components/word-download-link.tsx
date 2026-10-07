"use client";

import { useRef, useState } from "react";

let downloadLocked=false;

export function WordDownloadLink({href}:{href:string}){
  const started=useRef(false);
  const[downloading,setDownloading]=useState(false);
  return <button
    type="button"
    className={`button secondary${downloading?" disabled":""}`}
    disabled={downloading}
    onClick={()=>{
      if(started.current||downloadLocked)return;
      started.current=true;
      downloadLocked=true;
      setDownloading(true);
      window.location.assign(href);
      window.setTimeout(()=>{
        started.current=false;
        downloadLocked=false;
        setDownloading(false);
      },8000);
    }}
  >{downloading?"Downloading Word…":"Download Word"}</button>;
}
