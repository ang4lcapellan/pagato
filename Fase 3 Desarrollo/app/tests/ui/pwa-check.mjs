import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const source = await readFile("src/modules/pwa/worker.js", "utf8");
const allowed = ["/pwa/offline.html", "/pwa/offline.css", "/pwa/offline.js", "/pwa/manrope-latin.woff2", "/brand/pagato-mark.svg"].sort();
const mime = { html: "text/html; charset=utf-8", css: "text/css", js: "application/javascript", svg: "image/svg+xml", woff2: "font/woff2", png: "image/png" };
const publicFiles = new Map(await Promise.all([...allowed, ...["icon-192", "icon-512", "icon-maskable-512", "apple-touch-icon"].map(name => `/pwa/${name}.png`)].map(async path => [path, await readFile(resolve("public", path.slice(1)))])));
let version = "browser-a", failAsset = false;
const publicCookies = [];
let posts = 0;
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (process.env.PWA_DEBUG === "1") console.log("fixture request:", path);
  if (process.env.PWA_DEBUG === "1") res.on("finish", () => console.log("fixture response:", path, res.statusCode));
  res.setHeader("Cache-Control", "no-store");
  if (path === "/sw.js") { res.setHeader("Content-Type", mime.js); return res.end(source.replaceAll("__PWA_VERSION__", version)); }
  if (allowed.includes(path) || /^\/pwa\/(icon-192|icon-512|icon-maskable-512|apple-touch-icon)\.png$/.test(path)) {
    if (req.headers["sec-fetch-dest"] === "empty") publicCookies.push(req.headers.cookie ?? "");
    if (failAsset && path === "/pwa/offline.css") { res.writeHead(503); return res.end("unavailable"); }
    res.setHeader("Content-Type", mime[path.split(".").pop()]);
    return res.end(publicFiles.get(path));
  }
  if (req.method === "POST") posts++;
  if (path.startsWith("/api/") || req.headers.rsc) { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ private: "synthetic-secret" })); }
  res.setHeader("Content-Type", mime.html);
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>Private fixture</h1><input aria-label="Unsaved form" value="draft"><p>synthetic-secret</p></body></html>');
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
console.log("PWA: servidor de prueba preparado.");
let browser;
try {
  browser = await chromium.launch({ timeout: 20_000 });
  console.log("PWA: Chromium iniciado.");
  const context = await browser.newContext({ locale: "es-DO", viewport: { width: 390, height: 844 } });
  if (process.env.PWA_DEBUG === "1") context.on("console", message => console.log("browser:", message.text()));
  context.setDefaultTimeout(15_000);
  await context.addCookies([{ name: "fixture-session", value: "synthetic-session", url: origin }]);
  const page = await context.newPage();
  await page.goto(origin + "/dashboard");
  await page.evaluate(async () => { await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }); });
  if (process.env.PWA_DEBUG === "1") await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); console.log("worker:", reg?.installing?.state, reg?.active?.state); reg?.installing?.addEventListener("statechange", event => console.log("worker state:", event.target.state)); });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller)).catch(async error => {
    console.log("Estado del worker:", await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return { installing: reg?.installing?.state, waiting: reg?.waiting?.state, active: reg?.active?.state, caches: await caches.keys() }; }));
    throw error;
  });
  console.log("OK: service worker instalado y controlando la página.");
  assert.ok(publicCookies.length >= 5);
  assert.ok(publicCookies.every(value => value === ""), "Precache must not send session cookies");
  await page.goto(origin + "/transactions?account=fixture");
  await page.evaluate(async () => { await fetch("/api/auth/get-session"); await fetch("/transactions?_rsc=1", { headers: { RSC: "1" } }); await fetch("/transactions", { method: "POST", body: "private" }); });
  async function assertSafeCache() {
    const entries = await page.evaluate(async () => {
      const result = [];
      for (const key of await caches.keys()) if (key.startsWith("pagato-public-")) {
        const cache = await caches.open(key);
        for (const req of await cache.keys()) result.push(new URL(req.url).pathname);
      }
      return result.sort();
    });
    assert.deepEqual(entries, allowed);
  }
  await assertSafeCache();
  console.log("OK: tráfico privado online fuera de caché.");
  await context.setOffline(true);
  for (const input of [{ path: "/api/auth/get-session" }, { path: "/transactions?_rsc=1", headers: { RSC: "1" } }, { path: "/transactions", method: "POST" }]) {
    assert.equal(await page.evaluate(async ({ path, ...init }) => { try { await fetch(path, init); return false; } catch { return true; } }, input), true, "Private requests must fail, not return cached HTML");
  }
  await page.reload();
  await page.getByRole("heading", { name: "Estás sin conexión" }).waitFor();
  console.log("OK: navegación sin conexión y peticiones privadas sin fallback.");
  assert.ok(!(await page.textContent("body")).includes("synthetic-secret"));
  await mkdir("test-results/pwa", { recursive: true });
  for (const width of [1440, 390, 320]) for (const colorScheme of ["light", "dark"]) {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const bounds = await page.getByRole("button", { name: "Volver a intentar" }).boundingBox(); assert.ok(bounds.height >= 44);
    await page.screenshot({ path: `test-results/pwa/offline-${colorScheme}-${width}.png`, fullPage: true });
  }
  await context.setOffline(false); await page.getByRole("button", { name: "Volver a intentar" }).click();
  await page.getByRole("heading", { name: "Private fixture" }).waitFor();
  assert.equal(posts, 1, "No background replay after reconnect");
  const other = await context.newPage(); await other.goto(origin + "/budgets");
  await other.getByLabel("Unsaved form").fill("keep this draft");
  await page.evaluate(async () => { await caches.open("unrelated-cache"); });
  version = "browser-b";
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
  await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), { timeout: 15_000 }).toBe(true);
  console.log("OK: actualización esperando confirmación.");
  assert.ok((await page.evaluate(() => caches.keys())).includes("pagato-public-browser-a"));
  await page.evaluate(async () => { (await navigator.serviceWorker.getRegistration()).waiting.postMessage({ type: "ACTIVATE_UPDATE" }); });
  await expect.poll(() => page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return reg.active?.state === "activated" && !reg.waiting && !(await caches.keys()).includes("pagato-public-browser-a"); }), { timeout: 15_000 }).toBe(true);
  assert.ok((await page.evaluate(() => caches.keys())).includes("unrelated-cache"));
  assert.equal(await other.getByLabel("Unsaved form").inputValue(), "keep this draft");
  await assertSafeCache();
  // Failed release must neither replace the active worker nor erase its public fallback.
  version = "browser-c"; failAsset = true;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    window.failedInstall = false;
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker.addEventListener("statechange", () => { if (worker.state === "redundant") window.failedInstall = true; });
    }, { once: true });
    await reg.update();
  });
  await page.waitForFunction(() => window.failedInstall);
  assert.ok((await page.evaluate(() => caches.keys())).includes("pagato-public-browser-b"));
  assert.ok(!(await page.evaluate(() => caches.keys())).includes("pagato-public-browser-c"));
  await context.setOffline(true); await page.reload(); await page.getByRole("heading", { name: "Estás sin conexión" }).waitFor();
  for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["icon-maskable-512", 512], ["apple-touch-icon", 180]]) {
    const metadata = await sharp(`public/pwa/${name}.png`).metadata(); assert.equal(metadata.width, size); assert.equal(metadata.height, size);
  }
  console.log("OK: worker real en Chromium; caché pública sin cookies/datos privados; APIs/RSC/POST sin caché ni reenvío; offline responsive claro/oscuro; actualización voluntaria, borrador intacto en otra pestaña y recuperación ante versión fallida; iconos.");
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
