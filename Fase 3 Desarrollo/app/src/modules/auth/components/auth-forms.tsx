"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, resetPasswordAction, signInAction, signUpAction } from "../actions";
import { initialAuthActionState } from "../types";
import { FieldError, FormMessage, PasswordInput, SubmitButton } from "./form-controls";

function EmailField({ errors }: { errors?: string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Correo electrónico</span>
      <input className="auth-input" name="email" type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com" aria-invalid={Boolean(errors)} aria-describedby={errors ? "email-error" : undefined} required />
      <FieldError errors={errors} id="email-error" />
    </label>
  );
}

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initialAuthActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <EmailField errors={state.fieldErrors?.email} />
      <PasswordInput name="password" label="Contraseña" error={state.fieldErrors?.password} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[var(--muted)]"><input className="size-4 accent-[var(--brand)]" name="rememberMe" type="checkbox" /> Recordarme</label>
        <Link className="auth-link inline-flex min-h-11 items-center font-semibold text-[var(--brand-dark)]" href="/auth/forgot-password">¿Olvidaste tu contraseña?</Link>
      </div>
      <SubmitButton idle="Iniciar sesión" busy="Ingresando…" />
      <p className="text-center text-sm text-[var(--muted)]">¿Aún no tienes una cuenta? <Link className="auth-link font-bold text-[var(--brand-dark)]" href="/auth/sign-up">Créala gratis</Link></p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialAuthActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <label className="block"><span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Nombre</span><input className="auth-input" name="name" autoComplete="name" placeholder="Tu nombre" aria-invalid={Boolean(state.fieldErrors?.name)} aria-describedby={state.fieldErrors?.name ? "name-error" : undefined} required /><FieldError errors={state.fieldErrors?.name} id="name-error" /></label>
      <EmailField errors={state.fieldErrors?.email} />
      <PasswordInput name="password" label="Contraseña" error={state.fieldErrors?.password} autoComplete="new-password" />
      <PasswordInput name="confirmPassword" label="Confirmar contraseña" error={state.fieldErrors?.confirmPassword} autoComplete="new-password" />
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-5 text-[var(--muted)]"><input className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" name="acceptedTerms" type="checkbox" aria-invalid={Boolean(state.fieldErrors?.acceptedTerms)} /> <span>Acepto los términos de uso y la política de privacidad.</span></label>
      <FieldError errors={state.fieldErrors?.acceptedTerms} id="terms-error" />
      <p className="text-xs leading-5 text-[var(--muted)]">Usa 8 caracteres o más. PagaTo&apos; nunca guarda tu contraseña directamente.</p>
      <SubmitButton idle="Crear mi cuenta" busy="Creando cuenta…" />
      <p className="text-center text-sm text-[var(--muted)]">¿Ya tienes una cuenta? <Link className="auth-link font-bold text-[var(--brand-dark)]" href="/auth/sign-in">Inicia sesión</Link></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialAuthActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <EmailField errors={state.fieldErrors?.email} />
      <SubmitButton idle="Enviar enlace" busy="Enviando…" />
      <p className="text-center text-sm"><Link className="auth-link font-bold text-[var(--brand-dark)]" href="/auth/sign-in">Volver a iniciar sesión</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialAuthActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input name="token" type="hidden" value={token} />
      <FormMessage state={state} />
      <PasswordInput name="password" label="Nueva contraseña" error={state.fieldErrors?.password} autoComplete="new-password" />
      <PasswordInput name="confirmPassword" label="Confirmar contraseña" error={state.fieldErrors?.confirmPassword} autoComplete="new-password" />
      <SubmitButton idle="Actualizar contraseña" busy="Actualizando…" />
      {state.status === "success" && <p className="text-center text-sm"><Link className="auth-link font-bold text-[var(--brand-dark)]" href="/auth/sign-in">Iniciar sesión</Link></p>}
    </form>
  );
}
