import { describe, it, expect } from "vitest";
import {
  canonicalInstagramUrl,
  extractInstagram,
  instagramHandleFromUrl,
} from "../../src/lib/data/extract-instagram.ts";

describe("extractInstagram", () => {
  it("extracts a follow-me profile URL", () => {
    const result = extractInstagram(
      '[Folge mir auf Instagram](https://www.instagram.com/akupunktur_sandra_wilfert/ "")',
    );
    expect(result?.username).toBe("akupunktur_sandra_wilfert");
    expect(result?.url).toBe("https://www.instagram.com/akupunktur_sandra_wilfert");
  });

  it("keeps query strings out of the username", () => {
    const result = extractInstagram(
      "[Instagram](https://instagram.com/barbara.naur?igshid=YmMyMTA2M2Y%3D)",
    );
    expect(result?.username).toBe("barbara.naur");
    expect(result?.url).toBe("https://www.instagram.com/barbara.naur");
  });

  it("ignores post and reel links", () => {
    expect(
      extractInstagram("Siehe [diesen Beitrag](https://www.instagram.com/p/CZfVi64horY/)"),
    ).toBeUndefined();
    expect(
      extractInstagram("https://www.instagram.com/reel/DLabc123xyz/"),
    ).toBeUndefined();
  });

  it("ignores website-builder and association accounts", () => {
    expect(
      extractInstagram("](https://www.instagram.com/wix) bottom of page"),
    ).toBeUndefined();
    expect(
      extractInstagram(
        "[![](https://www.osteopathie.de/style/instagram.png)](https://www.instagram.com/osteopathie.de/?hl=de)",
      ),
    ).toBeUndefined();
  });

  it("skips a builder account and keeps the practice profile after it", () => {
    const result = extractInstagram(
      [
        "](https://www.instagram.com/wix) bottom of page",
        "[Instagram](https://www.instagram.com/maxim_therapy)",
      ].join("\n"),
    );
    expect(result?.username).toBe("maxim_therapy");
  });
});

describe("instagramHandleFromUrl", () => {
  it("formats a canonical profile URL", () => {
    expect(instagramHandleFromUrl(canonicalInstagramUrl("Health_E_Berlin"))).toBe(
      "@health_e_berlin",
    );
  });

  it("rejects blocked usernames", () => {
    expect(instagramHandleFromUrl("https://www.instagram.com/wix")).toBeUndefined();
  });
});
