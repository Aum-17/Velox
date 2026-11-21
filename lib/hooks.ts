"use client";
import { useEffect, useState } from "react";

/** Re-renders on an interval so "today", the clock and countdowns stay live */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
