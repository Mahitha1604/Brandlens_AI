function buildBoundaryRegex(term, caseSensitive = false) {
  // Escape regex special chars
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Pattern: (^|[^a-zA-Z0-9_])(escaped)(?=[^a-zA-Z0-9_]|$)
  // We capture leading boundary in group 1, term in group 2
  const flags = caseSensitive ? 'g' : 'gi';
  return new RegExp(`(^|[^a-zA-Z0-9_])(${escaped})(?=[^a-zA-Z0-9_]|$)`, flags);
}

const text = "Get 100% uptime with bulletproof risk-free and $50B volume. Also freeze freedom and Apexpay.";
console.log("Original text length:", text.length);

const testTerms = ["100%", "bulletproof", "risk-free", "$50B", "free", "Apexpay"];

for (const term of testTerms) {
  const re = buildBoundaryRegex(term, term === "Apexpay");
  let match;
  while ((match = re.exec(text)) !== null) {
    const matchedText = match[2];
    const startIndex = match.index + match[1].length;
    const endIndex = startIndex + matchedText.length;
    const slice = text.slice(startIndex, endIndex);
    console.log(`Matched [${term}]: "${matchedText}" at [${startIndex}, ${endIndex}] -> slice equals: "${slice}" (${slice === matchedText})`);
    
    // Prevent infinite loop if match length is 0 (should not happen with terms)
    if (match.index === re.lastIndex) re.lastIndex++;
  }
}
