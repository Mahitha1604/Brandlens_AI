/**
 * One-click correction engine for BrandLens AI Review Studio.
 * Safely applies suggested replacements while preserving exact character offsets,
 * handling repeated phrases, and recalculating remaining finding positions.
 */

export interface ReplacementTarget {
  id: string;
  flagged_text: string;
  suggested_replacement: string;
  start_index: number;
  end_index: number;
}

export interface ApplyCorrectionResult {
  updatedText: string;
  success: boolean;
  actualStartIndex: number;
  actualEndIndex: number;
  deltaLength: number;
  error?: string;
}

/**
 * Applies a suggested replacement to a specific slice of the draft text.
 * Verifies character alignment and falls back to proximity matching if the text has shifted.
 */
export function applyCorrectionToText(
  currentText: string,
  target: ReplacementTarget
): ApplyCorrectionResult {
  const { flagged_text, suggested_replacement, start_index, end_index } = target;

  if (!currentText) {
    return {
      updatedText: currentText,
      success: false,
      actualStartIndex: -1,
      actualEndIndex: -1,
      deltaLength: 0,
      error: 'Current text is empty',
    };
  }

  // 1. Primary check: Does the exact offset match the flagged text?
  const primarySlice = currentText.slice(start_index, end_index);
  let matchStart = -1;
  let matchEnd = -1;

  if (primarySlice.toLowerCase() === flagged_text.toLowerCase()) {
    matchStart = start_index;
    matchEnd = end_index;
  } else {
    // 2. Secondary check: Text may have shifted due to prior edits.
    // Find the occurrence of flagged_text closest to start_index.
    let bestIndex = -1;
    let minDistance = Infinity;
    let searchPos = 0;
    const lowerText = currentText.toLowerCase();
    const lowerFlagged = flagged_text.toLowerCase();

    while (searchPos < currentText.length) {
      const idx = lowerText.indexOf(lowerFlagged, searchPos);
      if (idx === -1) break;

      const dist = Math.abs(idx - start_index);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = idx;
      }
      searchPos = idx + lowerFlagged.length;
    }

    if (bestIndex !== -1) {
      matchStart = bestIndex;
      matchEnd = bestIndex + flagged_text.length;
    }
  }

  if (matchStart === -1 || matchEnd === -1) {
    return {
      updatedText: currentText,
      success: false,
      actualStartIndex: -1,
      actualEndIndex: -1,
      deltaLength: 0,
      error: `Could not locate "${flagged_text}" in the current draft.`,
    };
  }

  // 3. Perform the slice replacement cleanly
  const before = currentText.slice(0, matchStart);
  const after = currentText.slice(matchEnd);
  const updatedText = before + suggested_replacement + after;
  const deltaLength = suggested_replacement.length - (matchEnd - matchStart);

  return {
    updatedText,
    success: true,
    actualStartIndex: matchStart,
    actualEndIndex: matchEnd,
    deltaLength,
  };
}

/**
 * Shifts finding offsets for findings that occur after a correction point.
 */
export function shiftFindingOffsets<T extends { start_index: number; end_index: number; id: string }>(
  findings: T[],
  appliedFindingId: string,
  correctionEndIndex: number,
  deltaLength: number
): T[] {
  return findings.map((f) => {
    if (f.id === appliedFindingId) {
      return f;
    }
    // If the finding starts after the correction boundary, shift both indices
    if (f.start_index >= correctionEndIndex) {
      return {
        ...f,
        start_index: f.start_index + deltaLength,
        end_index: f.end_index + deltaLength,
      };
    }
    return f;
  });
}
