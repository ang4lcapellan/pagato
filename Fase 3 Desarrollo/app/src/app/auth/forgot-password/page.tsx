import { ForgotPasswordForm } from "@/modules/auth/components/auth-forms";
import { AuthShell } from "@/modules/auth/components/auth-shell";

export const metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Recupera tu acceso" title="¿Olvidaste tu contraseña?" description="Escribe tu correo y te enviaremos instrucciones para crear una nueva.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
