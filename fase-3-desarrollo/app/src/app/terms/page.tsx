import { LegalShell } from "@/components/legal-shell";
import { publicPageMetadata } from "@/lib/page-metadata";
import { configuredSupportEmail } from "@/lib/site";

export const metadata = publicPageMetadata("Términos y condiciones", "Condiciones para utilizar PagaTo de forma responsable y segura.", "/terms");

export default function TermsPage() {
  const email = configuredSupportEmail();
  return <LegalShell eyebrow="Uso claro y responsable" title="Términos y condiciones" summary="Estas condiciones regulan el acceso y uso de la aplicación PagaTo.">
    <section><h2>1. Servicio</h2><p>PagaTo permite organizar manualmente cuentas, ingresos, gastos, transferencias internas, categorías y presupuestos. No es una entidad bancaria, no mueve dinero y no sustituye asesoría financiera, contable, fiscal o legal.</p></section>
    <section><h2>2. Cuenta y seguridad</h2><p>El usuario debe proporcionar información válida, proteger sus credenciales y cerrar la sesión en dispositivos compartidos. No debe intentar acceder a registros ajenos, alterar el servicio o automatizar solicitudes abusivas.</p></section>
    <section><h2>3. Exactitud de la información</h2><p>Los cálculos dependen de los datos introducidos por el usuario. Deben revisarse importes, monedas, fechas y categorías antes de tomar decisiones financieras.</p></section>
    <section><h2>4. Disponibilidad</h2><p>El servicio puede interrumpirse por mantenimiento, conexión, actualizaciones o proveedores externos. PagaTo procura preservar los datos confirmados, pero los formularios sin guardar pueden perderse al cerrar o actualizar la aplicación.</p></section>
    <section><h2>5. Uso permitido</h2><p>No se permite utilizar la aplicación para actividades ilícitas, vulnerar controles de acceso, introducir contenido malicioso ni afectar la disponibilidad para otras personas.</p></section>
    <section><h2>6. Suspensión y eliminación</h2><p>Una cuenta puede suspenderse ante abuso o riesgo de seguridad. El proceso definitivo para exportar o eliminar la cuenta debe documentarse antes de ofrecer el servicio públicamente.</p></section>
    <section><h2>7. Contacto y cambios</h2><p>Los cambios materiales deberán comunicarse de forma comprensible. {email ? <>Las consultas pueden enviarse a <a href={`mailto:${email}`}>{email}</a>.</> : <strong> El correo de soporte debe configurarse mediante SUPPORT_EMAIL antes del lanzamiento.</strong>}</p></section>
    <aside className="legal-notice"><strong>Borrador funcional.</strong> Estas condiciones requieren revisión jurídica y los datos reales del responsable antes de considerarse términos definitivos.</aside>
  </LegalShell>;
}
