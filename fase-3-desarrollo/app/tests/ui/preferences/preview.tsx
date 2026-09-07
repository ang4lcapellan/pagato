import { hydrateRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@/app/globals.css";
import { Preview } from "./fixture";
hydrateRoot(document.getElementById("root")!,<Preview search={window.location.search}/>,{onRecoverableError(error){console.error("Hydration failed",error)}});
