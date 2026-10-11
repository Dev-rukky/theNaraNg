// components/nara/auth/AuthForm.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AuthShell, type AuthStat } from "@/components/nara/AuthShell";
import { AuthInput } from "@/components/nara/AuthInput";
import { AmberButton } from "@/components/nara/primitives";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";
type Method = "password" | "phone";

const passwordSchema = z.string().min(8, "At least 8 characters").max(72, "At most 72 characters");
const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const nameSchema = z.string().trim().min(2, "Add a display name").max(60);

const RESEND_COOLDOWN_S = 30;

const COPY = {
  signin: {
    eyebrow: "Re-enter terminal",
    title: "Welcome back to the floor.",
    subtitle: "Pick up where you left off — the tape never stops moving.",
  },
  signup: {
    eyebrow: "Open account",
    title: "Get the signal before the herd.",
    subtitle: "One account unlocks live markets, sharp-money alerts, and the Weekly Signal Drop.",
  },
} as const;

/* ---------------------------------------------------------------- helpers */

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/** Where Supabase sends users back after Google or an email link. */
function callbackUrl(redirectTo: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
}

/**
 * Accepts the ways Nigerians actually type numbers and returns E.164:
 * "0801 234 5678" → "+2348012345678", "2348012345678" → "+2348012345678".
 * Returns null if it still isn't a valid international number.
 */
function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, "");
  let e164: string;
  if (/^0\d{10}$/.test(digits)) e164 = `+234${digits.slice(1)}`;
  else if (/^234\d{10}$/.test(digits)) e164 = `+${digits}`;
  else e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return /^\+[1-9]\d{9,14}$/.test(e164) ? e164 : null;
}

/** Lets the browser finish any navigation, then refreshes server data (layouts read the new cookie). */
function useFinishSignIn(redirectTo: string) {
  const router = useRouter();
  return () => {
    router.replace(redirectTo);
    router.refresh();
  };
}

/* ------------------------------------------------------------------- page */

export function AuthForm({
  initialMode,
  redirectTo,
  callbackError,
  stats,
}: {
  initialMode: Mode;
  redirectTo: string;
  callbackError?: string;
  stats?: AuthStat[];
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [method, setMethod] = useState<Method>("password");
  const finishSignIn = useFinishSignIn(redirectTo);

  // Error passed back from /auth/callback (e.g. expired email link). The id stops duplicates.
  useEffect(() => {
    if (callbackError) toast.error("Sign-in failed", { id: "auth-callback-error", description: callbackError });
  }, [callbackError]);

  const copy = COPY[mode];
  const switchMode = (next: Mode) => () => setMode(next);

  return (
    <AuthShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      stats={stats}
      footer={
        mode === "signin" ? (
          <>
            New to Nara?{" "}
            <button type="button" className="font-medium text-nara-amber hover:underline" onClick={switchMode("signup")}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already trading?{" "}
            <button type="button" className="font-medium text-nara-amber hover:underline" onClick={switchMode("signin")}>
              Sign in
            </button>
          </>
        )
      }
    >
      <ModeTabs mode={mode} onChange={setMode} />
      <div className="mt-6">
        <GoogleButton redirectTo={redirectTo} />
      </div>
      <Divider />
      <MethodTabs method={method} onChange={setMethod} />
      <div className="mt-5">
        {method === "password" ? (
          // key resets the form's fields and errors when switching sign in ↔ create account
          <PasswordForm key={mode} mode={mode} redirectTo={redirectTo} onSignedIn={finishSignIn} />
        ) : (
          <PhoneForm onSignedIn={finishSignIn} />
        )}
      </div>
      {method === "password" && mode === "signin" && (
        <div className="mt-5 text-right">
          <Link
            href="/forgot-password"
            className="font-mono text-[11px] uppercase tracking-widest text-nara-muted hover:text-nara-amber"
          >
            Forgot password <span aria-hidden>→</span>
          </Link>
        </div>
      )}
      <p className="mt-7 text-[11px] leading-relaxed text-nara-muted">
        By continuing you agree to our terms and acknowledge that prediction-market data is informational only —
        not financial advice.
      </p>
    </AuthShell>
  );
}

/* -------------------------------------------------------------- subviews */

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-nara-border bg-nara-surface2/60 p-1" role="group" aria-label="Account">
      {(["signin", "signup"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={cn(
            "relative h-9 rounded-md text-sm font-medium transition-colors",
            mode === m ? "bg-nara-amber text-nara-black" : "text-nara-muted hover:text-nara-text",
          )}
        >
          {m === "signin" ? "Sign in" : "Create account"}
        </button>
      ))}
    </div>
  );
}

function MethodTabs({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  const items = [
    { id: "password", label: "Password" },
    { id: "phone", label: "Phone OTP" },
  ] as const;
  return (
    <div className="flex items-center gap-5 border-b border-nara-border" role="group" aria-label="Sign-in method">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onChange(it.id)}
          aria-pressed={method === it.id}
          className={cn(
            "relative -mb-px pb-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors",
            method === it.id ? "text-nara-amber" : "text-nara-muted hover:text-nara-text",
          )}
        >
          {it.label}
          {method === it.id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-px bg-nara-amber" />}
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-nara-border" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">or</span>
      <span className="h-px flex-1 bg-nara-border" />
    </div>
  );
}

function GoogleButton({ redirectTo }: { redirectTo: string }) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(redirectTo) },
    });
    // On success the browser is already leaving for Google, so only failures land here.
    if (error) {
      toast.error("Google sign-in failed", { description: error.message });
      setLoading(false);
    }
  };

  return (
    <AmberButton type="button" variant="ghost" size="lg" className="w-full" onClick={onClick} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#EA4335"
            d="M12 11v3.2h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.6 14.7 2.7 12 2.7 6.8 2.7 2.7 6.9 2.7 12s4.1 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.6H12z"
          />
        </svg>
      )}
      Continue with Google
    </AmberButton>
  );
}

