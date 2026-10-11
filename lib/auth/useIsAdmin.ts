"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Returns whether the signed-in user has the `admin` role.
 * Drives admin-only UI: /admin/* routes, the Diagnostics nav item,
 * and the Bayse health badge in the dashboard topbar.
 */
export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(true);

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

    // If no user is signed in, they aren't an admin
    if (!user) {
      setIsAdmin(false);
      setIsQueryLoading(false);
      return;
    }

    let isMounted = true;
    setIsQueryLoading(true);

    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
          
        if (isMounted) {
          setIsAdmin(!error && !!data);
        }
      } catch (error) {
        console.error("Failed to check admin status:", error);
        if (isMounted) setIsAdmin(false);
      } finally {
        if (isMounted) setIsQueryLoading(false);
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false; // Cleanup to prevent state updates on unmounted components
    };
  }, [user, authLoading]);

  return {
    isAdmin,
    loading: authLoading || isQueryLoading,
  };
}