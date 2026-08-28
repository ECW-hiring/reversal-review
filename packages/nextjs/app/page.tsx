"use client";

import { useCallback, useEffect, useState } from "react";
import { EventLog } from "./components/EventLog";
import { FindingsPanel } from "./components/FindingsPanel";
import { ParticipantLens } from "./components/ParticipantLens";
import { ReconciliationView, type ReconciliationSummary } from "./components/ReconciliationView";
import { ScenarioRunner } from "./components/ScenarioRunner";
import type { LedgerEvent } from "~~/app/lib/ledgerscan";
import { CandidateIdBadge } from "~~/components/CandidateIdBadge";

const emptySummary = (): ReconciliationSummary => ({
  positionRows: [],
  attestationMismatches: 0,
  totalReversedChain: "0",
  totalReversedObserved: "0",
  totalReversedDelta: "0",
});

export default function ConsolePage() {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ReconciliationSummary>(emptySummary);
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "State fetch failed");
      const reconciliation = data.reconciliation as ReconciliationSummary;
      setSummary({
        positionRows: reconciliation.positionRows.map(r => ({
          participant: r.participant,
          displayName: r.displayName,
          onChain: String(r.onChain),
          ledgerScan: String(r.ledgerScan),
          delta: String(r.delta),
        })),
        attestationMismatches: reconciliation.attestationMismatches,
        totalReversedChain: String(reconciliation.totalReversedChain),
        totalReversedObserved: String(reconciliation.totalReversedObserved),
        totalReversedDelta: String(reconciliation.totalReversedDelta),
      });
      setEvents(data.events as LedgerEvent[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load state");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <main className="min-h-screen bg-base-300 text-base-content">
      <header className="border-b border-base-content/10 bg-base-100 px-4 py-3 flex items-start gap-4">
        <CandidateIdBadge />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reversal Review</h1>
          <p className="text-sm opacity-70">Permissioned entitlement ledger · operator console</p>
        </div>
      </header>

      {error ? (
        <div className="mx-4 mt-4 alert alert-warning text-sm">
          {error}
        </div>
      ) : null}

      <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1600px] mx-auto">
        <div className="xl:col-span-3 flex flex-col gap-4">
          <ScenarioRunner onRefresh={refresh} busy={busy} />
          <ParticipantLens />
        </div>
        <div className="xl:col-span-5 flex flex-col gap-4">
          <ReconciliationView summary={summary} />
          <EventLog events={events} />
        </div>
        <div className="xl:col-span-4">
          <FindingsPanel />
        </div>
      </div>
    </main>
  );
}
