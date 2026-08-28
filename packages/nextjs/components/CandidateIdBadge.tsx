"use client";

import { useCandidateId } from "~~/hooks/useCandidateId";

type Props = {
  className?: string;
};

/** Always-visible 32-bit candidate ID (top-left). */
export const CandidateIdBadge = ({ className = "" }: Props) => {
  const { data, error } = useCandidateId();

  const label = error ? "ID unavailable" : data ? data.idHex : "ID…";

  return (
    <div
      className={`flex flex-col justify-center shrink-0 min-w-0 ${className}`}
      title={data ? `32-bit candidate ID (decimal ${data.id})` : "Loading candidate ID"}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-60 leading-none">Candidate ID</span>
      <span className="font-mono text-sm font-semibold leading-tight truncate">{label}</span>
    </div>
  );
};
