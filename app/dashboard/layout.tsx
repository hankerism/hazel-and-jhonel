import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { ConfirmProvider } from "@/components/dashboard/confirm";
import { SaveStatusProvider } from "@/components/dashboard/save-status";
import { ToastProvider } from "@/components/dashboard/toast";
import { signOut } from "@/features/auth/actions";
import { getSupabaseAuthClient } from "@/lib/supabase/server-auth";
import { getWeddingContent } from "@/services/wedding-service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The proxy already guards this route; verify again here so the layout
  // can never render for an anonymous request even if routing changes.
  const supabase = await getSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { wedding } = await getWeddingContent();

  return (
    <SaveStatusProvider>
      <ToastProvider>
        <ConfirmProvider>
          <DashboardShell
            coupleNames={`${wedding.brideName} & ${wedding.groomName}`}
            monogram={`${wedding.brideName[0]} & ${wedding.groomName[0]}`}
            userEmail={user.email ?? "Signed in"}
            signOutAction={signOut}
          >
            {children}
          </DashboardShell>
        </ConfirmProvider>
      </ToastProvider>
    </SaveStatusProvider>
  );
}
