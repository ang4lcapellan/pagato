import { ResetPasswordForm } from "@/modules/auth/components/auth-forms";
import { AuthShell } from "@/modules/auth/components/auth-shell";
import { privatePageMetadata } from "@/lib/page-metadata";

export const metadata = privatePageMetadata("Nueva contraseña", "Define una nueva contraseña segura para recuperar tu cuenta.");

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell eyebrow="Protege tu cuenta" title="Crea una nueva contraseña" description="Elige una contraseña segura que no utilices en otros servicios.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
