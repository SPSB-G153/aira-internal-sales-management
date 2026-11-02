"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

const LetterDateContext = createContext("");

export function LetterDateProvider({ date, children }: { date?: string; children: ReactNode }) {
  return <LetterDateContext.Provider value={date || ""}>{children}</LetterDateContext.Provider>;
}

const malaysiaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).formatToParts(date);
  const day = Number(parts.find((part) => part.type === "day")?.value || 0);
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const year = parts.find((part) => part.type === "year")?.value || "";
  return { day, suffix, remainder: `${month} ${year}` };
};

export function CurrentLetterDate({ date }: { date?: string }) {
  const inheritedDate = useContext(LetterDateContext);
  const effectiveDate = date || inheritedDate;
  const issuedDate = effectiveDate ? malaysiaDate(new Date(effectiveDate)) : "";
  const [value, setValue] = useState(() => issuedDate || malaysiaDate());

  useEffect(() => {
    if (effectiveDate) {
      setValue(malaysiaDate(new Date(effectiveDate)));
      return;
    }
    const refresh = () => setValue(malaysiaDate());
    window.addEventListener("beforeprint", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("beforeprint", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [effectiveDate]);

  return <>{value.day}<sup className="ordinal-suffix">{value.suffix}</sup> {value.remainder}</>;
}
