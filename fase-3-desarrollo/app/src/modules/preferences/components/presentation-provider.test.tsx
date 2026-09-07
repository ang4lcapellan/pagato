import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PresentationProvider, usePresentation } from "./presentation-provider";
import { DEFAULT_PREFERENCES } from "../model";
afterEach(cleanup);
function Sample() { const {t,message,formatMoney,formatDate,formatNumber,bucketLabel}=usePresentation(); return <div><h1>{t("Inicio")}</h1><p>{message`Consumo de ${"Mi cuenta"}`}</p><p>{formatMoney("12345.0001","DOP")}</p><time>{formatDate("2026-09-23")}</time><p>{formatNumber("125.00")}%</p><p>{bucketLabel("2026-01-01","month")}</p></div>; }
it("applies the authenticated presentation without converting original currency",()=>{
 render(<PresentationProvider preferences={{...DEFAULT_PREFERENCES,locale:"en",theme:"dark",baseCurrency:"USD",dateFormat:"MM/DD/YYYY",numberFormat:"dot-comma"}}><Sample/></PresentationProvider>);
 expect(screen.getByRole("heading")).toHaveTextContent("Home");expect(screen.getByText("Spending for Mi cuenta")).toBeInTheDocument();expect(screen.getByText("RD$12.345,0001")).toBeInTheDocument();expect(screen.getByText("09/23/2026")).toBeInTheDocument();expect(screen.getByText("125,00%")).toBeInTheDocument();expect(screen.getByText("Jan")).toBeInTheDocument();expect(document.documentElement.lang).toBe("en");expect(document.documentElement.dataset.theme).toBe("dark");
});
it("resets presentation when the authenticated owner changes",()=>{
 const view=render(<PresentationProvider key="alice" preferences={{...DEFAULT_PREFERENCES,locale:"en",theme:"dark"}}><Sample/></PresentationProvider>);
 view.rerender(<PresentationProvider key="bob" preferences={DEFAULT_PREFERENCES}><Sample/></PresentationProvider>);
 expect(screen.getByRole("heading")).toHaveTextContent("Inicio");expect(document.documentElement.lang).toBe("es");expect(document.documentElement.dataset.theme).toBe("system");expect(screen.getByText("23/09/2026")).toBeInTheDocument();
});
