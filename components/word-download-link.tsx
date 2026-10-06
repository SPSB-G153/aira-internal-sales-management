"use client";

import { useRef, useState } from "react";

export function WordDownloadLink({href}:{href:string}){
  const started=useRef(false);
  const[downloading,setDownloading]=useState(false);
  return <a
    href={href}
    className={`button secondary${downloading?" disabled":""}`}
    aria-disabled={downloading}
    onClick={event=>{
      if(started.current){event.preventDefault();return;}
      started.current=true;
      setDownloading(true);
      window.setTimeout(()=>{started.current=false;setDownloading(false);},5000);
    }}
  >{downloading?"Downloading…":"Download Word"}</a>;
}
