import type { DiffSegment } from '../types';

/**
 * Tokenizes text into words, whitespace, and punctuation for visual diffing.
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  // Split on word boundaries or whitespace runs, keeping delimiters
  return text.match(/\s+|[^\s]+/g) || [];
}

/**
 * Computes a visual diff between two versions of text using the
 * Longest Common Subsequence (LCS) algorithm.
 *
 * Returns an array of DiffSegments:
 * - 'unchanged': Text present in both versions
 * - 'removed': Text deleted from the original version
 * - 'added': Text inserted in the new version
 */
export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return oldText ? [{ type: 'unchanged', value: oldText }] : [];
  }

  if (!oldText) {
    return newText ? [{ type: 'added', value: newText }] : [];
  }

  if (!newText) {
    return oldText ? [{ type: 'removed', value: oldText }] : [];
  }

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  const n = oldTokens.length;
  const m = newTokens.length;

  // For very large text, limit matrix to avoid excessive memory
  const maxTokens = 1200;
  if (n > maxTokens || m > maxTokens) {
    return [
      { type: 'removed', value: oldText },
      { type: 'added', value: newText },
    ];
  }

  // 1. Build DP LCS Matrix (Uint16 for performance and low memory)
  // dp[i][j] stores the length of LCS of oldTokens[0..i-1] and newTokens[0..j-1]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 2. Backtrack from (n, m) to construct diff segments
  const rawSegments: DiffSegment[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      rawSegments.push({ type: 'unchanged', value: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawSegments.push({ type: 'added', value: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawSegments.push({ type: 'removed', value: oldTokens[i - 1] });
      i--;
    }
  }

  rawSegments.reverse();

  // 3. Consolidate adjacent tokens of the same diff type
  const consolidated: DiffSegment[] = [];
  for (const seg of rawSegments) {
    if (consolidated.length > 0 && consolidated[consolidated.length - 1].type === seg.type) {
      consolidated[consolidated.length - 1].value += seg.value;
    } else {
      consolidated.push({ type: seg.type, value: seg.value });
    }
  }

  return consolidated;
}
