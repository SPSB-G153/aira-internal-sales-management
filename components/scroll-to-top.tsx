"use client";

import { useLayoutEffect } from "react";

export function ScrollToTop(){
  useLayoutEffect(()=>{
    const previous=history.scrollRestoration;
    history.scrollRestoration="manual";
    const reset=()=>{
      window.scrollTo({top:0,left:0,behavior:"auto"});
      document.querySelector<HTMLElement>(".document-scroll-shell")?.scrollTo({top:0,left:0,behavior:"auto"});
    };
    reset();
    const frame=requestAnimationFrame(reset);
    return()=>{
      cancelAnimationFrame(frame);
      history.scrollRestoration=previous;
    };
  },[]);
  return null;
}
