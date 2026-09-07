import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import {
  startProductionServer,
  stopProductionServer,
} from "../helpers/production-server.mjs";

const managed = process.env.PWA_TEST_ORIGIN ? null : await startProductionServer();
const origin = process.env.PWA_TEST_ORIGIN ?? managed.origin;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Use an isolated local production server");
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ locale: "es-DO", viewport: { width: 390, height: 844 } });
  const manifestResponse = await context.request.get(origin + "/manifest.webmanifest");
  assert.ok(manifestResponse.ok());
  const manifest = await manifestResponse.json();
  assert.equal(manifest.start_url, "/dashboard"); assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const response = await context.request.get(origin + icon.src); assert.ok(response.ok());
    assert.ok(response.headers()["content-type"].startsWith("image/png"));
  }
  const sw = await context.request.get(origin + "/sw.js");
  assert.ok(sw.headers()["cache-control"].includes("no-store"));
  assert.equal(sw.headers()["service-worker-allowed"], "/");
  assert.equal(sw.headers()["x-content-type-options"], "nosniff");
  assert.ok(!(await sw.text()).includes("__PWA_VERSION__"));
  const offline = await context.request.get(origin + "/pwa/offline.html");
  assert.ok(offline.headers()["content-security-policy"].includes("default-src 'none'"));
  const page = await context.newPage(); const errors = []; page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(origin + "/dashboard");
  assert.equal(new URL(page.url()).pathname, "/auth/sign-in", "Installed start route must remain protected");
  assert.ok(response.headers()["cache-control"].includes("no-store"), "Authenticated presentation must not use the HTTP cache");
  assert.equal(await page.locator('link[rel="manifest"]').getAttribute("href"), "/manifest.webmanifest");
  assert.ok((await page.locator('meta[name="viewport"]').getAttribute("content")).includes("viewport-fit=cover"));
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 20_000 });
  const cached = await page.evaluate(async () => {
    const paths = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
    }
    return paths.sort();
  });
  assert.deepEqual(cached, ["/brand/pagato-mark.svg", "/pwa/manrope-latin.woff2", "/pwa/offline.css", "/pwa/offline.html", "/pwa/offline.js"]);
  await context.setOffline(true); await page.reload();
  await page.getByRole("heading", { name: "Estás sin conexión" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await context.setOffline(false); await page.getByRole("button", { name: "Volver a intentar" }).click();
  assert.equal(new URL(page.url()).pathname, "/auth/sign-in");
  assert.deepEqual(errors, []);
  console.log("OK: Next.js producción; manifest/iconos/cabeceras CSP y no-store; inicio protegido, registro automático del worker, caché pública exacta y pantalla offline/reintento sin errores de navegador.");
} finally {
  await browser?.close();
  await stopProductionServer(managed?.child);
}
