"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/nara/AuthShell";
import { AuthInput } from "@/components/nara/AuthInput";
import { AmberButton } from "@/components/nara/primitives";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";
type Method = "password" | "phone";

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Use international format e.g. +2348012345678");
const nameSchema = z.string().trim().min(2, "Add a display name").max(60);

// Next.js requires a Suspense boundary when reading URL parameters on the client
export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-nara-black flex items-center justify-center"><Loader2 className="size-6 text-nara-amber animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const searchMode = searchParams.get("mode");
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  
  const initialMode: Mode = searchMode === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [method, setMethod] = useState<Method>("password");

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(redirectTarget);
    });
  }, [router, redirectTarget]);

  const eyebrow = mode === "signup" ? "Open account" : "Re-enter terminal";
  const title = mode === "signup" ? "Get the signal before the herd." : "Welcome back to the floor.";
  const subtitle = mode === "signup"
      ? "One account unlocks live markets, sharp-money alerts, and the Weekly Signal Drop."
      : "Pick up where you left off — the tape never stops moving.";

  return (
    <AuthShell
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      footer={
        mode === "signin" ? (
          <>
            New to Nara?{" "}
            <button className="font-medium text-nara-amber hover:underline" onClick={() => setMode("signup")}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already trading?{" "}
            <button className="font-medium text-nara-amber hover:underline" onClick={() => setMode("signin")}>
              Sign in
            </button>
          </>
        )
      }
    >
      <ModeTabs mode={mode} onChange={setMode} />
      <div className="mt-6">
        <GoogleButton />
      </div>
      <Divider />
      <MethodTabs method={method} onChange={setMethod} />
      <div className="mt-5">
        {method === "password" && (
          <PasswordForm mode={mode} onSignedIn={() => router.replace(redirectTarget)} />
        )}
        {method === "phone" && <PhoneForm />}
      </div>
      {method === "password" && mode === "signin" && (
        <div className="mt-5 text-right">
          <Link href="/forgot-password" className="font-mono text-[11px] uppercase tracking-widest text-nara-muted hover:text-nara-amber">
            Forgot password →
          </Link>
        </div>
      )}
      <p className="mt-7 text-[11px] leading-relaxed text-nara-muted">
        By continuing you agree to our terms and acknowledge that prediction-market data is
        informational only — not financial advice.
      </p>
    </AuthShell>
  );
}

/* ------------------------------- subviews ------------------------------- */

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-nara-border bg-nara-surface2/60 p-1">
      {(["signin", "signup"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
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
  const items: { id: Method; label: string }[] = [
    { id: "password", label: "Password" },
    { id: "phone", label: "Phone OTP" },
  ];
  return (
    <div className="flex items-center gap-5 border-b border-nara-border">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "relative -mb-px pb-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors",
            method === it.id ? "text-nara-amber" : "text-nara-muted hover:text-nara-text",
          )}
        >
          {it.label}
          {method === it.id && (
            <span className="absolute inset-x-0 -bottom-px h-px bg-nara-amber" />
          )}
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-nara-border" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-nara-muted">or</span>
      <span className="h-px flex-1 bg-nara-border" />
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    try {
      // Replaced Lovable wrapper with native Supabase OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      toast.error("Google sign-in failed", { description: e instanceof Error ? e.message : String(e) });
      setLoading(false);
    }
  };
  return (
    <AmberButton variant="ghost" size="lg" className="w-full" onClick={onClick} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="#EA4335" d="M12 11v3.2h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.6 14.7 2.7 12 2.7 6.8 2.7 2.7 6.9 2.7 12s4.1 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
      )}
      Continue with Google
    </AmberButton>
  );
}

function PasswordForm({ mode, onSignedIn }: { mode: Mode; onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const fields: Record<string, string> = {};
    const emailOk = emailSchema.safeParse(email);
    if (!emailOk.success) fields.email = emailOk.error.issues[0].message;
    const pwOk = passwordSchema.safeParse(password);
    if (!pwOk.success) fields.password = pwOk.error.issues[0].message;
    if (mode === "signup") {
      const nameOk = nameSchema.safeParse(name);
      if (!nameOk.success) fields.name = nameOk.error.issues[0].message;
    }
    if (Object.keys(fields).length) {
      setErrors(fields);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailOk.data!,
          password: pwOk.data!,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        toast.success("Account created", { description: "You're in — welcome to Nara." });
        onSignedIn();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailOk.data!,
          password: pwOk.data!,
        });
        if (error) throw error;
        toast.success("Signed in");
        onSignedIn();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(mode === "signup" ? "Sign-up failed" : "Sign-in failed", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
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
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />
      <AmberButton type="submit" variant="amber" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {mode === "signup" ? "Create account →" : "Sign in →"}
      </AmberButton>
    </form>
  );
}


function PhoneForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const normalized = parsed.data.startsWith("+") ? parsed.data : `+${parsed.data}`;
      const { error: err } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (err) throw err;
      setPhone(normalized);
      setStage("otp");
      toast.success("OTP sent", { description: `6-digit code sent to ${normalized}` });
    } catch (err) {
      toast.error("Could not send code", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!/^[0-9]{6}$/.test(code)) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
      if (err) throw err;
      toast.success("Signed in");
      router.replace("/dashboard");
    } catch (err) {
      toast.error("Verification failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  if (stage === "phone") {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        <AuthInput
          label="Phone number"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+2348012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          mono
          hint="intl format"
          error={error}
        />
        <AmberButton type="submit" variant="amber" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Send 6-digit code →
        </AmberButton>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
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
        <AmberButton type="button" variant="ghost" size="lg" onClick={() => setStage("phone")} className="shrink-0">
          ← Back
        </AmberButton>
        <AmberButton type="submit" variant="amber" size="lg" className="flex-1" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Verify →
        </AmberButton>
      </div>
    </form>
  );
}