"use client";

import { useEffect, useState } from "react";

const malaysiaDate = (date = new Date()) => new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kuala_Lumpur",
}).format(date);

export function CurrentLetterDate({ date }: { date?: string }) {
  const issuedDate = date ? malaysiaDate(new Date(date)) : "";
  const [value, setValue] = useState(() => issuedDate || malaysiaDate());

  useEffect(() => {
    if (date) {
      setValue(malaysiaDate(new Date(date)));
      return;
    }
    const refresh = () => setValue(malaysiaDate());
    window.addEventListener("beforeprint", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("beforeprint", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [date]);

  return <>{value}</>;
}
