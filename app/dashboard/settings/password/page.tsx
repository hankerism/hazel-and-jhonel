import { PageHeader } from "@/components/dashboard/ui";
import { PasswordForm } from "@/features/dashboard/settings/password-form";

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader
        title="Change Password"
        description="Choose a new password for the dashboard. You'll stay signed in."
      />
      <PasswordForm />
    </>
  );
}
