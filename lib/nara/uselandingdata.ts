"use client";

import { useState, useEffect } from "react";
import { getLandingData, type LandingData } from "./bayse.function";

export function useLandingData(initialData: LandingData) {
  
  const [data, setData] = useState<LandingData>(initialData);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const freshData = await getLandingData();
        setData(freshData);
      } catch (error) {
       
        console.error("Failed to fetch live market data:", error);
      }
    }, 30_000);

    
    return () => clearInterval(interval);
  }, []);

  return data;
}