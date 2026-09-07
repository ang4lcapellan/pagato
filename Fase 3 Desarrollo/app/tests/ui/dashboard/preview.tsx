import { hydrateRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@/app/globals.css";
import { DashboardPreview } from "./fixture-page";
const mode = new URLSearchParams(window.location.search).get("mode");
hydrateRoot(document.getElementById("root")!, <DashboardPreview mode={mode} />, {
  onRecoverableError(error) { console.error("Dashboard hydration failed", error); },
});
