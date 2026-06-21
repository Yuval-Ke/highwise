"use client";

import { useEffect } from "react";
import { flushQueue } from "@/lib/analytics";

export function AnalyticsInit() {
  useEffect(() => {
    flushQueue();
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, []);
  return null;
}
