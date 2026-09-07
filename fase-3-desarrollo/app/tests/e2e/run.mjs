import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  startProductionServer,
  stopProductionServer,
} from "../helpers/production-server.mjs";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const managed = externalBaseUrl ? null : await startProductionServer();
const baseUrl = externalBaseUrl ?? managed.origin;
let runner;

try {
  runner = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    {
      cwd: process.cwd(),
      env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
      stdio: "inherit",
      windowsHide: true,
    },
  );

  const [code] = await once(runner, "exit");
  process.exitCode = typeof code === "number" ? code : 1;
} finally {
  if (runner && runner.exitCode === null) runner.kill();
  await stopProductionServer(managed?.child);
}
