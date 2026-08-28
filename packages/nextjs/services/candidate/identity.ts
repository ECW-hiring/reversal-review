import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type CandidateRecord = {
  id: number;
  idHex: string;
  hostname: string;
  platform: string;
  registeredAt: string;
  lastSeenAt: string;
  challengeId: string | null;
  displayName: string | null;
  notes: string | null;
};

type ChecklistFile = {
  candidates: CandidateRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const CHECKLIST_PATH = path.join(DATA_DIR, "candidates.json");

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

/**
 * Deterministic 32-bit unsigned ID from machine fingerprint.
 * Same PC → same ID across sessions.
 */
export function machineFingerprintToId32(fingerprint: string): number {
  const digest = createHash("sha256").update(`assessment-candidate:${fingerprint}`).digest();
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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readChecklist(): ChecklistFile {
  ensureDataDir();
  if (!fs.existsSync(CHECKLIST_PATH)) {
    return { candidates: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(CHECKLIST_PATH, "utf8")) as ChecklistFile;
  } catch {
    return { candidates: [] };
  }
}

function writeChecklist(data: ChecklistFile) {
  ensureDataDir();
  fs.writeFileSync(CHECKLIST_PATH, JSON.stringify(data, null, 2));
}

export function registerCandidate(input?: {
  displayName?: string | null;
  challengeId?: string | null;
  notes?: string | null;
}): CandidateRecord {
  const identity = getCandidateIdentity();
  const now = new Date().toISOString();
  const data = readChecklist();
  const existing = data.candidates.find(c => c.id === identity.id);

  if (existing) {
    existing.lastSeenAt = now;
    if (input?.displayName !== undefined) existing.displayName = input.displayName;
    if (input?.challengeId !== undefined) existing.challengeId = input.challengeId;
    if (input?.notes !== undefined) existing.notes = input.notes;
    writeChecklist(data);
    return existing;
  }

  const record: CandidateRecord = {
    id: identity.id,
    idHex: identity.idHex,
    hostname: identity.hostname,
    platform: identity.platform,
    registeredAt: now,
    lastSeenAt: now,
    challengeId: input?.challengeId ?? null,
    displayName: input?.displayName ?? null,
    notes: input?.notes ?? null,
  };
  data.candidates.push(record);
  writeChecklist(data);
  return record;
}

export function listCandidates(): CandidateRecord[] {
  return readChecklist().candidates.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}