function PasswordForm({
  mode,
  redirectTo,
  onSignedIn,
}: {
  mode: Mode;
  redirectTo: string;
  onSignedIn: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const emailOk = emailSchema.safeParse(email);
    const pwOk = passwordSchema.safeParse(password);
    const nameOk = mode === "signup" ? nameSchema.safeParse(name) : null;

    const fields: Record<string, string> = {};
    if (!emailOk.success) fields.email = emailOk.error.issues[0].message;
    if (!pwOk.success) fields.password = pwOk.error.issues[0].message;
    if (nameOk && !nameOk.success) fields.name = nameOk.error.issues[0].message;
    setErrors(fields);
    if (!emailOk.success || !pwOk.success || (nameOk && !nameOk.success)) return;

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: emailOk.data,
          password: pwOk.data,
          options: {
            emailRedirectTo: callbackUrl(redirectTo),
            data: { display_name: nameOk?.data },
          },
        });
        if (error) throw error;

        // With email confirmation on, Supabase hides "already registered" by returning a user with no identities.
        if (data.user && data.user.identities?.length === 0) {
          toast.error("That email already has an account", { description: "Sign in instead, or reset your password." });
          return;
        }
        // No session means the user must confirm their email first. Don't send them
        // to the dashboard, which would just bounce them back here.
        if (!data.session) {
          setConfirmSentTo(emailOk.data);
          return;
        }
        toast.success("Account created", { description: "You're in — welcome to Nara." });
        onSignedIn();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: emailOk.data, password: pwOk.data });
        if (error) throw error;
        toast.success("Signed in");
        onSignedIn();
      }
    } catch (err) {
      toast.error(mode === "signup" ? "Sign-up failed" : "Sign-in failed", { description: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (confirmSentTo) {
    return (
      <div className="rounded-xl border border-nara-border bg-nara-surface2/60 p-5 text-center" role="status">
        <MailCheck className="mx-auto size-6 text-nara-amber" aria-hidden />
        <p className="mt-3 text-sm font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-nara-muted">
          We sent a confirmation link to <span className="font-mono text-nara-text">{confirmSentTo}</span>. Open it on
          this device to finish creating your account.
        </p>
        <button
          type="button"
          onClick={() => setConfirmSentTo(null)}
          className="mt-4 font-mono text-[11px] uppercase tracking-widest text-nara-muted hover:text-nara-amber"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {mode === "signup" && (
        <AuthInput
          label="Display name"
          autoComplete="name"
          placeholder="e.g. Tunde A."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
      )}
      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@signal.ng"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        mono
        error={errors.email}
      />
      <AuthInput
        label="Password"
        type={show ? "text" : "password"}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        mono
        hint={mode === "signup" ? "min 8 chars" : undefined}
        error={errors.password}
        rightSlot={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="inline-flex size-8 items-center justify-center rounded-md text-nara-muted hover:text-nara-amber"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />
      <AmberButton type="submit" variant="amber" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {mode === "signup" ? "Create account" : "Sign in"} <span aria-hidden>→</span>
      </AmberButton>
    </form>
  );
}

function PhoneForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState(""); // normalised number the code was sent to
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = async (target: string) => {
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ phone: target });
      if (err) throw err;
      setPhone(target);
      setStage("otp");
      setCode("");
      setCooldown(RESEND_COOLDOWN_S);
      toast.success("Code sent", { description: `6-digit code sent to ${target}` });
    } catch (err) {
      toast.error("Could not send code", { description: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      setError("Enter a valid number, e.g. 0801 234 5678 or +2348012345678");
      return;
    }
    void send(normalized);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
      if (err) throw err;
      toast.success("Signed in");
      onSignedIn();
    } catch (err) {
      toast.error("Verification failed", { description: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (stage === "phone") {
    return (
      <form onSubmit={sendCode} className="space-y-4" noValidate>
        <AuthInput
          label="Phone number"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0801 234 5678"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          mono
          hint="local or +234"
          error={error}
        />
        <AmberButton type="submit" variant="amber" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Send 6-digit code <span aria-hidden>→</span>
        </AmberButton>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4" noValidate>
      <AuthInput
        label="One-time code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        mono
        hint={phone}
        error={error}
      />
      <div className="flex gap-2">
        <AmberButton
          type="button"
          variant="ghost"
          size="lg"
          className="shrink-0"
          onClick={() => {
            setStage("phone");
            setError(undefined);
          }}
        >
          <span aria-hidden>←</span> Back
        </AmberButton>
        <AmberButton type="submit" variant="amber" size="lg" className="flex-1" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Verify <span aria-hidden>→</span>
        </AmberButton>
      </div>
      <div className="text-center">
        <button
          type="button"
          disabled={cooldown > 0 || loading}
          onClick={() => void send(phone)}
          className="font-mono text-[11px] uppercase tracking-widest text-nara-muted hover:text-nara-amber disabled:opacity-50 disabled:hover:text-nara-muted"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}