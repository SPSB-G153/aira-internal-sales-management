"use client";

import { useLayoutEffect } from "react";

export function ScrollToTop(){
  useLayoutEffect(()=>{
    const previous=history.scrollRestoration;
    history.scrollRestoration="manual";
    window.scrollTo({top:0,left:0,behavior:"auto"});
    const frame=requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
    return()=>{
      cancelAnimationFrame(frame);
      history.scrollRestoration=previous;
    };
  },[]);
  return null;
}
