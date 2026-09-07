import { renderToString } from "react-dom/server";
import { DashboardPreview } from "./fixture-page";

export function renderPreview(mode: string | null) {
  return renderToString(<DashboardPreview mode={mode} />);
}
