import { NextResponse } from "next/server";
import { getDeployment, readPublicPosition } from "~~/app/lib/ledgerServer";
import { PARTICIPANTS } from "~~/app/lib/participants";

function jsonSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewer = searchParams.get("viewer");
    getDeployment();

    const visible = await Promise.all(
      PARTICIPANTS.map(async p => ({
        label: p.displayName,
        address: p.address,
        publicPosition: await readPublicPosition(p.address),
      })),
    );

    const viewerAddr = viewer?.toLowerCase();
    const observerIsParticipant = PARTICIPANTS.some(p => p.address.toLowerCase() === viewerAddr);

    return NextResponse.json(
      jsonSafe({
        participants: visible,
        viewer,
        note: observerIsParticipant
          ? "Values below are readable from public chain views by any participant."
          : "Select a participant to view public visibility.",
      }),
    );
  } catch (error) {
    console.error("[participant-lens]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
