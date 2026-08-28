#!/usr/bin/env node
/**
 * npm start — anvil + deploy + seed + Next.js console
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOUNDRY = path.join(ROOT, "packages/foundry");
const RPC = "http://127.0.0.1:8545";
const ANVIL_DEPLOYER = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const children = [];

function run(cmd, args, opts = {}) {
  const c = spawn(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...opts.env },
  });
  children.push(c);
  return c;
}

function runSync(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    stdio: "inherit",
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, ...opts.env },
  });
}

async function portFree(port) {
  return new Promise(resolve => {
    const s = net.createServer();
    s.unref();
    s.on("error", () => resolve(false));
    s.listen(port, () => s.close(() => resolve(true)));
  });
}

async function waitRpc(ms = 60_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (r.ok) return;
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error("Anvil did not start");
}

function shutdown(code = 0) {
  for (const c of [...children].reverse()) {
    try {
      c.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => {
  console.log("\n[dev] Shutting down…");
  shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));

async function main() {
  if (!(await portFree(8545))) {
    console.log("[dev] Stopping existing anvil on 8545…");
    runSync("pkill", ["-f", "anvil --host"]);
    await new Promise(r => setTimeout(r, 800));
  }

  if (!fs.existsSync(path.join(FOUNDRY, "lib/forge-std"))) {
    console.log("[dev] Installing forge-std…");
    runSync("forge", ["install", "foundry-rs/forge-std", "--no-commit"], { cwd: FOUNDRY });
  }

  console.log("[dev] Starting anvil…");
  run("anvil", ["--host", "127.0.0.1", "--port", "8545"], { cwd: FOUNDRY });

  await waitRpc();

  console.log("[dev] Deploying EntitlementLedger…");
  const deploy = runSync(
    "forge",
    [
      "script",
      "script/Deploy.s.sol:Deploy",
      "--rpc-url",
      RPC,
      "--broadcast",
      "--private-key",
      ANVIL_DEPLOYER,
      "-vv",
    ],
    { cwd: FOUNDRY },
  );
  if (deploy.status !== 0) process.exit(deploy.status ?? 1);

  const deployment = JSON.parse(
    fs.readFileSync(path.join(ROOT, "packages/nextjs/app/lib/deployment.json"), "utf8"),
  );

  console.log("[dev] Seeding deterministic transfer…");
  runSync(
    "forge",
    [
      "script",
      "script/Seed.s.sol:Seed",
      "--rpc-url",
      RPC,
      "--broadcast",
      "--private-key",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "-vv",
    ],
    {
      cwd: FOUNDRY,
      env: { ...process.env, LEDGER_ADDRESS: deployment.ledger },
    },
  );

  const port = (await portFree(3000)) ? 3000 : 3005;
  if (port !== 3000) {
    console.log(`[dev] Port 3000 busy — console at http://localhost:${port}`);
  } else {
    console.log("[dev] Console at http://localhost:3000");
  }

  console.log("[dev] Press Ctrl+C to stop.\n");
  const web = run("npm", ["run", "dev", "-w", "@reversal/nextjs", "--", "-p", String(port)], {
    env: { PORT: String(port) },
  });
  web.on("exit", code => shutdown(code ?? 0));
}

main().catch(err => {
  console.error(err);
  shutdown(1);
});
