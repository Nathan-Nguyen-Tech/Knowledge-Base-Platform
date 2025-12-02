/**
 * Name Normalization Utilities
 * Chuẩn hóa tên sản phẩm để so khớp
 */

/**
 * Normalize product name for matching
 * 1. Lowercase
 * 2. Remove special characters (keep letters, numbers, spaces, Vietnamese)
 * 3. Trim and collapse multiple spaces
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Keep only alphanumeric, spaces, and Vietnamese characters
    .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings (0-100)
 * Uses Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.round(similarity);
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Find best match in a list of names
 * Returns the best match if similarity >= threshold
 */
export function findBestMatch(
  target: string,
  candidates: string[],
  threshold: number = 85
): { match: string; similarity: number } | null {
  let bestMatch: string | null = null;
  let bestSimilarity = 0;

  const normalizedTarget = normalizeName(target);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);

    // Exact match
    if (normalizedTarget === normalizedCandidate) {
      return { match: candidate, similarity: 100 };
    }

    // Calculate similarity
    const similarity = calculateSimilarity(target, candidate);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }

  // Return best match only if it meets threshold
  if (bestMatch && bestSimilarity >= threshold) {
    return { match: bestMatch, similarity: bestSimilarity };
  }

  return null;
}

/**
 * Check if name contains any of the keywords
 * Case-insensitive
 */
export function containsAnyKeyword(
  name: string,
  keywords: string[]
): boolean {
  const normalized = normalizeName(name);

  return keywords.some(keyword => {
    const normalizedKeyword = normalizeName(keyword);
    return normalized.includes(normalizedKeyword);
  });
}
