const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
};

const dominantHueFromImageData = (data: Uint8ClampedArray): number | null => {
  let sx = 0;
  let sy = 0;
  let wSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 0.15) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < 0.12 || l < 0.04 || l > 0.97) continue;
    const w = s * (1 - Math.abs(l - 0.42) * 1.1) * a;
    if (w <= 0) continue;
    const rad = (h * Math.PI) / 180;
    sx += Math.cos(rad) * w;
    sy += Math.sin(rad) * w;
    wSum += w;
  }
  if (wSum < 1e-4) return null;
  let deg = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
};

const SAMPLE_SIZE = 48;

export const sampleDominantHueFromImageUrl = (absoluteUrl: string): Promise<number | null> =>
  new Promise((resolve) => {
    const img = new Image();
    const finish = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        resolve(dominantHueFromImageData(data));
      } catch {
        resolve(null);
      }
    };
    img.onload = finish;
    img.onerror = () => resolve(null);
    img.src = absoluteUrl;
  });

export const resolveCoverSampleUrl = (coverUrl: string): string => {
  if (typeof window === "undefined") return coverUrl;
  try {
    return new URL(coverUrl, window.location.origin).href;
  } catch {
    return coverUrl;
  }
};
