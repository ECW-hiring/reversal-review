import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";

/** Stable machine fingerprint from host OS (physical PC / VM id). */
export function getRawMachineFingerprint(): string {
  for (const machineIdPath of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
    try {
      const id = fs.readFileSync(machineIdPath, "utf8").trim();
      if (id) return id;
    } catch {
      // try next path
    }
  }

  const fallback = [os.hostname(), os.platform(), os.arch(), os.cpus()[0]?.model ?? "cpu"].join("|");
  return createHash("sha256").update(fallback).digest("hex");
}

/** Deterministic 32-bit unsigned ID from machine fingerprint. Same PC → same ID. */
export function machineFingerprintToId32(fingerprint: string): number {
  const digest = createHash("sha256").update(`reversal-review-candidate:${fingerprint}`).digest();
  return digest.readUInt32BE(0);
}

export function formatIdHex(id: number): string {
  return `0x${(id >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
}

export function getCandidateIdentity() {
  const fingerprint = getRawMachineFingerprint();
  const id = machineFingerprintToId32(fingerprint);
  return {
    id,
    idHex: formatIdHex(id),
    hostname: os.hostname(),
    platform: `${os.platform()}-${os.arch()}`,
  };
}
