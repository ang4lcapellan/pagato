import Link from "next/link";
import { BrandMark } from "@/modules/auth/components/brand-mark";

export default function NotFound() {
  return <main className="not-found-page"><section className="not-found-card"><BrandMark /><p className="not-found-code">404</p><h1>Esta página no existe</h1><p>El enlace puede estar incompleto o la página pudo cambiar de lugar. Tus datos no se han modificado.</p><div><Link className="button button-primary" href="/dashboard">Ir al inicio</Link><Link className="button button-secondary" href="/">Ver la portada</Link></div></section></main>;
}
