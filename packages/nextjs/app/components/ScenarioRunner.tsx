"use client";

type Props = {
  onRefresh: () => void;
  busy: boolean;
};

const SCENARIOS = [
  { key: "normal", label: "Standard settlement instruction" },
  { key: "reversal", label: "Correction after an erroneous instruction" },
  { key: "replay", label: "Dual-operator correction" },
  { key: "partial-batch", label: "End-of-day batch correction" },
] as const;

export const ScenarioRunner = ({ onRefresh, busy }: Props) => {
  const run = async (scenario: (typeof SCENARIOS)[number]["key"]) => {
    await fetch("/api/scenario", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    onRefresh();
  };

  return (
    <section className="bg-base-200 border border-base-300 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3">Scenario runner</h2>
      <ul className="flex flex-col gap-2">
        {SCENARIOS.map(s => (
          <li key={s.key}>
            <button
              type="button"
              className="btn btn-sm btn-outline w-full justify-start normal-case"
              disabled={busy}
              onClick={() => run(s.key)}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
