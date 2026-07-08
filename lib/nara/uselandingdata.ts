"use client";

import { useState, useEffect } from "react";
import { getLandingData, type LandingData } from "./bayse.function";

export function useLandingData(initialData: LandingData) {
  // 1. Initialize state with the data fetched instantly by the Next.js server
  const [data, setData] = useState<LandingData>(initialData);

  useEffect(() => {
    // 2. Set up a native browser interval to poll Bayse every 30 seconds
    const interval = setInterval(async () => {
      try {
        const freshData = await getLandingData();
        setData(freshData);
      } catch (error) {
        // Silently catch errors so the UI doesn't break if the network blips
        console.error("Failed to fetch live market data:", error);
      }
    }, 30_000);

    // 3. Clean up the interval if the user leaves the page
    return () => clearInterval(interval);
  }, []);

  return data;
}