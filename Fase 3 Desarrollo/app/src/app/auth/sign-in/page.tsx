import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { SignInForm } from "@/modules/auth/components/auth-forms";
import { AuthShell } from "@/modules/auth/components/auth-shell";
import { privatePageMetadata } from "@/lib/page-metadata";

export const metadata = privatePageMetadata("Iniciar sesión", "Accede de forma segura a tu espacio financiero en PagaTo.");
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await getCurrentSession();
  if (session?.user) redirect("/dashboard");

  return (
    <AuthShell eyebrow="Bienvenido de vuelta" title="Inicia sesión" description="Accede a tu espacio financiero de forma segura.">
      <SignInForm />
    </AuthShell>
  );
}
