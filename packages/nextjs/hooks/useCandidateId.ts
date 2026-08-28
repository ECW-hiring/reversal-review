"use client";

import { useEffect, useState } from "react";

export type CandidateId = {
  id: number;
  idHex: string;
  hostname?: string;
};

export function useCandidateId() {
  const [data, setData] = useState<CandidateId | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/candidate/id", { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then((json: CandidateId) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}
