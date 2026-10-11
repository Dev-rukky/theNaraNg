// app/(dashboard)/layout.tsx
// Server Component: checks auth and loads the plan before anything renders.
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/getUser";
import { getPlan } from "@/lib/auth/getPlan";
import { PlanProvider } from "@/lib/auth/PlanProvider";
import { getIsAdmin } from "@/lib/auth/isAdmin";
import { getLandingData } from "@/lib/nara/bayse";
import { DashboardShell } from "@/components/nara/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/auth");

  // All cached; loaded in parallel. Landing data seeds the live bar so it never shows a skeleton.
  const [plan, landing, isAdmin] = await Promise.all([getPlan(), getLandingData(), getIsAdmin()]);

  return (
    <PlanProvider plan={plan}>
      <DashboardShell userLabel={user.email ?? user.phone ?? "Signed in"} landing={landing} isAdmin={isAdmin}>
        {children}
      </DashboardShell>
    </PlanProvider>
  );
}