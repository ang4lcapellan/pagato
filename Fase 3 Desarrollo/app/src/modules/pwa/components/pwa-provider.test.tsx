import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PwaProvider } from "./pwa-provider";
import { PwaSettings } from "./pwa-settings";
import { PresentationProvider } from "@/modules/preferences/components/presentation-provider";
import { DEFAULT_PREFERENCES } from "@/modules/preferences/model";

let container: EventTarget & { controller: object | null; register: ReturnType<typeof vi.fn> };
let registration: EventTarget & { active: object; waiting: (EventTarget & { state: string; postMessage: ReturnType<typeof vi.fn> }) | null; installing: null; update: ReturnType<typeof vi.fn> };
beforeEach(() => {
  registration = Object.assign(new EventTarget(), { active: {}, waiting: null, installing: null, update: vi.fn(async () => undefined) });
  container = Object.assign(new EventTarget(), { controller: {}, register: vi.fn(async () => registration) });
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("matchMedia", vi.fn(() => Object.assign(new EventTarget(), { matches: false })));
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: container });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, "serviceWorker"); Reflect.deleteProperty(navigator, "onLine"); });
function renderPwa(enabled = true, english = false) {
  return render(<PresentationProvider preferences={{ ...DEFAULT_PREFERENCES, locale: english ? "en" : "es" }}><PwaProvider enabled={enabled}><PwaSettings /><input aria-label="Borrador" defaultValue="sin guardar" /></PwaProvider></PresentationProvider>);
}
it("registers at the root without caching update checks and provides manual installation guidance", async () => {
  renderPwa();
  await screen.findByText("Pantalla sin conexión preparada en este navegador.");
  expect(container.register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
  expect(screen.queryByRole("button", { name: "Instalar PagaTo" })).not.toBeInTheDocument();
  expect(screen.getByText("Cómo instalar en mi dispositivo")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Buscar actualizaciones" }));
  await waitFor(() => expect(registration.update).toHaveBeenCalledOnce());
});
it("does not register in ordinary development", async () => {
  renderPwa(false);
  await screen.findByText(/Modo desarrollo:/);
  expect(container.register).not.toHaveBeenCalled();
});
it("explains HTTPS on insecure LAN addresses without attempting registration", async () => {
  vi.stubGlobal("isSecureContext", false); renderPwa();
  await screen.findByText(/Una IP local por HTTP no es suficiente/);
  expect(container.register).not.toHaveBeenCalled();
});
it("fails gracefully when registration is rejected", async () => {
  container.register.mockRejectedValue(new Error("unavailable")); renderPwa();
  await screen.findByText(/No se pudo preparar la pantalla sin conexión/);
  expect(screen.getByLabelText("Borrador")).toHaveValue("sin guardar");
});
it("only invokes installation after a click and consumes each prompt once", async () => {
  renderPwa(); await screen.findByText(/Pantalla sin conexión preparada/);
  const offer = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt: vi.fn(async () => undefined), userChoice: Promise.resolve({ outcome: "dismissed" }) });
  act(() => { window.dispatchEvent(offer); });
  expect(offer.defaultPrevented).toBe(true); expect(offer.prompt).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Instalar PagaTo" })); });
  expect(offer.prompt).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Instalar PagaTo" })).not.toBeInTheDocument();
  expect(screen.queryByText(/PagaTo está instalada/)).not.toBeInTheDocument();
  act(() => { window.dispatchEvent(new Event("appinstalled")); });
  expect(screen.getByText(/PagaTo está instalada/)).toBeInTheDocument();
});
it("preserves unsaved input through offline/online transitions and translates the notices", async () => {
  renderPwa(true, true); await screen.findByText(/Offline screen ready/);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  act(() => { window.dispatchEvent(new Event("offline")); });
  expect(screen.getByText(/You're offline. Internet/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Check for updates" })).toBeDisabled();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  act(() => { window.dispatchEvent(new Event("online")); });
  expect(screen.queryByText(/You're offline. Internet/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Borrador")).toHaveValue("sin guardar");
});
it("waits for confirmation and keeps the update available after Later", async () => {
  const waiting = Object.assign(new EventTarget(), { state: "installed", postMessage: vi.fn() });
  registration.waiting = waiting;
  renderPwa(); await screen.findByText("Una nueva versión está lista");
  expect(waiting.postMessage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Más tarde" }));
  expect(screen.queryByText("Una nueva versión está lista")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar aplicación" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("los cambios sin guardar se perderán");
  expect(waiting.postMessage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar y recargar" }));
  expect(waiting.postMessage).toHaveBeenCalledExactlyOnceWith({ type: "ACTIVATE_UPDATE" });
});
it("a controller update from another tab prompts rather than reloading this draft", async () => {
  renderPwa(); await screen.findByText(/Pantalla sin conexión preparada/);
  act(() => { container.controller = {}; container.dispatchEvent(new Event("controllerchange")); });
  expect(screen.getByText("Una nueva versión está lista")).toBeInTheDocument();
  expect(screen.getByLabelText("Borrador")).toHaveValue("sin guardar");
});
