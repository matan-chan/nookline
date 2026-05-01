export const assignGlobalFetch = (impl: unknown) => {
  globalThis.fetch = impl as typeof globalThis.fetch;
};
