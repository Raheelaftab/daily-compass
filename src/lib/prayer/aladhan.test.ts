import { describe, expect, it } from "vitest";

import { toAlAdhanDate } from "./aladhan";

describe("toAlAdhanDate", () => {
  it("converts YYYY-MM-DD to DD-MM-YYYY", () => {
    expect(toAlAdhanDate("2026-11-27")).toBe("27-11-2026");
  });
});
