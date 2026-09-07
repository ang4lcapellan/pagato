import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/components/ui/modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("../server/actions", () => ({ saveAccountAction: vi.fn() }));
import { saveAccountAction } from "../server/actions";
import { AccountEditor } from "./account-editor";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("conserva los valores y enfoca el primer campo inválido al rechazar el formulario", async () => {
  vi.mocked(saveAccountAction).mockResolvedValue({ status: "error", message: "Revisa los campos marcados.", fields: { name: ["Escribe un nombre para la cuenta."] } });
  render(<AccountEditor id="dd6731f7-7ee2-4dcc-9be2-8b176118fa00" defaultCurrency="USD" onClose={vi.fn()} onSaved={vi.fn()} />);
  const name = screen.getByRole("textbox", { name: "Nombre de la cuenta" });
  const type = screen.getByRole("combobox", { name: "Tipo de cuenta" });
  const currency = screen.getByRole("combobox", { name: "Moneda" });
  fireEvent.change(type, { target: { value: "digital_wallet" } });
  fireEvent.change(currency, { target: { value: "EUR" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Institución (opcional)" }), { target: { value: "Institución de prueba" } });
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Revisa los campos marcados.");
  await waitFor(() => expect(name).toHaveFocus());
  expect(type).toHaveValue("digital_wallet");
  expect(currency).toHaveValue("EUR");
  expect(screen.getByRole("textbox", { name: "Institución (opcional)" })).toHaveValue("Institución de prueba");
});
