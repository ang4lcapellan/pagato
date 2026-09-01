import Link from "next/link";

export const metadata = { title: "Iniciar sesión" };

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface)] px-5 py-12">
      <section className="w-full max-w-md rounded-[2rem] border border-emerald-950/10 bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-9">
        <Link className="text-lg font-bold text-[var(--ink)]" href="/">PagaTo&apos;</Link>
        <p className="eyebrow mt-8">Acceso seguro</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)]">Iniciar sesión</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">La interfaz de acceso se habilitará al conectar Neon Auth con las variables locales del entorno de desarrollo.</p>
        <Link className="button button-primary mt-8 w-full" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
