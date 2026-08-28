import { NextResponse } from "next/server";
import { getCandidateIdentity, registerCandidate } from "~~/services/candidate/identity";

/**
 * GET /api/candidate/id
 * Backend derives a stable 32-bit ID from this PC's machine fingerprint,
 * auto-registers it on the company checklist, and returns the identity.
 */
export async function GET() {
  try {
    const identity = getCandidateIdentity();
    const record = registerCandidate();
    return NextResponse.json({
      id: identity.id,
      idHex: identity.idHex,
      hostname: identity.hostname,
      platform: identity.platform,
      registeredAt: record.registeredAt,
      lastSeenAt: record.lastSeenAt,
    });
  } catch (error) {
    console.error("[candidate/id]", error);
    return NextResponse.json({ error: "Failed to generate candidate ID" }, { status: 500 });
  }
}
