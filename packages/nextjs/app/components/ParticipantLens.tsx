"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import deployment from "~~/app/lib/deployment.json";
import { PARTICIPANTS, shortAddress } from "~~/app/lib/participants";

type ParticipantRow = {
  label: string;
  address: string;
  publicPosition: string;
};

export const ParticipantLens = () => {
  const [viewer, setViewer] = useState<string>(deployment.deskNorth);
  const [rows, setRows] = useState<ParticipantRow[]>([]);

  useEffect(() => {
    fetch(`/api/participant?viewer=${viewer}`)
      .then(r => r.json())
      .then(data => setRows(data.participants ?? []))
      .catch(() => setRows([]));
  }, [viewer]);

  return (
    <section className="bg-base-200 border border-base-300 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">Participant lens</h2>
      <p className="text-sm opacity-70 mb-3">Public chain visibility from a participant&apos;s perspective</p>
      <select
        className="select select-sm select-bordered w-full mb-3"
        value={viewer}
        onChange={e => setViewer(e.target.value)}
      >
        {PARTICIPANTS.map(o => (
          <option key={o.address} value={o.address}>
            View as {o.displayName}
          </option>
        ))}
      </select>
      <ul className="text-sm space-y-2">
        {rows.map(r => (
          <li key={r.address} className="flex justify-between gap-2 border-b border-base-300 pb-1">
            <span>
              <span className="font-medium">{r.label}</span>
              <span className="block font-mono text-xs opacity-60">{shortAddress(r.address)}</span>
            </span>
            <span className="tabular-nums font-mono">{formatEther(BigInt(r.publicPosition))}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
