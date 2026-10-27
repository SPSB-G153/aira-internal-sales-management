import type { ReactNode } from "react";
import { ScrollToTop } from "@/components/scroll-to-top";

export default function DocumentLayout({children}:{children:ReactNode}){
  return <><ScrollToTop/>{children}</>;
}
