import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { SignUpForm } from "@/modules/auth/components/auth-forms";
import { AuthShell } from "@/modules/auth/components/auth-shell";
import { privatePageMetadata } from "@/lib/page-metadata";

export const metadata = privatePageMetadata("Crear cuenta", "Crea tu espacio privado para organizar cuentas, movimientos y presupuestos.");
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const session = await getCurrentSession();
  if (session?.user) redirect("/dashboard");

  return (
    <AuthShell eyebrow="Comienza con claridad" title="Crea tu cuenta" description="Organiza tus finanzas en un espacio privado, sencillo y pensado para ti.">
      <SignUpForm />
    </AuthShell>
  );
}
