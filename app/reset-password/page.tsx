"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/nara/AuthShell";
import { AuthInput } from "@/components/nara/AuthInput";
import { AmberButton } from "@/components/nara/primitives";

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    // Supabase parses the recovery hash automatically and fires PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setHasRecovery(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      const fromHash = typeof window !== "undefined" && window.location.hash.includes("type=recovery");
      setHasRecovery(!!data.session || fromHash);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: parsed.data });
      if (err) throw err;
      toast.success("Password updated", { description: "You're signed in." });
      router.replace("/"); // Redirect to home or dashboard after reset
    } catch (err) {
      toast.error("Could not update password", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Set new password"
      title="New key. Same signal."
      subtitle="Pick a fresh password — at least 8 characters. We'll sign you in right after."
      footer={
        <>
          Changed your mind?{" "}
          <Link href="/auth" className="font-medium text-nara-amber hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {!ready ? (
        <div className="flex h-32 items-center justify-center text-nara-muted">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !hasRecovery ? (
        <div className="rounded-lg border border-nara-red/40 bg-nara-red/[0.06] p-5">
          <p className="nara-label" style={{ color: "var(--color-nara-red)" }}>
            Recovery link missing
          </p>
          <p className="mt-2 text-sm text-nara-text">
            Open this page from the link in your reset email, or{" "}
            <Link href="/forgot-password" className="text-nara-amber hover:underline">
              request a new one
            </Link>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <AuthInput
            label="New password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            mono
            hint="min 8 chars"
            rightSlot={
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="inline-flex size-8 items-center justify-center rounded-md text-nara-muted hover:text-nara-amber"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
          <AuthInput
            label="Confirm password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            mono
            error={error}
          />
          <AmberButton type="submit" variant="amber" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Update password →
          </AmberButton>
        </form>
      )}
    </AuthShell>
  );
}