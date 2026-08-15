const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9])?$/;

const PROFILE_RE =
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})(?=[/?#"'\s<>)]|$)/gi;

const RESERVED_PATHS = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "tv",
  "explore",
  "accounts",
  "about",
  "legal",
  "developer",
  "directory",
  "instagram",
  "static",
  "share",
  "tags",
  "locations",
  "invites",
  "graphql",
  "api",
  "privacy",
  "safety",
]);

const BLOCKED_USERNAMES = new Set([
  "wix",
  "squarespace",
  "shopify",
  "wordpress",
  "godaddy",
  "webflow",
  "facebook",
  "meta",
  "youtube",
  "twitter",
  "google",
  "jameda",
  "doctolib",
  "osteopathie.de",
]);

export type InstagramMatch = {
  username: string;
  url: string;
  snippet: string;
};

function isUsableUsername(username: string): boolean {
  const key = username.toLowerCase();
  if (!USERNAME_RE.test(username)) return false;
  if (RESERVED_PATHS.has(key)) return false;
  if (BLOCKED_USERNAMES.has(key)) return false;
  return true;
}

export function canonicalInstagramUrl(username: string): string {
  return `https://www.instagram.com/${username.toLowerCase()}`;
}

export function instagramHandleFromUrl(url: string): string | undefined {
  const match = /instagram\.com\/([A-Za-z0-9._]{1,30})/i.exec(url);
  const username = match?.[1];
  if (!username || !isUsableUsername(username)) return undefined;
  return `@${username.toLowerCase()}`;
}

export function extractInstagram(markdown: string): InstagramMatch | undefined {
  const re = new RegExp(PROFILE_RE.source, PROFILE_RE.flags);
  for (const match of markdown.matchAll(re)) {
    const username = match[1];
    if (!username || !isUsableUsername(username)) continue;
    const index = match.index ?? 0;
    const start = Math.max(0, index - 80);
    const end = Math.min(markdown.length, index + match[0].length + 80);
    return {
      username: username.toLowerCase(),
      url: canonicalInstagramUrl(username),
      snippet: markdown.slice(start, end).replace(/\s+/g, " ").trim(),
    };
  }
  return undefined;
}
