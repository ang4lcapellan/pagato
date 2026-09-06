"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { getAppUrl, hasAuthEnv } from "@/lib/env/server";
import { enforceAuthRateLimit, rateLimitMessage, type RateLimitPolicy } from "@/lib/security/rate-limit";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";
import type { AuthActionState } from "./types";

const configurationMessage = "El acceso todavía no está conectado a Neon Auth. Configura las variables del entorno para continuar.";
const signInPolicy: RateLimitPolicy = { identityLimit: 5, ipLimit: 15, windowMs: 10 * 60_000 };
const signUpPolicy: RateLimitPolicy = { identityLimit: 3, ipLimit: 8, windowMs: 60 * 60_000 };
const resetPolicy: RateLimitPolicy = { identityLimit: 3, ipLimit: 8, windowMs: 60 * 60_000 };

function invalid(fields: Record<string, string[]>): AuthActionState {
  return { status: "error", message: "Revisa los campos marcados.", fieldErrors: fields };
}

function authError(code?: string): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "El correo o la contraseña no son correctos.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Ya existe una cuenta con este correo.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirma tu correo antes de iniciar sesión.";
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return "Este enlace venció o ya fue utilizado. Solicita uno nuevo.";
    default:
      return "No pudimos completar la solicitud. Inténtalo nuevamente.";
  }
}

function botSubmission(formData: FormData) {
  return String(formData.get("website") ?? "").trim().length > 0;
}

async function limited(scope: string, identity: FormDataEntryValue | null, policy: RateLimitPolicy) {
  const result = enforceAuthRateLimit(scope, typeof identity === "string" ? identity : "", await headers(), policy);
  return result.allowed ? null : { status: "error" as const, message: rateLimitMessage(result.retryAfter) };
}

export async function signInAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (botSubmission(formData)) return { status: "error", message: "No pudimos completar la solicitud. Inténtalo nuevamente." };
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };
  const blocked = await limited("sign-in", formData.get("email"), signInPolicy);
  if (blocked) return blocked;
  const result = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);

  try {
    const response = await getAuth().signIn.email(result.data);
    if (response.error) return { status: "error", message: authError(response.error.code) };
  } catch {
    return { status: "error", message: "No fue posible conectar con el servicio de acceso." };
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUpAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (botSubmission(formData)) return { status: "error", message: "No pudimos completar la solicitud. Inténtalo nuevamente." };
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };
  const blocked = await limited("sign-up", formData.get("email"), signUpPolicy);
  if (blocked) return blocked;
  const result = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);

  try {
    const response = await getAuth().signUp.email({
      name: result.data.name,
      email: result.data.email,
      password: result.data.password,
    });
    if (response.error) return { status: "error", message: authError(response.error.code) };
  } catch {
    return { status: "error", message: "No fue posible crear la cuenta en este momento." };
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordResetAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (botSubmission(formData)) return { status: "success", message: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña." };
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };
  const blocked = await limited("password-reset-request", formData.get("email"), resetPolicy);
  if (blocked) return blocked;
  const result = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);

  try {
    await getAuth().requestPasswordReset({
      email: result.data.email,
      redirectTo: getAppUrl() + "/auth/reset-password",
    });
  } catch {
    // Keep the response generic to avoid exposing whether an account exists.
  }

  return { status: "success", message: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña." };
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (botSubmission(formData)) return { status: "error", message: "No pudimos completar la solicitud. Inténtalo nuevamente." };
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };
  const blocked = await limited("password-reset", formData.get("token"), resetPolicy);
  if (blocked) return blocked;
  const result = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);

  try {
    const response = await getAuth().resetPassword({ token: result.data.token, newPassword: result.data.password });
    if (response.error) return { status: "error", message: authError(response.error.code) };
  } catch {
    return { status: "error", message: "No pudimos actualizar la contraseña." };
  }
  return { status: "success", message: "Tu contraseña fue actualizada. Ya puedes iniciar sesión." };
}

export async function signOutAction() {
  if (hasAuthEnv()) {
    try { await getAuth().signOut(); } catch { /* The local session is still redirected away. */ }
  }
  revalidatePath("/", "layout");
  redirect("/auth/sign-in");
}
