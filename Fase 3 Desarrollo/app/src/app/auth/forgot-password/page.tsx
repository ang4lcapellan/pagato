import { ForgotPasswordForm } from "@/modules/auth/components/auth-forms";
import { AuthShell } from "@/modules/auth/components/auth-shell";
import { privatePageMetadata } from "@/lib/page-metadata";

export const metadata = privatePageMetadata("Recuperar contraseña", "Solicita de forma segura un enlace para recuperar el acceso a PagaTo.");

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Recupera tu acceso" title="¿Olvidaste tu contraseña?" description="Escribe tu correo y te enviaremos instrucciones para crear una nueva.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
