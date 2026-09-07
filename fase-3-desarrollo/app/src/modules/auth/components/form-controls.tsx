"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthActionState } from "../types";

export function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  if (!errors?.length) return null;
  return <p className="mt-1.5 text-xs font-medium text-[var(--negative)]" id={id}>{errors[0]}</p>;
}

export function PasswordInput({ name, label, error, autoComplete = "current-password" }: { name: string; label: string; error?: string[]; autoComplete?: string }) {
  const [visible, setVisible] = useState(false);
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">{label}</span>
      <span className="relative block">
        <input className="auth-input pr-14" name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} required />
        <button className="absolute inset-y-0 right-1 my-0.5 min-h-11 min-w-11 rounded-lg px-2 text-xs font-bold text-[var(--brand-dark)] transition-colors hover:bg-[var(--brand-soft)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)]" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? "Ocultar" : "Ver"}</button>
      </span>
      <FieldError errors={error} id={errorId} />
    </label>
  );
}

export function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="auth-submit flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" type="submit" disabled={pending}>
      {pending && <span className="auth-spinner size-4 rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
      {pending ? busy : idle}
    </button>
  );
}

export function FormMessage({ state }: { state: AuthActionState }) {
  if (!state.message) return null;
  const success = state.status === "success";
  return <div className={`auth-message rounded-xl border px-4 py-3 text-sm leading-5 ${success ? "border-emerald-700/15 bg-emerald-50 text-emerald-800" : "border-red-600/15 bg-red-50 text-red-700"}`} role={success ? "status" : "alert"}>{state.message}</div>;
}
