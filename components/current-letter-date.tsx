"use client";

import { useEffect, useState } from "react";

const malaysiaDate = () => new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kuala_Lumpur",
}).format(new Date());

export function CurrentLetterDate() {
  const [value, setValue] = useState(malaysiaDate);

  useEffect(() => {
    const refresh = () => setValue(malaysiaDate());
    window.addEventListener("beforeprint", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("beforeprint", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return <>{value}</>;
}
