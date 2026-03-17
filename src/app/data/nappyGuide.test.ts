import { describe, it, expect } from "vitest";
import { NAPPY_GUIDE } from "./nappyGuide";

describe("nappyGuide", () => {
  it("has entry pale_white with isNormal call_gp", () => {
    const entry = NAPPY_GUIDE.find((e) => e.id === "pale_white");
    expect(entry).toBeDefined();
    expect(entry!.isNormal).toBe("call_gp");
  });

  it("every call_gp entry has whenToCallGP", () => {
    for (const e of NAPPY_GUIDE) {
      if (e.isNormal === "call_gp" || e.isNormal === "call_999") {
        expect(e.whenToCallGP != null || e.whenToCall999 != null).toBe(true);
      }
    }
  });

  it("every call_999 entry has whenToCall999", () => {
    const call999 = NAPPY_GUIDE.filter((e) => e.isNormal === "call_999");
    for (const e of call999) {
      expect(e.whenToCall999).not.toBeNull();
    }
  });

  it("colourHex is valid 6-char hex for all", () => {
    for (const e of NAPPY_GUIDE) {
      expect(/^#[0-9a-fA-F]{6}$/.test(e.colourHex)).toBe(true);
      if (e.colourHex2) expect(/^#[0-9a-fA-F]{6}$/.test(e.colourHex2)).toBe(true);
    }
  });
});
