import { LegalShell } from "@/components/legal-shell";
import { publicPageMetadata } from "@/lib/page-metadata";
import { configuredSupportEmail } from "@/lib/site";
import { TelemetryPreference } from "@/modules/telemetry/components/telemetry-consent";

export const metadata = publicPageMetadata("Política de privacidad", "Cómo PagaTo trata y protege la información de sus usuarios.", "/privacy");

export default function PrivacyPage() {
  const email = configuredSupportEmail();
  return <LegalShell eyebrow="Privacidad desde el diseño" title="Política de privacidad" summary="Esta política explica qué información usa PagaTo, para qué se utiliza y qué controles conserva el usuario.">
    <section><h2>1. Alcance y responsable</h2><p>PagaTo es una aplicación de finanzas personales. El responsable es el titular de la instalación publicada. Antes del lanzamiento público debe identificarse legalmente al responsable y configurar un correo de soporte verificable.</p></section>
    <section><h2>2. Información tratada</h2><p>La aplicación trata datos de cuenta y sesión, nombre y correo, cuentas financieras creadas por el usuario, movimientos, categorías, presupuestos y preferencias. No solicita contraseñas bancarias ni ejecuta operaciones bancarias.</p></section>
    <section><h2>3. Finalidades</h2><p>Los datos se utilizan para autenticar, proporcionar las funciones financieras solicitadas, proteger la cuenta, resolver errores y mantener la aplicación. La medición técnica opcional solo se activa con consentimiento y registra métricas de rendimiento y rutas normalizadas, sin correos, importes ni identificadores financieros.</p></section>
    <section><h2>4. Cookies y almacenamiento local</h2><p>Neon Auth utiliza cookies necesarias para mantener y proteger la sesión. El navegador guarda localmente la decisión sobre medición opcional. La PWA conserva únicamente recursos públicos indispensables y no guarda en caché saldos, movimientos, sesiones ni respuestas privadas.</p></section>
    <section><h2>Control de medición</h2><p>Puedes cambiar tu decisión en cualquier momento. El cambio se aplica en este navegador.</p><TelemetryPreference /></section>
    <section><h2>5. Proveedores y transferencias</h2><p>Neon presta los servicios de base de datos y autenticación. El proveedor de alojamiento procesará solicitudes y registros técnicos según su propia ubicación y contrato. La lista definitiva de proveedores debe completarse antes de publicar la aplicación.</p></section>
    <section><h2>6. Conservación y seguridad</h2><p>La información se conserva mientras la cuenta esté activa o durante el período necesario para cumplir obligaciones aplicables. Se aplican conexión cifrada, control de acceso, validación, aislamiento por propietario, cabeceras defensivas y límites contra abuso.</p></section>
    <section><h2>7. Derechos y contacto</h2><p>El usuario puede solicitar acceso, corrección o eliminación de sus datos, según la normativa aplicable. {email ? <>El canal de contacto es <a href={`mailto:${email}`}>{email}</a>.</> : <strong> El correo de soporte todavía no está configurado; debe definirse mediante SUPPORT_EMAIL antes del lanzamiento.</strong>}</p></section>
    <aside className="legal-notice"><strong>Revisión necesaria.</strong> Este texto describe el funcionamiento técnico actual, pero debe ser revisado y adaptado por una persona profesional del derecho a la jurisdicción, identidad comercial y modelo de operación definitivos.</aside>
  </LegalShell>;
}
