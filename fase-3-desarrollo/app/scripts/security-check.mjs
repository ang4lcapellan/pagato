import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repository = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: repository, encoding: "utf8" }).split("\0").filter(Boolean);
const findings = [];
const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["OpenAI-style API key", /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
];

for (const file of files) {
  if (/(^|\/)(?:node_modules|\.next)\//.test(file)) continue;
  if (/(^|\/)\.env(?!\.example$)/.test(file)) findings.push({ file, kind: "tracked environment file" });
  let contents;
  try { contents = readFileSync(resolve(repository, file), "utf8"); } catch { continue; }
  for (const [kind, pattern] of secretPatterns) if (pattern.test(contents)) findings.push({ file, kind });

  for (const match of contents.matchAll(/postgres(?:ql)?:\/\/([^:\s"'<>]+):([^@\s"'<>]+)@([^/:\s"'<>]+)/gi)) {
    const user = match[1].toUpperCase(), password = match[2].toUpperCase(), host = match[3].toLowerCase();
    const placeholder = ["USER", "USERNAME"].includes(user) && ["PASSWORD", "PASS"].includes(password);
    const localTestFixture = ["localhost", "127.0.0.1", "::1"].includes(host) && user === "TEST" && password === "TEST";
    if (!placeholder && !localTestFixture) findings.push({ file, kind: "database credentials" });
  }
}

if (findings.length) {
  console.error("Potential secrets detected (values intentionally hidden):");
  for (const finding of findings) console.error("- " + finding.file + ": " + finding.kind);
  process.exit(1);
}

console.log("Secret scan passed: " + files.length + " versioned or pending files checked; no secret values printed.");
