import { jsPDF } from "jspdf";
import type { Finding } from "~~/app/components/FindingsPanel";

type ExportInput = {
  candidateIdHex: string;
  candidateIdDecimal: number;
  candidateName: string;
  findings: Finding[];
  unchecked: string;
};

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "candidate"
  );
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text || "—", maxWidth) as string[];
  lines.forEach((line, i) => doc.text(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

/** PDF header block mirroring the on-screen ID badge. */
function drawIdBadgeHeader(
  doc: jsPDF,
  candidateIdHex: string,
  candidateIdDecimal: number,
  candidateName: string,
  margin: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - margin * 2;
  const boxTop = margin;
  const boxHeight = 34;

  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, boxTop, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("CANDIDATE ID", margin + 6, boxTop + 9);

  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(candidateIdHex, margin + 6, boxTop + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`decimal ${candidateIdDecimal}`, margin + 6, boxTop + 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const title = "Reversal Review — Findings Export";
  doc.text(title, pageWidth - margin - 6, boxTop + 12, { align: "right" });

  if (candidateName.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(candidateName.trim(), pageWidth - margin - 6, boxTop + 22, { align: "right" });
  }

  return boxTop + boxHeight + 10;
}

export function exportFindingsPdf(input: ExportInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = drawIdBadgeHeader(doc, input.candidateIdHex, input.candidateIdDecimal, input.candidateName, margin);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Ranked findings (most severe first)", margin, y);
  y += 8;

  input.findings.forEach((finding, index) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = drawIdBadgeHeader(doc, input.candidateIdHex, input.candidateIdDecimal, input.candidateName, margin);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${index + 1}. ${finding.title || "Untitled"}`, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = wrapText(doc, `Severity: ${finding.severity}`, margin, y, contentWidth, 5);
    y = wrapText(doc, `Location: ${finding.location}`, margin, y, contentWidth, 5);
    y = wrapText(doc, `What breaks: ${finding.impact}`, margin, y, contentWidth, 5);
    y = wrapText(doc, `How to confirm: ${finding.confirmation}`, margin, y, contentWidth, 5);
    y += 4;
  });

  if (y > pageHeight - 50) {
    doc.addPage();
    y = drawIdBadgeHeader(doc, input.candidateIdHex, input.candidateIdDecimal, input.candidateName, margin);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("What I did not check, and why", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  wrapText(doc, input.unchecked || "—", margin, y, contentWidth, 5);

  const nameSlug = slugify(input.candidateName);
  const idSlug = input.candidateIdHex.replace(/^0x/i, "").toLowerCase();
  doc.save(`reversal-review-${nameSlug}-${idSlug}-findings.pdf`);
}
