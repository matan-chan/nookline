import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import { dirname } from "path";

export const convertPdfToEpub = async (inputPdfPath: string, outputEpubPath: string) => {
  await mkdir(dirname(outputEpubPath), { recursive: true });
  await runEbookConvert(inputPdfPath, outputEpubPath);
  return outputEpubPath;
};

const runEbookConvert = (inputPdfPath: string, outputEpubPath: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("ebook-convert", [inputPdfPath, outputEpubPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ebook-convert failed (code ${code}). ${stderr || stdout}`.trim()));
    });
  });

