/** Kürzt auf ganze Wörter und hängt ein Auslassungszeichen an. Ohne Kürzung unverändert. */
export function truncateOnWord(text: string | undefined | null, max = 160): string {
  const value = (text ?? "").trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")} …`;
}
