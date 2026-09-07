import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShow);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

function setup(busy = false) {
  const onClose = vi.fn();
  const view = render(<Modal title="Prueba de movimiento" onClose={onClose} busy={busy}>
    <button type="button" data-modal-close>Cancelar</button><input aria-label="Nombre" />
  </Modal>);
  const dialog = screen.getByRole("dialog");
  dialog.style.setProperty("--motion-exit", "220ms");
  return { ...view, dialog, onClose };
}
function endAnimation(element: Element, name: string) {
  // jsdom lacks AnimationEvent; React can select the prefixed listener there.
  for (const type of ["animationend", "webkitAnimationEnd"]) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, "animationName", { value: name });
    fireEvent(element, event);
  }
}
function cancelDialog(element: Element) { fireEvent(element, new Event("cancel", { bubbles: true, cancelable: true })); }

describe("Modal motion and dismissal", () => {
  it("keeps the dialog mounted until its own exit animation finishes", () => {
    const { dialog, onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar ventana" }));
    expect(dialog).toHaveAttribute("data-closing", "true");
    expect(dialog).toHaveAttribute("inert");
    expect(onClose).not.toHaveBeenCalled();
    endAnimation(dialog, "motion-modal-enter");
    endAnimation(dialog.querySelector("input")!, "motion-modal-exit");
    expect(onClose).not.toHaveBeenCalled();
    endAnimation(dialog, "motion-modal-exit");
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => vi.runAllTimers());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("shares the exit with footer cancellation and falls back if animationend is missing", () => {
    const { dialog, onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    cancelDialog(dialog);
    act(() => vi.advanceTimersByTime(319));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("animates Escape and never closes twice", () => {
    const { dialog, onClose } = setup();
    cancelDialog(dialog);
    cancelDialog(dialog);
    endAnimation(dialog, "motion-modal-exit");
    endAnimation(dialog, "motion-modal-exit");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("does not dismiss a pending operation", () => {
    const { dialog, onClose } = setup(true);
    cancelDialog(dialog);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Cerrar ventana" })).toBeDisabled();
    expect(dialog).not.toHaveAttribute("data-closing");
    act(() => vi.runAllTimers());
    expect(onClose).not.toHaveBeenCalled();
  });
  it("dismisses immediately with reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { dialog, onClose } = setup();
    cancelDialog(dialog);
    expect(dialog).not.toHaveAttribute("data-closing");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("works without animation styles or matchMedia", () => {
    const { dialog, onClose } = setup();
    dialog.style.setProperty("--motion-exit", "0ms");
    vi.stubGlobal("matchMedia", undefined);
    cancelDialog(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("cancels pending cleanup, restores focus and preserves the original scroll lock", () => {
    const opener = document.createElement("button");
    document.body.append(opener); opener.focus();
    document.body.style.overflow = "auto";
    const { dialog, onClose, unmount } = setup();
    expect(document.body.style.overflow).toBe("hidden");
    cancelDialog(dialog);
    unmount();
    act(() => vi.runAllTimers());
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("auto");
    expect(document.activeElement).toBe(opener);
    opener.remove(); document.body.style.overflow = "";
  });
});
