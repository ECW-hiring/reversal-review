import { parseEther } from "viem";
import deployment from "./deployment.json";

export type Participant = {
  key: string;
  displayName: string;
  address: `0x${string}`;
};

export const PARTICIPANTS: Participant[] = [
  { key: "deskNorth", displayName: "Desk North", address: deployment.deskNorth as `0x${string}` },
  { key: "deskSouth", displayName: "Desk South", address: deployment.deskSouth as `0x${string}` },
  { key: "deskEast", displayName: "Desk East", address: deployment.deskEast as `0x${string}` },
  { key: "deskWest", displayName: "Desk West", address: deployment.deskWest as `0x${string}` },
  { key: "deskCentral", displayName: "Desk Central", address: deployment.deskCentral as `0x${string}` },
];

/** Constructor genesis — LedgerScan baseline, not live chain reads. */
export function genesisPositions(): Record<string, bigint> {
  return {
    [deployment.deskNorth.toLowerCase()]: parseEther("1000000"),
    [deployment.deskSouth.toLowerCase()]: parseEther("750000"),
    [deployment.deskEast.toLowerCase()]: parseEther("500000"),
    [deployment.deskWest.toLowerCase()]: parseEther("400000"),
    [deployment.deskCentral.toLowerCase()]: parseEther("350000"),
  };
}

export function displayNameForAddress(address: string): string {
  const hit = PARTICIPANTS.find(p => p.address.toLowerCase() === address.toLowerCase());
  return hit?.displayName ?? address.slice(0, 6);
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
