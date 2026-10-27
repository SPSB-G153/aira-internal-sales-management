import type { ReactNode } from "react";
import { ScrollToTop } from "@/components/scroll-to-top";

export default function DocumentLayout({children}:{children:ReactNode}){
  return <div className="document-scroll-shell"><ScrollToTop/>{children}</div>;
}
