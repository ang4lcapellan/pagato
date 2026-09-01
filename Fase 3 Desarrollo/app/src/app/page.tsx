import Link from "next/link";

const features = [
  { title: "Control de cuentas", description: "Organiza efectivo, bancos, ahorros y tarjetas por moneda." },
  { title: "Movimientos claros", description: "Registra ingresos, gastos y transferencias sin perder el historial." },
  { title: "Presupuestos útiles", description: "Define límites por categoría y conoce tu progreso en cada período." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link className="flex items-center gap-3" href="/" aria-label="PagaTo, inicio">
            <span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-xl font-bold text-white shadow-lg shadow-emerald-900/10">P</span>
            <span className="text-xl font-bold tracking-tight text-[var(--ink)]">PagaTo&apos;</span>
          </Link>
          <Link className="button button-secondary" href="/auth/sign-in">Iniciar sesión</Link>
        </header>

        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
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
            <div className="relative rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(21,54,45,0.14)] backdrop-blur">
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

        <section id="beneficios" className="grid gap-4 pb-16 md:grid-cols-3">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-number">0{index + 1}</span>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
