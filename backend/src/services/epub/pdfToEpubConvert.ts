import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { existsSync } from "fs";

const windowsCalibreCmdCandidates = (): string[] => {
  const out: string[] = [];
  const pf = process.env.PROGRAMFILES;
  const pf86 = process.env["PROGRAMFILES(X86)"];
  const la = process.env.LOCALAPPDATA;
  if (pf) out.push(join(pf, "Calibre2", "ebook-convert.exe"));
  if (pf86) out.push(join(pf86, "Calibre2", "ebook-convert.exe"));
  if (la) out.push(join(la, "Programs", "Calibre", "ebook-convert.exe"));
  return out;
};

export const resolveEbookConvertCommand = (): string => {
  const fromEnv = process.env.CALIBRE_EBOOK_CONVERT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  if (process.platform === "win32")
    for (const p of windowsCalibreCmdCandidates()) if (existsSync(p)) return p;

  return "ebook-convert";
};

export const convertPdfToEpub = async (inputPdfPath: string, outputEpubPath: string) => {
  await mkdir(dirname(outputEpubPath), { recursive: true });
  await runEbookConvert(inputPdfPath, outputEpubPath);
  return outputEpubPath;
};

const runEbookConvert = (inputPdfPath: string, outputEpubPath: string) =>
  new Promise<void>((resolve, reject) => {
    const cmd = resolveEbookConvertCommand();
    const child = spawn(cmd, [inputPdfPath, outputEpubPath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") {
        reject(err);
        return;
      }
      reject(
        new Error(
          `ebook-convert not found (tried ${cmd}). Install Calibre (calibre-ebook.com) or set CALIBRE_EBOOK_CONVERT to the full path of ebook-convert.exe.`
        )
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ebook-convert failed (code ${code}). ${stderr || stdout}`.trim()));
    });
  });
