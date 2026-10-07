"use client";

import { useState } from "react";

let downloadLocked=false;

export function WordDownloadLink({href}:{href:string}){
  const[downloading,setDownloading]=useState(false);
  return <a
    href={href}
    download
    className={`button secondary${downloading?" disabled":""}`}
    aria-disabled={downloading}
    onClick={event=>{
      if(downloadLocked){event.preventDefault();return;}
      downloadLocked=true;
      setDownloading(true);
      window.setTimeout(()=>{
        downloadLocked=false;
        setDownloading(false);
      },4000);
    }}
  >{downloading?"Downloading Word…":"Download Word"}</a>;
}
