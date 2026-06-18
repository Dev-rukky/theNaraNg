"use client";

import { useQuery } from "@tanstack/react-query";
import { getLandingData, type LandingData } from "./bayse.functions";

export function useLandingData(initialData?: LandingData) {
  const query = useQuery({
    queryKey: ["nara", "landing"],
    // In Next.js, this queryFn will only fire on the client for the 30s refetches
    queryFn: () => getLandingData(), 
    
    // 1. INJECT SERVER DATA: This guarantees instant zero-layout-shift first paints
    initialData, 
    
    // 2. POLLING CONFIG: Pull a fresh Bayse snapshot every 30s
    staleTime: 25_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    
    // 3. RETRY CONFIG: Client-side exponential backoff
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  // If initialData is provided by the server, query.data will never be undefined
  return query.data as LandingData; 
}