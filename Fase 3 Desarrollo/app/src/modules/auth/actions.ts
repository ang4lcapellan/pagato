"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { hasAuthEnv } from "@/lib/env/server";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";
import type { AuthActionState } from "./types";

const configurationMessage = "El acceso todavía no está conectado a Neon Auth. Configura las variables del entorno para continuar.";

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

export async function signInAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };

  try {
    const response = await getAuth().signIn.email(result.data);
    if (response.error) return { status: "error", message: authError(response.error.code) };
  } catch {
    return { status: "error", message: "No fue posible conectar con el servicio de acceso." };
  }
  redirect("/dashboard");
}

export async function signUpAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };

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
  redirect("/dashboard");
}

export async function requestPasswordResetAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };

  try {
    await getAuth().requestPasswordReset({
      email: result.data.email,
      redirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/reset-password`,
    });
  } catch {
    // Keep the response generic to avoid exposing whether an account exists.
  }

  return { status: "success", message: "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña." };
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) return invalid(result.error.flatten().fieldErrors);
  if (!hasAuthEnv()) return { status: "error", message: configurationMessage };

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
  redirect("/auth/sign-in");
}
