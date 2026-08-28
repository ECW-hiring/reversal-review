"use client";

import { formatEther } from "viem";

export type ReconciliationRow = {
  participant: string;
  displayName: string;
  onChain: string;
  ledgerScan: string;
  delta: string;
};

export type ReconciliationSummary = {
  positionRows: ReconciliationRow[];
  attestationMismatches: number;
  totalReversedChain: string;
  totalReversedObserved: string;
  totalReversedDelta: string;
};

type Props = {
  summary: ReconciliationSummary;
};

const driftClass = "border-l-4 border-error bg-error/10 font-semibold text-error";

export const ReconciliationView = ({ summary }: Props) => {
  const attestationDrift = summary.attestationMismatches > 0;
  const reversedDrift = BigInt(summary.totalReversedDelta) !== 0n;

  return (
    <section className="bg-base-200 border border-base-300 rounded-lg p-4 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-3">Reconciliation</h2>
      <p className="text-sm opacity-70 mb-4">
        LedgerScan is rebuilt from genesis plus the event stream — not from live chain reads.
      </p>

      <table className="table table-sm w-full tabular-nums mb-4">
        <thead>
          <tr>
            <th>Participant</th>
            <th className="text-right">On-chain</th>
            <th className="text-right">LedgerScan</th>
            <th className="text-right">Delta</th>
          </tr>
        </thead>
        <tbody>
          {summary.positionRows.map(row => {
            const delta = BigInt(row.delta);
            const drift = delta !== 0n;
            return (
              <tr key={row.participant} className={drift ? driftClass : ""}>
                <td>
                  <div className="font-medium">{row.displayName}</div>
                  <div className="font-mono text-xs opacity-60">{row.participant.slice(0, 10)}…</div>
                </td>
                <td className="text-right font-mono">{formatEther(BigInt(row.onChain))}</td>
                <td className="text-right font-mono">{formatEther(BigInt(row.ledgerScan))}</td>
                <td className="text-right font-mono">{formatEther(delta)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-2 text-sm">
        <div className={attestationDrift ? `${driftClass} px-3 py-2 rounded` : "px-3 py-2 rounded border border-base-300"}>
          Events whose carried balance disagreed with the ledger:{" "}
          <span className="font-mono font-semibold">{summary.attestationMismatches}</span>
        </div>
        <div className={reversedDrift ? `${driftClass} px-3 py-2 rounded` : "px-3 py-2 rounded border border-base-300"}>
          <span className="font-medium">totalReversed — chain vs observed</span>
          <div className="font-mono mt-1 grid grid-cols-3 gap-2">
            <span>chain {formatEther(BigInt(summary.totalReversedChain))}</span>
            <span>observed {formatEther(BigInt(summary.totalReversedObserved))}</span>
            <span>Δ {formatEther(BigInt(summary.totalReversedDelta))}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
