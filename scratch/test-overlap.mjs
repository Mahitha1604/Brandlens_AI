function resolveOverlaps(matches) {
  const severityRank = {
    violation: 3,
    warning: 2,
    suggestion: 1,
  };

  // Sort candidate matches:
  // 1. Longest match first
  // 2. Higher severity first
  // 3. Earlier startIndex first
  const sorted = [...matches].sort((a, b) => {
    const lenA = a.endIndex - a.startIndex;
    const lenB = b.endIndex - b.startIndex;
    if (lenB !== lenA) return lenB - lenA; // longer first

    const rankA = severityRank[a.severity] || 0;
    const rankB = severityRank[b.severity] || 0;
    if (rankB !== rankA) return rankB - rankA; // higher severity first

    return a.startIndex - b.startIndex;
  });

  const accepted = [];

  for (const candidate of sorted) {
    const overlaps = accepted.some(
      (acc) => candidate.startIndex < acc.endIndex && candidate.endIndex > acc.startIndex
    );

    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  // Sort accepted matches in chronological text order (by startIndex ASC)
  accepted.sort((a, b) => a.startIndex - b.startIndex);
  return accepted;
}

const testCandidates = [
  { term: "free", startIndex: 38, endIndex: 42, severity: "warning" },
  { term: "risk-free", startIndex: 33, endIndex: 42, severity: "violation" },
  { term: "bulletproof", startIndex: 21, endIndex: 32, severity: "violation" },
  { term: "bulletproof", startIndex: 80, endIndex: 91, severity: "violation" }, // repeated
];

const resolved = resolveOverlaps(testCandidates);
console.log("Resolved matches:");
resolved.forEach((m) => console.log(`- ${m.term} at [${m.startIndex}, ${m.endIndex}] (${m.severity})`));

if (resolved.length === 3 && resolved[1].term === "risk-free" && !resolved.some(m => m.term === "free")) {
  console.log("✔ Overlap resolution test PASSED!");
} else {
  console.error("❌ Overlap resolution test FAILED!");
}
