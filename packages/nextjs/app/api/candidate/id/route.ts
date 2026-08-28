import { NextResponse } from "next/server";
import { getCandidateIdentity } from "~~/services/candidate/identity";

/** GET /api/candidate/id — stable 32-bit ID for this machine. */
export async function GET() {
  try {
    const identity = getCandidateIdentity();
    return NextResponse.json({
      id: identity.id,
      idHex: identity.idHex,
      hostname: identity.hostname,
      platform: identity.platform,
    });
  } catch (error) {
    console.error("[candidate/id]", error);
    return NextResponse.json({ error: "Failed to generate candidate ID" }, { status: 500 });
  }
}
