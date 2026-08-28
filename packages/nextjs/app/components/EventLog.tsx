"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEther } from "viem";
import { createGenesisLedgerScan, replayEvents, type LedgerEvent } from "~~/app/lib/ledgerscan";
import { displayNameForAddress, genesisPositions, shortAddress } from "~~/app/lib/participants";

type Props = {
  events: LedgerEvent[];
};

function formatArg(key: string, value: unknown): string {
  if (typeof value === "bigint" || (typeof value === "string" && /^\d+$/.test(value) && key.toLowerCase().includes("amount"))) {
    const wei = BigInt(value as bigint | string);
    return `${formatEther(wei)} ENT`;
  }
  if (typeof value === "string" && value.startsWith("0x") && value.length === 42) {
    return `${displayNameForAddress(value)} (${shortAddress(value)})`;
  }
  if (typeof value === "string" && value.startsWith("0x") && value.length > 20) {
    return shortAddress(value);
  }
  return String(value);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs px-1"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export const EventLog = ({ events }: Props) => {
  const [step, setStep] = useState(events.length);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setStep(events.length);
    setPlaying(false);
  }, [events.length]);

  useEffect(() => {
    if (!playing) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setStep(prev => {
        if (prev >= events.length) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, events.length]);

  const stepped = useMemo(
    () => replayEvents(createGenesisLedgerScan(genesisPositions()), events.slice(0, step)),
    [events, step],
  );

  const stepOnce = useCallback(() => setStep(prev => Math.min(prev + 1, events.length)), [events.length]);
  const reset = useCallback(() => {
    setPlaying(false);
    setStep(0);
  }, []);

  return (
    <section className="bg-base-200 border border-base-300 rounded-lg p-4 max-h-[28rem] flex flex-col">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold">Event log</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-xs btn-outline" onClick={stepOnce} disabled={step >= events.length}>
            Step
          </button>
          <button
            type="button"
            className="btn btn-xs btn-outline"
            onClick={() => setPlaying(p => !p)}
            disabled={step >= events.length}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="btn btn-xs btn-ghost" onClick={reset}>
            Reset
          </button>
          <span className="text-xs font-mono opacity-70">
            {step}/{events.length}
          </span>
        </div>
      </div>
      <p className="text-xs opacity-70 mb-2">LedgerScan is rebuilt from events alone.</p>
      <ul className="overflow-y-auto text-xs space-y-2 flex-1">
        {events.map((ev, i) => {
          const hashLike = Object.entries(ev.args).find(([k, v]) => k.toLowerCase().includes("id") && String(v).startsWith("0x"));
          return (
            <li
              key={`${ev.blockNumber}-${ev.logIndex}`}
              className={`p-2 rounded border ${i < step ? "border-primary/40 bg-base-100" : "border-base-300 opacity-60"}`}
            >
              <div className="font-semibold">
                #{i + 1} {ev.name} · block {String(ev.blockNumber)}
              </div>
              <dl className="mt-1 space-y-1">
                {Object.entries(ev.args).map(([key, value]) => {
                  const raw = String(value);
                  const isWeiField =
                    key.toLowerCase().includes("amount") ||
                    key.toLowerCase().includes("balance") ||
                    key === "totalReversed" ||
                    key === "successCount";
                  const display = formatArg(key, value);
                  return (
                    <div key={key} className="flex flex-wrap gap-x-2 gap-y-0.5">
                      <dt className="opacity-60">{key}</dt>
                      <dd className="font-mono" title={isWeiField ? `${raw} wei` : raw}>
                        {display}
                        {raw.startsWith("0x") && raw.length > 20 ? <CopyButton text={raw} /> : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {hashLike ? (
                <div className="mt-1 text-[10px] font-mono opacity-60">
                  {shortAddress(String(hashLike[1]))} <CopyButton text={String(hashLike[1])} />
                </div>
              ) : null}
            </li>
          );
        })}
        {events.length === 0 ? <li className="opacity-60">No events yet — run a scenario.</li> : null}
      </ul>
      <p className="text-xs mt-2 opacity-70 font-mono">
        LedgerScan · processed {stepped.processedEvents} · mismatches {stepped.attestationMismatches} · observed reversed{" "}
        {formatEther(stepped.observedReversedTotal)}
      </p>
    </section>
  );
};
