import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });

  const address = probe.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

export async function startProductionServer() {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  let output = "";
  const remember = (chunk) => {
    output = (output + chunk.toString()).slice(-4_000);
  };
  child.stdout.on("data", remember);
  child.stderr.on("data", remember);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`El servidor de producción terminó antes de iniciar.\n${output}`);
    }
    try {
      const response = await fetch(`${origin}/manifest.webmanifest`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return { child, origin };
    } catch {
      // El servidor todavía está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  child.kill();
  throw new Error(`El servidor de producción no estuvo listo a tiempo.\n${output}`);
}

export async function stopProductionServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}
