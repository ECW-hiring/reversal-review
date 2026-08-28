"use client";

import { useEffect, useState } from "react";

type CandidateIdResponse = {
  id: number;
  idHex: string;
  hostname?: string;
};

/**
 * Always-visible 32-bit candidate ID (top-left). Fetched from backend.
 */
export const CandidateIdBadge = () => {
  const [data, setData] = useState<CandidateIdResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/candidate/id", { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then((json: CandidateIdResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = error ? "ID unavailable" : data ? data.idHex : "ID…";

  return (
    <div
      className="flex flex-col justify-center ml-2 sm:ml-3 mr-2 shrink-0 min-w-0"
      title={data ? `32-bit candidate ID (decimal ${data.id}) · ${data.hostname ?? ""}` : "Loading candidate ID"}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-60 leading-none">Candidate ID</span>
      <span className="font-mono text-sm font-semibold leading-tight truncate">{label}</span>
    </div>
  );
};
