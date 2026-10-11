"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/nara/AuthShell";
import { AuthInput } from "@/components/nara/AuthInput";
import { AmberButton } from "@/components/nara/primitives";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
      toast.success("Reset link sent");
    } catch (err) {
      toast.error("Could not send reset link", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Recover access"
      title="Lost the keys. Not the signal."
      subtitle="Drop your email and we'll send a single-use link to set a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/auth" className="font-medium text-nara-amber hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-nara-amber/30 bg-nara-amber/[0.04] p-5">
          <p className="nara-label">Link dispatched</p>
          <p className="mt-2 text-sm text-nara-text">
            If <span className="font-mono text-nara-amber">{email}</span> matches an account, you'll
            receive a reset link within a minute. Check spam too.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <AuthInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@signal.ng"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            mono
            error={error}
          />
          <AmberButton type="submit" variant="amber" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send reset link →
          </AmberButton>
        </form>
      )}
    </AuthShell>
  );
}