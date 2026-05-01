export const writeSrvLog = (obj: Record<string, unknown>) => {
  process.stderr.write(`${JSON.stringify(obj)}\n`);
};
