"use client";

import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";
import { BrandMark } from "@/modules/auth/components/brand-mark";

const links = [
  { href: "#beneficios", label: "Beneficios" },
  { href: "#seguridad", label: "Seguridad" },
  { href: "#multidispositivo", label: "Multidispositivo" },
] as const;

export function LandingHeader() {
  const menu = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => { if (menu.current) menu.current.open = false; };
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return <header className="landing-header" id="top">
    <BrandMark />
    <nav className="landing-navigation landing-navigation-desktop" aria-label="Navegación de la portada">
      {links.map(link => <a href={link.href} key={link.href}>{link.label}</a>)}
      <Link className="button button-secondary" href="/auth/sign-in">Iniciar sesión</Link>
    </nav>
    <details className="landing-menu-details" ref={menu}>
      <summary className="landing-menu-button" role="button" aria-label="Abrir o cerrar menú" aria-controls="landing-navigation-mobile">
        <span /><span /><span />
      </summary>
      <nav id="landing-navigation-mobile" className="landing-navigation landing-navigation-mobile" aria-label="Navegación móvil de la portada">
        {links.map(link => <a href={link.href} key={link.href} onClick={closeMenu}>{link.label}</a>)}
        <Link className="button button-secondary" href="/auth/sign-in" onClick={closeMenu}>Iniciar sesión</Link>
      </nav>
    </details>
  </header>;
}

export function LandingEnhancements() {
  return (
    <aside className="landing-scroll-cta" aria-label="Comenzar a usar PagaTo">
      <div><strong>Empieza a organizar tus finanzas</strong><span>Tu información, clara y bajo tu control.</span></div>
      <Link href="/auth/sign-up" className="button button-primary">Crear mi cuenta</Link>
    </aside>
  );
}

export function LandingBackToTop() {
  const animation = useRef<number | null>(null);

  useEffect(() => () => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
  }, []);

  const returnToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (animation.current !== null) cancelAnimationFrame(animation.current);

    const start = window.scrollY;
    if (start === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      return;
    }

    const startedAt = performance.now();
    const duration = 560;
    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, Math.round(start * (1 - eased)));
      if (progress < 1) animation.current = requestAnimationFrame(step);
      else animation.current = null;
    };
    animation.current = requestAnimationFrame(step);
  };

  return <a href="#top" onClick={returnToTop}>Volver arriba</a>;
}
