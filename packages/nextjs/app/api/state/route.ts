import { NextResponse } from "next/server";
import { fetchLedgerLogs, fetchOnChainPositions, fetchTotalReversed } from "~~/app/lib/ledgerServer";
import {
  createGenesisLedgerScan,
  finalizeReconciliation,
  parseLedgerLog,
  reconcile,
  replayEvents,
  type LedgerEvent,
} from "~~/app/lib/ledgerscan";
import { displayNameForAddress, genesisPositions } from "~~/app/lib/participants";

function jsonSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export async function GET() {
  try {
    const onChain = await fetchOnChainPositions();
    const chainTotalReversed = await fetchTotalReversed();
    const logs = await fetchLedgerLogs();
    const events: LedgerEvent[] = [];
    for (const log of logs) {
      const parsed = parseLedgerLog({
        blockNumber: log.blockNumber ?? 0n,
        logIndex: log.logIndex ?? 0,
        topics: log.topics,
        data: log.data,
      });
      if (parsed) events.push(parsed);
    }
    events.sort((a, b) => {
      if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex;
      return Number(a.blockNumber - b.blockNumber);
    });

    const ledgerScan = replayEvents(createGenesisLedgerScan(genesisPositions()), events);
    const summary = finalizeReconciliation(
      reconcile(onChain, ledgerScan, displayNameForAddress),
      chainTotalReversed,
    );

    return NextResponse.json(jsonSafe({ onChain, ledgerScan, events, reconciliation: summary }));
  } catch (error) {
    console.error("[state]", error);
    return NextResponse.json({ error: "Chain unavailable — run npm start" }, { status: 503 });
  }
}
