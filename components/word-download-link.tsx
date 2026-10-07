"use client";

import { useEffect, useRef, useState } from "react";

export function WordDownloadLink({href}:{href:string}){
  const started=useRef(false);
  const[downloading,setDownloading]=useState(false);
  const storageKey=`word-downloaded:${href}`;
  useEffect(()=>{
    if(window.sessionStorage.getItem(storageKey)==="1"){
      started.current=true;
      setDownloading(true);
    }
  },[storageKey]);
  return <a
    href={href}
    className={`button secondary${downloading?" disabled":""}`}
    aria-disabled={downloading}
    onClick={event=>{
      if(started.current){event.preventDefault();return;}
      started.current=true;
      setDownloading(true);
      window.sessionStorage.setItem(storageKey,"1");
    }}
  >{downloading?"Word downloaded":"Download Word"}</a>;
}
