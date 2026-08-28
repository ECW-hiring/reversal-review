import { type Hex, decodeEventLog, keccak256, toHex } from "viem";
import { entitlementLedgerAbi } from "./ledgerAbi";

export type LedgerEvent = {
  blockNumber: bigint;
  logIndex: number;
  name: string;
  args: Record<string, unknown>;
};

export type LedgerScanState = {
  positions: Record<string, bigint>;
  observedReversedTotal: bigint;
  attestationMismatches: number;
  processedEvents: number;
};

const ZERO = 0n;

/** Genesis positions from constructor — never from live chain state. */
export function createGenesisLedgerScan(genesisPositions: Record<string, bigint>): LedgerScanState {
  const positions: Record<string, bigint> = {};
  for (const [addr, bal] of Object.entries(genesisPositions)) {
    positions[addr.toLowerCase()] = bal;
  }
  return {
    positions,
    observedReversedTotal: ZERO,
    attestationMismatches: 0,
    processedEvents: 0,
  };
}

export function createEmptyLedgerScan(participantAddresses: string[]): LedgerScanState {
  const positions: Record<string, bigint> = {};
  for (const addr of participantAddresses) {
    positions[addr.toLowerCase()] = ZERO;
  }
  return {
    positions,
    observedReversedTotal: ZERO,
    attestationMismatches: 0,
    processedEvents: 0,
  };
}

function balanceOf(state: LedgerScanState, participant: string): bigint {
  return state.positions[participant.toLowerCase()] ?? ZERO;
}

function attestationMismatch(
  computedFrom: bigint,
  computedTo: bigint,
  amount: bigint,
  isReversal: boolean,
  carriedFrom: bigint,
  carriedTo: bigint,
): boolean {
  const expectedFrom = isReversal ? computedFrom + amount : computedFrom - amount;
  const expectedTo = isReversal ? computedTo - amount : computedTo + amount;
  return carriedFrom !== expectedFrom || carriedTo !== expectedTo;
}

/**
 * LedgerScan — off-chain mirror rebuilt from the event stream alone.
 * Accumulates deltas; never assigns absolute balances from events.
 */
export function applyEvent(state: LedgerScanState, event: LedgerEvent): LedgerScanState {
  const next: LedgerScanState = {
    positions: { ...state.positions },
    observedReversedTotal: state.observedReversedTotal,
    attestationMismatches: state.attestationMismatches,
    processedEvents: state.processedEvents + 1,
  };

  if (event.name === "TransferExecuted") {
    const from = String(event.args.from).toLowerCase();
    const to = String(event.args.to).toLowerCase();
    const amount = BigInt(event.args.amount as bigint);
    const carriedFrom = BigInt(event.args.fromBalance as bigint);
    const carriedTo = BigInt(event.args.toBalance as bigint);

    const computedFrom = balanceOf(state, from);
    const computedTo = balanceOf(state, to);

    if (attestationMismatch(computedFrom, computedTo, amount, false, carriedFrom, carriedTo)) {
      next.attestationMismatches += 1;
    }

    next.positions[from] = computedFrom - amount;
    next.positions[to] = computedTo + amount;
  }

  if (event.name === "TransferReversed") {
    const from = String(event.args.from).toLowerCase();
    const to = String(event.args.to).toLowerCase();
    const amount = BigInt(event.args.amount as bigint);
    const carriedFrom = BigInt(event.args.fromBalance as bigint);
    const carriedTo = BigInt(event.args.toBalance as bigint);

    const computedFrom = balanceOf(state, from);
    const computedTo = balanceOf(state, to);

    if (attestationMismatch(computedFrom, computedTo, amount, true, carriedFrom, carriedTo)) {
      next.attestationMismatches += 1;
    }

    next.positions[from] = computedFrom + amount;
    next.positions[to] = computedTo - amount;
    next.observedReversedTotal += amount;
  }

  return next;
}

export function replayEvents(baseline: LedgerScanState, events: LedgerEvent[]): LedgerScanState {
  return events.reduce(applyEvent, baseline);
}

export function parseLedgerLog(log: {
  blockNumber: bigint;
  logIndex: number;
  topics: Hex[];
  data: Hex;
}): LedgerEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: entitlementLedgerAbi,
      topics: log.topics,
      data: log.data,
    });
    return {
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      name: decoded.eventName,
      args: decoded.args as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

export function transferId(label: string): Hex {
  return keccak256(toHex(label));
}

export type ReconciliationRow = {
  participant: string;
  displayName: string;
  onChain: bigint;
  ledgerScan: bigint;
  delta: bigint;
};

export type ReconciliationSummary = {
  positionRows: ReconciliationRow[];
  attestationMismatches: number;
  totalReversedChain: bigint;
  totalReversedObserved: bigint;
  totalReversedDelta: bigint;
};

export function reconcile(
  onChain: Record<string, bigint>,
  ledgerScan: LedgerScanState,
  displayNameFor: (address: string) => string,
): ReconciliationSummary {
  const keys = new Set([...Object.keys(onChain), ...Object.keys(ledgerScan.positions)]);
  const positionRows = [...keys].map(participant => {
    const chain = onChain[participant] ?? ZERO;
    const scan = ledgerScan.positions[participant.toLowerCase()] ?? ZERO;
    return {
      participant,
      displayName: displayNameFor(participant),
      onChain: chain,
      ledgerScan: scan,
      delta: chain - scan,
    };
  });

  return {
    positionRows,
    attestationMismatches: ledgerScan.attestationMismatches,
    totalReversedChain: ZERO,
    totalReversedObserved: ledgerScan.observedReversedTotal,
    totalReversedDelta: ZERO,
  };
}

export function finalizeReconciliation(
  summary: ReconciliationSummary,
  chainTotalReversed: bigint,
): ReconciliationSummary {
  return {
    ...summary,
    totalReversedChain: chainTotalReversed,
    totalReversedDelta: chainTotalReversed - summary.totalReversedObserved,
  };
}
