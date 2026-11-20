const DEFAULT_PAGE_ASPECT = 8.5 / 11;

export const coverPdfPageRenderWidth = (containerW: number, containerH: number, pageAspect = DEFAULT_PAGE_ASPECT) => {
  if (containerW < 1 || containerH < 1 || pageAspect < 0.01) return 168;
  return Math.ceil(Math.max(containerW, containerH * pageAspect) * 1.02);
};