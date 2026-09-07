import Link from "next/link";
import { publicPageMetadata } from "@/lib/page-metadata";
import { BrandMark } from "@/modules/auth/components/brand-mark";
import { LandingBackToTop, LandingEnhancements, LandingHeader } from "@/components/landing-interactions";

const features = [
  { title: "Control de cuentas", description: "Organiza efectivo, bancos, ahorros y tarjetas por moneda." },
  { title: "Movimientos claros", description: "Registra ingresos, gastos y transferencias sin perder el historial." },
  { title: "Presupuestos útiles", description: "Define límites por categoría y conoce tu progreso en cada período." },
];

export const metadata = publicPageMetadata("PagaTo' — Finanzas personales claras", "Organiza cuentas, movimientos y presupuestos en una aplicación privada y multidispositivo.", "/");

export default function Home() {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <LandingHeader />

        <section className="landing-hero grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">Finanzas personales sin complicaciones</p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.04] tracking-[-0.045em] text-[var(--ink)] sm:text-6xl lg:text-7xl">Entiende tu dinero y decide con calma.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">Reúne tus cuentas, movimientos y presupuestos en una experiencia clara, privada y diseñada para acompañarte cada día.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="button button-primary" href="/auth/sign-up">Crear mi cuenta</Link>
              <a className="button button-secondary" href="#beneficios">Conocer más</a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
            <div className="absolute -inset-8 rounded-full bg-[var(--brand-soft)] blur-3xl" />
            <div className="landing-demo-card relative rounded-[2rem] p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-[var(--muted)]">Balance disponible</p><p className="mt-2 text-4xl font-bold tracking-tight text-[var(--ink)]">RD$ 48,250</p></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">+8.4%</span>
              </div>
              <div className="mt-8 h-40 rounded-3xl bg-gradient-to-br from-[var(--brand)] to-[#3dc8a2] p-5 text-white">
                <p className="text-sm text-white/75">Cuenta principal</p>
                <div className="mt-14 flex items-end justify-between"><span className="font-semibold">PagaTo&apos;</span><span className="text-sm text-white/80">•••• 2841</span></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="metric-card"><span>Ingresos</span><strong>RD$ 32,400</strong></div>
                <div className="metric-card"><span>Gastos</span><strong>RD$ 18,760</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section id="beneficios" className="landing-section grid gap-4 pb-16 md:grid-cols-3" aria-labelledby="beneficios-title">
          <div className="landing-section-heading md:col-span-3" data-reveal>
            <p className="eyebrow">Una visión completa</p><h2 id="beneficios-title">Lo necesario para entender tu dinero</h2><p>Cuentas, movimientos y presupuestos conectados en una experiencia sencilla.</p>
          </div>
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title} data-reveal>
              <span className="feature-number">0{index + 1}</span>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <LandingEnhancements />

        <section id="seguridad" className="landing-trust" data-reveal>
          <div><p className="eyebrow">Privacidad desde el diseño</p><h2>Tus finanzas no se convierten en contenido público</h2><p>Las rutas financieras requieren una sesión activa. La versión instalable no guarda saldos, movimientos, sesiones ni respuestas privadas para usarlas sin conexión.</p></div>
          <ul><li><strong>Sesión protegida</strong><span>El acceso se verifica antes de mostrar información financiera.</span></li><li><strong>Datos separados</strong><span>Cada consulta y operación se limita al propietario autenticado.</span></li><li><strong>Offline seguro</strong><span>Sin internet se muestra información neutral, sin copias privadas.</span></li></ul>
        </section>

        <section id="multidispositivo" className="landing-device" data-reveal>
          <div className="landing-device-preview" aria-hidden="true"><div><span /><span /><span /></div><p>PagaTo’</p><strong>RD$ 48,250</strong><i /></div>
          <div><p className="eyebrow">Una sola aplicación</p><h2>En escritorio y también en tu pantalla de inicio</h2><p>El diseño se adapta a teléfonos, tabletas y computadoras. Instala PagaTo desde un navegador compatible y recibe las nuevas versiones sin descargar otra aplicación.</p><Link href="/auth/sign-up" className="button button-primary">Probar PagaTo</Link></div>
        </section>

        <footer className="landing-footer"><BrandMark /><p>Finanzas personales claras, privadas y sin complicaciones.</p><nav aria-label="Información legal"><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link><LandingBackToTop /></nav></footer>
      </div>
    </main>
  );
}
