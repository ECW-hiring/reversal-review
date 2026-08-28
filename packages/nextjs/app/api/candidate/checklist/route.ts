import { NextResponse } from "next/server";
import { listCandidates, registerCandidate } from "~~/services/candidate/identity";

/**
 * GET /api/candidate/checklist — company candidate checklist
 * POST /api/candidate/checklist — update registration metadata for this PC
 */
export async function GET() {
  try {
    return NextResponse.json({ candidates: listCandidates() });
  } catch (error) {
    console.error("[candidate/checklist]", error);
    return NextResponse.json({ error: "Failed to read checklist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      displayName?: string | null;
      challengeId?: string | null;
      notes?: string | null;
    };
    const record = registerCandidate({
      displayName: body.displayName ?? null,
      challengeId: body.challengeId ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ candidate: record });
  } catch (error) {
    console.error("[candidate/checklist POST]", error);
    return NextResponse.json({ error: "Failed to register candidate" }, { status: 500 });
  }
}
