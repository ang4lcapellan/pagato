import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("presenta la propuesta principal de PagaTo", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /entiende tu dinero/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /crear mi cuenta/i })).toHaveAttribute("href", "/auth/sign-up");
  });
});
