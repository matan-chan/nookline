import { mkdir, readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANNERS_DIR = path.resolve(__dirname, "../public/library-banners");
const VARIANTS_DIR = path.join(BANNERS_DIR, "variants");
const WIDTHS = [640, 960, 1280, 1920];

const main = async () => {
  await mkdir(VARIANTS_DIR, { recursive: true });
  const entries = await readdir(BANNERS_DIR);
  const jpgs = entries.filter((f) => /\.jpe?g$/i.test(f));
  for (const name of jpgs) {
    const buf = await readFile(path.join(BANNERS_DIR, name));
    const base = name.replace(/\.jpe?g$/i, "");
    for (const w of WIDTHS) {
      const resized = () => sharp(buf).resize(w, null, { withoutEnlargement: true });
      await resized().webp({ quality: 82 }).toFile(path.join(VARIANTS_DIR, `${base}-${w}.webp`));
      await resized().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(VARIANTS_DIR, `${base}-${w}.jpg`));
    }
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
