import { NextResponse } from "next/server";
import {
  scenarioErroneousReversal,
  scenarioNormalTransfer,
  scenarioPartialBatch,
  scenarioReplayTwoOperators,
} from "~~/app/lib/ledgerServer";

const handlers = {
  normal: scenarioNormalTransfer,
  reversal: scenarioErroneousReversal,
  replay: scenarioReplayTwoOperators,
  "partial-batch": scenarioPartialBatch,
} as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { scenario?: keyof typeof handlers };
    const key = body.scenario;
    if (!key || !(key in handlers)) {
      return NextResponse.json({ error: "Unknown scenario" }, { status: 400 });
    }
    const result = await handlers[key]();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[scenario]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scenario failed" },
      { status: 500 },
    );
  }
}
