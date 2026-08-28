"use client";

import { useCallback, useEffect, useState } from "react";
import { exportFindingsPdf } from "~~/app/lib/exportFindingsPdf";
import { useCandidateId } from "~~/hooks/useCandidateId";

export type Finding = {
  id: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  location: string;
  impact: string;
  confirmation: string;
};

type Stored = {
  candidateName: string;
  findings: Finding[];
  unchecked: string;
};

const STORAGE_KEY = "reversal-review-findings";

const emptyFinding = (): Finding => ({
  id: crypto.randomUUID(),
  title: "",
  severity: "Medium",
  location: "",
  impact: "",
  confirmation: "",
});

export const FindingsPanel = () => {
  const { data: candidateId, error: idError } = useCandidateId();
  const [candidateName, setCandidateName] = useState("");
  const [findings, setFindings] = useState<Finding[]>([emptyFinding()]);
  const [unchecked, setUnchecked] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Stored;
      setCandidateName(parsed.candidateName ?? "");
      if (parsed.findings?.length) setFindings(parsed.findings);
      setUnchecked(parsed.unchecked ?? "");
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((name: string, nextFindings: Finding[], nextUnchecked: string) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ candidateName: name, findings: nextFindings, unchecked: nextUnchecked }),
    );
  }, []);

  const updateFindings = (next: Finding[]) => {
    setFindings(next);
    persist(candidateName, next, unchecked);
  };

  const updateUnchecked = (value: string) => {
    setUnchecked(value);
    persist(candidateName, findings, value);
  };

  const updateCandidateName = (value: string) => {
    setCandidateName(value);
    persist(value, findings, unchecked);
  };

  const addFinding = () => updateFindings([...findings, emptyFinding()]);

  const patchFinding = (id: string, patch: Partial<Finding>) => {
    updateFindings(findings.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFinding = (id: string) => updateFindings(findings.filter(f => f.id !== id));

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = findings.findIndex(f => f.id === dragId);
    const to = findings.findIndex(f => f.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...findings];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    updateFindings(next);
    setDragId(null);
  };

  const exportPdf = () => {
    if (!candidateId) {
      alert(idError ? "Candidate ID unavailable — refresh and try again." : "Loading candidate ID…");
      return;
    }
    exportFindingsPdf({
      candidateIdHex: candidateId.idHex,
      candidateIdDecimal: candidateId.id,
      candidateName,
      findings,
      unchecked,
    });
  };

  return (
    <section className="bg-base-200 border border-base-300 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Findings</h2>
        <button type="button" className="btn btn-sm btn-primary" onClick={exportPdf} disabled={!candidateId}>
          Export PDF
        </button>
      </div>
      <p className="text-sm opacity-70">
        Rank findings by severity — drag rows to reorder. PDF export includes your candidate ID at the top.
      </p>

      <label className="text-sm font-medium">Your name (used in export filename)</label>
      <input
        className="input input-sm input-bordered w-full"
        placeholder="Jane Doe"
        value={candidateName}
        onChange={e => updateCandidateName(e.target.value)}
      />

      <div className="flex flex-col gap-4 max-h-[32rem] overflow-y-auto">
        {findings.map((f, index) => (
          <div
            key={f.id}
            draggable
            onDragStart={() => setDragId(f.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(f.id)}
            className="border border-base-300 rounded-lg p-3 bg-base-100 cursor-grab active:cursor-grabbing"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-mono opacity-60">Finding #{index + 1}</span>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => removeFinding(f.id)}>
                Remove
              </button>
            </div>
            <label className="text-xs opacity-70">Title</label>
            <input
              className="input input-sm input-bordered w-full mb-3"
              placeholder="One-line summary"
              value={f.title}
              onChange={e => patchFinding(f.id, { title: e.target.value })}
            />
            <label className="text-xs opacity-70">Severity</label>
            <select
              className="select select-sm select-bordered w-full mb-3"
              value={f.severity}
              onChange={e => patchFinding(f.id, { severity: e.target.value as Finding["severity"] })}
            >
              {(["Critical", "High", "Medium", "Low"] as const).map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="text-xs opacity-70">File:line</label>
            <input
              className="input input-sm input-bordered w-full mb-3 font-mono text-xs"
              placeholder="EntitlementLedger.sol:71"
              value={f.location}
              onChange={e => patchFinding(f.id, { location: e.target.value })}
            />
            <label className="text-xs opacity-70">What breaks</label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full mb-3"
              placeholder="Operational or security impact in practice"
              rows={2}
              value={f.impact}
              onChange={e => patchFinding(f.id, { impact: e.target.value })}
            />
            <label className="text-xs opacity-70">How to confirm</label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              placeholder="Test, scenario, or reconciliation check that proves it"
              rows={2}
              value={f.confirmation}
              onChange={e => patchFinding(f.id, { confirmation: e.target.value })}
            />
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-sm btn-outline" onClick={addFinding}>
        Add another finding
      </button>

      <label className="text-sm font-medium mt-2">What I did not check, and why</label>
      <textarea
        className="textarea textarea-bordered w-full"
        rows={4}
        placeholder="This field is valued in review — please be honest."
        value={unchecked}
        onChange={e => updateUnchecked(e.target.value)}
      />
    </section>
  );
};
