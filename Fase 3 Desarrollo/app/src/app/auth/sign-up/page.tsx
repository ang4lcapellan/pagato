import Link from "next/link";

export const metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface)] px-5 py-12">
      <section className="w-full max-w-md rounded-[2rem] border border-emerald-950/10 bg-white p-7 shadow-xl shadow-emerald-950/5 sm:p-9">
        <Link className="text-lg font-bold text-[var(--ink)]" href="/">PagaTo&apos;</Link>
        <p className="eyebrow mt-8">Tu espacio financiero</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--ink)]">Crear una cuenta</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">El registro se activará al conectar Neon Auth. Ninguna contraseña será almacenada por la aplicación PagaTo&apos;.</p>
        <Link className="button button-primary mt-8 w-full" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
