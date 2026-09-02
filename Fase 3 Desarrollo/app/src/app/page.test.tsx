import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/modules/auth/schemas";
import Home from "./page";

describe("Home", () => {
  it("presenta la propuesta principal de PagaTo", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /entiende tu dinero/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /crear mi cuenta/i })).toHaveAttribute("href", "/auth/sign-up");
  });
});

describe("auth schemas", () => {
  it("acepta credenciales válidas", () => {
    expect(signInSchema.safeParse({ email: "ana@example.com", password: "segura123", rememberMe: true }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "token", password: "segura123", confirmPassword: "segura123" }).success).toBe(true);
  });

  it("rechaza contraseñas diferentes y términos no aceptados", () => {
    const result = signUpSchema.safeParse({ name: "Ana Pérez", email: "ana@example.com", password: "segura123", confirmPassword: "otraClave123", acceptedTerms: true });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.confirmPassword).toContain("Las contraseñas no coinciden.");
    expect(signUpSchema.safeParse({ name: "Ana Pérez", email: "ana@example.com", password: "segura123", confirmPassword: "segura123", acceptedTerms: false }).success).toBe(false);
  });

  it("rechaza un correo de recuperación inválido", () => {
    expect(forgotPasswordSchema.safeParse({ email: "correo-invalido" }).success).toBe(false);
  });
});
