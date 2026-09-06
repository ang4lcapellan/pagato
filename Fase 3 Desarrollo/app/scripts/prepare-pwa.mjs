import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = path => resolve(root, path);
await mkdir(file("public/pwa"), { recursive: true });
const mark = await readFile(file("public/brand/pagato-mark.svg"));
for (const size of [180, 192, 512]) {
  await sharp(mark).resize(size, size).flatten({ background: "#F1FBF7" }).png().toFile(file(`public/pwa/${size === 180 ? "apple-touch-icon" : `icon-${size}`}.png`));
}
// Keep the entire mark inside the central maskable safe circle.
await sharp({ create: { width: 512, height: 512, channels: 3, background: "#F1FBF7" } })
  .composite([{ input: await sharp(mark).resize(280, 280).png().toBuffer(), gravity: "centre" }])
  .png().toFile(file("public/pwa/icon-maskable-512.png"));
await copyFile(file("node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2"), file("public/pwa/manrope-latin.woff2"));
await copyFile(file("node_modules/@fontsource-variable/manrope/LICENSE"), file("public/pwa/MANROPE-LICENSE.txt"));

const hash = createHash("sha256");
async function include(directory) {
  for (const entry of (await readdir(file(directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await include(path);
    else if (entry.isFile() && path !== "public/sw.js") { hash.update(path); hash.update(await readFile(file(path))); }
  }
}
// Only source/public build inputs: never read .env, user data, logs or .next.
await include("src");
await include("public");
for (const path of ["package-lock.json", "next.config.ts", "scripts/prepare-pwa.mjs"]) hash.update(await readFile(file(path)));
const version = hash.digest("hex").slice(0, 20);
const worker = (await readFile(file("src/modules/pwa/worker.js"), "utf8")).replaceAll("__PWA_VERSION__", version);
await writeFile(file("public/sw.js"), worker);
console.log(`PWA preparada: ${version} (solo recursos públicos).`);
