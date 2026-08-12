const PRICE_RE = /\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|usd)/g;
const PHONE_RE = /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const TIME_RE = /\d{1,2}:\d{2}/g;

function extractTokens(text: string, regex: RegExp): string[] {
  return [...text.matchAll(regex)].map((m) => m[0]);
}

function normalizeToken(token: string): string {
  return token.replace(/[^\d$:.]/g, "").toLowerCase();
}

export function checkGrounding(
  generatedText: string,
  inputData: Record<string, unknown>,
): { passed: boolean; violations: string[] } {
  const inputJson = JSON.stringify(inputData);
  const violations: string[] = [];

  const checks = [
    { name: "price", regex: PRICE_RE },
    { name: "phone", regex: PHONE_RE },
    { name: "time", regex: TIME_RE },
  ];

  for (const check of checks) {
    const outputTokens = extractTokens(generatedText, check.regex);
    for (const token of outputTokens) {
      const normalized = normalizeToken(token);
      if (normalized && !inputJson.includes(normalized.replace("$", "")) && !inputJson.includes(token)) {
        violations.push(`${check.name}: "${token}" not found in input`);
      }
    }
  }

  return { passed: violations.length === 0, violations };
}
