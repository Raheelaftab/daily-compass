import { describe, expect, it } from "vitest";

import { csvEscape, toCsv } from "./csv";

describe("csvEscape", () => {
  it("leaves plain values alone", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(null)).toBe("");
  });

  it("quotes values with commas, quotes, or newlines", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
  });
});

describe("toCsv", () => {
  it("builds a CRLF CSV document", () => {
    expect(
      toCsv(["title", "note"], [
        ["Ship", "ok"],
        ["A,B", 'x"y'],
      ]),
    ).toBe('title,note\r\nShip,ok\r\n"A,B","x""y"\r\n');
  });
});
