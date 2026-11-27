import { describe, expect, it } from "vitest";

import {
  nextWeekdayOnOrAfter,
  normalizeCommand,
  parseAddArgs,
  parseCommandLine,
  parseDueToken,
  parseLogArgs,
  parseStartTimerArgs,
} from "./parse";

describe("normalizeCommand", () => {
  it("strips @botname", () => {
    expect(normalizeCommand("/today@DailyCompassBot")).toBe("/today");
    expect(normalizeCommand("/add@Bot Ship it #work")).toBe("/add Ship it #work");
  });
});

describe("parseDueToken", () => {
  it("parses today, tomorrow, and YYYY-MM-DD", () => {
    expect(parseDueToken("today", "2026-11-26")).toBe("2026-11-26");
    expect(parseDueToken("tomorrow", "2026-11-26")).toBe("2026-11-27");
    expect(parseDueToken("2026-12-01", "2026-11-26")).toBe("2026-12-01");
  });

  it("parses weekday words to the next on/after today", () => {
    // 2026-11-26 is Thursday
    expect(parseDueToken("fri", "2026-11-26")).toBe("2026-11-27");
    expect(parseDueToken("thu", "2026-11-26")).toBe("2026-11-26");
    expect(parseDueToken("mon", "2026-11-26")).toBe("2026-11-30");
  });
});

describe("nextWeekdayOnOrAfter", () => {
  it("returns today when it already matches", () => {
    expect(nextWeekdayOnOrAfter("2026-11-27", "FRI")).toBe("2026-11-27");
  });
});

describe("parseAddArgs", () => {
  it("extracts title, area, priority, and due", () => {
    const parsed = parseAddArgs("Ship MCP #rinoviy !high due:fri", "2026-11-26");
    expect(parsed).toEqual({
      title: "Ship MCP",
      areaSlug: "rinoviy",
      priority: "high",
      dueDate: "2026-11-27",
    });
  });

  it("defaults priority and allows missing area/due", () => {
    expect(parseAddArgs("Just a title")).toMatchObject({
      title: "Just a title",
      areaSlug: null,
      priority: "medium",
      dueDate: null,
    });
  });
});

describe("parseLogArgs", () => {
  it("parses minutes, area, and note", () => {
    expect(parseLogArgs("45 #work standup notes")).toEqual({
      minutes: 45,
      areaSlug: "work",
      note: "standup notes",
    });
  });

  it("rejects invalid minutes", () => {
    expect(parseLogArgs("0 #work")).toBeNull();
    expect(parseLogArgs("abc")).toBeNull();
  });
});

describe("parseStartTimerArgs", () => {
  it("accepts task id or area slug", () => {
    expect(parseStartTimerArgs("12")).toEqual({ taskId: 12 });
    expect(parseStartTimerArgs("#health")).toEqual({ areaSlug: "health" });
    expect(parseStartTimerArgs("health")).toEqual({ areaSlug: "health" });
  });
});

describe("parseCommandLine", () => {
  it("splits command and args", () => {
    expect(parseCommandLine("/done 42")).toEqual({
      command: "done",
      args: "42",
    });
  });
});
