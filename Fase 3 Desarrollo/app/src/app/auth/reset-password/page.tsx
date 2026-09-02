import { ResetPasswordForm } from "@/modules/auth/components/auth-forms";
import { AuthShell } from "@/modules/auth/components/auth-shell";

export const metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell eyebrow="Protege tu cuenta" title="Crea una nueva contraseña" description="Elige una contraseña segura que no utilices en otros servicios.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
