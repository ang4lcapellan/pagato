import { ImageResponse } from "next/og";

export const alt = "PagaTo' — Finanzas personales claras";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111513", color: "#F4FAF8", padding: 80 }}>
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", border: "2px solid #29433C", borderRadius: 48, padding: "64px 72px", background: "#171D1A" }}>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}><span style={{ color: "#63D7B5", fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>FINANZAS PERSONALES</span><strong style={{ marginTop: 24, fontSize: 86, lineHeight: 1, letterSpacing: -4 }}>PagaTo&apos;</strong><span style={{ marginTop: 28, color: "#C8D7D1", fontSize: 36, lineHeight: 1.25 }}>Tu dinero, más claro y bajo control.</span></div>
      <div style={{ width: 190, height: 190, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 52, background: "#0B6B58" }}><div style={{ width: 108, height: 78, display: "flex", border: "10px solid #E9FFF8", borderRadius: 20, position: "relative" }}><span style={{ width: 60, height: 38, display: "flex", borderRadius: 19, background: "#27C7A2", position: "absolute", right: -26, top: 10 }} /></div></div>
    </div>
  </div>, size);
}
