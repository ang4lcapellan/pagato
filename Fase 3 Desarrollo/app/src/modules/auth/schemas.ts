import { z } from "zod";

const email = z.string().trim().email("Escribe un correo electrónico válido.").max(254);
const password = z.string().min(12, "Usa al menos 12 caracteres.").max(128, "La contraseña es demasiado larga.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
  rememberMe: z.boolean().default(false),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(120, "El nombre es demasiado largo."),
  email,
  password,
  confirmPassword: z.string(),
  acceptedTerms: z.literal(true, { error: "Debes aceptar los términos para continuar." }),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas no coinciden.",
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "El enlace de recuperación no es válido."),
  password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas no coinciden.",
});
