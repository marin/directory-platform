export function stripHtmlArtifacts(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<br(?=[\wäöüÄÖÜß])/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
