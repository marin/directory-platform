/** Gambling and pharma markers. Do not include German words like Einsatz or Gewinn. */
export const PAGE_SPAM_RE =
  /casino|slot\s*machine|jackpot|poker\s*online|viagra|cialis/i;

export function isPageSpam(text: string): boolean {
  return PAGE_SPAM_RE.test(text);
}

export function isMissingPage(markdown: string): boolean {
  return /seite konnte (leider )?nicht gefunden|page not found|404 not found/i.test(
    markdown,
  );
}
