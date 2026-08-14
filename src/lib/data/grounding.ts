const USD_PRICE_RE = /\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|usd)/g;
const EUR_PRICE_RE =
  /(?:€|EUR)\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|EUR|,-\s*€)/gi;
const US_PHONE_RE = /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const DE_PHONE_RE = /(?:\+49|0)\s*[\d\s()/\-]{8,}/g;
const TIME_RE = /\d{1,2}:\d{2}/g;

function extractTokens(text: string, regex: RegExp): string[] {
  return [...text.matchAll(regex)].map((m) => m[0]);
}

function normalizeDigits(token: string): string {
  return token.replace(/[^\d]/g, "");
}

function normalizePriceToken(token: string): string {
  const match = token.match(/(\d{1,4}(?:[.,]\d{1,2})?)/);
  if (!match) return "";
  return match[1]!.replace(",", ".");
}

function inputContainsPrice(inputJson: string, token: string): boolean {
  const normalized = normalizePriceToken(token);
  if (!normalized) return true;
  return inputJson.includes(normalized) || inputJson.includes(normalized.replace(".", ","));
}

function normalizePhoneToken(token: string): string {
  return token.trim().replace(/\s+/g, " ");
}

function normalizeTimeToken(token: string): string {
  const match = token.trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if (!match) return token.trim();
  return `${Number(match[1])}:${match[2]}`;
}

function canonicalizeTimesInText(text: string): string {
  let result = text.replace(/\b(\d{1,2})\.(\d{2})\b/g, (_, hour, minute) => `${Number(hour)}:${minute}`);
  result = result.replace(/\b(\d{1,2})\s*-\s*(\d{1,2})\s*Uhr/gi, (_, start, end) => {
    const startHour = Number(start);
    const endHour = Number(end);
    return `${start} - ${end} Uhr ${startHour}:00 ${endHour}:00 ${String(startHour).padStart(2, "0")}:00 ${String(endHour).padStart(2, "0")}:00`;
  });
  return result;
}

function inputContainsPhone(inputJson: string, token: string): boolean {
  const digits = normalizeDigits(normalizePhoneToken(token));
  if (digits.length < 8) return true;
  const inputDigits = normalizeDigits(inputJson);
  if (inputDigits.includes(digits)) return true;
  const tail = digits.slice(-8);
  return inputDigits.includes(tail);
}

function inputContainsTime(inputJson: string, token: string): boolean {
  const normalizedToken = normalizeTimeToken(token);
  const canonicalInput = canonicalizeTimesInText(inputJson);
  if (canonicalInput.includes(normalizedToken)) return true;

  const [hour, minute] = normalizedToken.split(":");
  if (!hour || !minute) return inputJson.includes(token);

  const padded = `${hour.padStart(2, "0")}:${minute}`;
  return canonicalInput.includes(padded);
}

export function checkGrounding(
  generatedText: string,
  inputData: Record<string, unknown>,
): { passed: boolean; violations: string[] } {
  const inputJson = JSON.stringify(inputData);
  const violations: string[] = [];

  for (const token of extractTokens(generatedText, USD_PRICE_RE)) {
    if (!inputContainsPrice(inputJson, token) && !inputJson.includes(token)) {
      violations.push(`price: "${token}" not found in input`);
    }
  }

  for (const token of extractTokens(generatedText, EUR_PRICE_RE)) {
    if (!inputContainsPrice(inputJson, token)) {
      violations.push(`price: "${token}" not found in input`);
    }
  }

  for (const token of extractTokens(generatedText, US_PHONE_RE)) {
    const normalizedToken = normalizePhoneToken(token);
    if (!inputContainsPhone(inputJson, normalizedToken) && !inputJson.includes(normalizedToken)) {
      violations.push(`phone: "${normalizedToken}" not found in input`);
    }
  }

  for (const token of extractTokens(generatedText, DE_PHONE_RE)) {
    const normalizedToken = normalizePhoneToken(token);
    if (!inputContainsPhone(inputJson, normalizedToken) && !inputJson.includes(normalizedToken)) {
      violations.push(`phone: "${normalizedToken}" not found in input`);
    }
  }

  for (const token of extractTokens(generatedText, TIME_RE)) {
    const normalizedToken = normalizeTimeToken(token);
    if (!inputContainsTime(inputJson, normalizedToken)) {
      violations.push(`time: "${normalizedToken}" not found in input`);
    }
  }

  return { passed: violations.length === 0, violations };
}
