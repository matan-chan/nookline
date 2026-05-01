import { extractSortedLinesFromPdfPage, inferPdfRepeatingHeaderFooterRegexes } from "../src/services/pdfRepeatingHeaderFooterRegex";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { describe, expect, test } from "bun:test";

const stripWithLineRegexes = (text: string, regexes: string[]) => {
  let t = text;
  for (const re of regexes) t = t.replace(new RegExp(re, "gm"), "");
  return t.replace(/\n{3,}/g, "\n\n").trim();
};

const resolveBehaviorOpsPdfPath = () => {
  const fromEnv = process.env.NAVON_BEHAVIOR_OPS_PDF?.trim();
  if (fromEnv) return fromEnv;
  return join(homedir(), "Desktop", "_OceanofPDF.com_The_Behavior_Ops_Manual_-_Chase_Hughes.pdf");
};

const behaviorOpsPdfPath = resolveBehaviorOpsPdfPath();
const hasBehaviorOpsPdf = existsSync(behaviorOpsPdfPath);

describe.skipIf(!hasBehaviorOpsPdf)("inferPdfRepeatingHeaderFooterRegexes (Behavior Ops Manual fixture)", () => {
  test("infers regexes from the real PDF, matches margin lines, and strip removes them", async () => {
    const pdfBytes = new Uint8Array(await readFile(behaviorOpsPdfPath));
    const { regexes } = await inferPdfRepeatingHeaderFooterRegexes(pdfBytes);
    expect(regexes.length).toBeGreaterThan(0);
    let marginLine: string | undefined;
    for (let p = 3; p <= 30; p++) {
      const lines = await extractSortedLinesFromPdfPage(pdfBytes, p);
      marginLine = lines.find((line) => regexes.some((re) => new RegExp(re, "m").test(line.trim())));
      if (marginLine) break;
    }
    expect(marginLine).toBeDefined();
    const block = `Keep this sentence.\n${marginLine}\nKeep this tail.`;
    const stripped = stripWithLineRegexes(block, regexes);
    expect(stripped).toContain("Keep this sentence.");
    expect(stripped).toContain("Keep this tail.");
    expect(stripped).not.toContain(marginLine!.trim());
  });
});
