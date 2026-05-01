import { loadStoredE2eToken } from "./helpers/loadStoredE2eToken";
import { getAuthToken } from "./helpers/getAuthToken";
import { test, expect } from "@playwright/test";
import { E2E_DEFAULT_PDF_PATH } from "./constants";
import { existsSync, readFileSync } from "node:fs";

const apiUpCheck = async (request: Parameters<(typeof test)["beforeAll"]>[0]["request"]) => {
  const res = await request.get("/api/health").catch(() => null);
  return res?.ok() ?? false;
};

const gql = async <T,>(
  request: Parameters<(typeof test)["beforeAll"]>[0]["request"],
  token: string,
  query: string,
  variables: Record<string, unknown>,
) => {
  const r = await request.post("/api/graphql", {
    headers: { Authorization: `Bearer ${token}` },
    data: { query, variables },
  });
  const j = (await r.json().catch(() => null)) as { data?: T; errors?: { message: string }[] } | null;
  if (!r.ok) throw new Error(`graphql http ${r.status()}`);
  if (!j) throw new Error("graphql invalid json");
  if (j.errors?.length) throw new Error(j.errors.map((e) => e.message).join(" | "));
  if (!j.data) throw new Error("graphql missing data");
  return j.data;
};

const uploadPdf = async (request: Parameters<(typeof test)["beforeAll"]>[0]["request"], token: string, libraryId: number, absPath: string) => {
  const buf = readFileSync(absPath);
  const r = await request.post(`/api/files/upload?libraryId=${encodeURIComponent(String(libraryId))}`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name: "peter-pan.pdf", mimeType: "application/pdf", buffer: buf } },
  });
  const j = (await r.json().catch(() => null)) as any;
  if (!r.ok() || typeof j?.path !== "string") throw new Error(`upload failed: ${j?.error ?? r.status()}`);
  return { path: j.path as string };
};

let apiUp = false;

test.beforeAll(async ({ request }) => {
  apiUp = await apiUpCheck(request);
});

test.describe("PDF reader bookmark + highlight", () => {
  test("can create a bookmark and a highlight on a PDF", async ({ page, request }) => {
    test.skip(!apiUp, "Start the backend on the port in .env DEV_BACKEND_PORT (Vite proxy default 4006).");

    const pdfPath = process.env.E2E_PDF_PATH?.trim() || E2E_DEFAULT_PDF_PATH;
    test.skip(
      !existsSync(pdfPath),
      `Missing PDF at ${pdfPath}. Place a copy at frontend/e2e/fixtures/peter-pan.pdf or set E2E_PDF_PATH.`,
    );

    const token = loadStoredE2eToken() ?? (await getAuthToken(request));
    test.skip(!token, "No auth token (registration closed). Set E2E_USERNAME and E2E_PASSWORD for an existing user.");

    const libName = `E2E Library ${Date.now()}`;
    const lib = await gql<{ createLibrary: { id: number } }>(
      request,
      token,
      `mutation CreateLibrary($input: CreateLibraryInput!) { createLibrary(input: $input) { id } }`,
      { input: { name: libName, path: `e2e/${Date.now()}`, type: "local", bannerIndex: 0 } },
    );

    const uploaded = await uploadPdf(request, token, lib.createLibrary.id, pdfPath);

    const book = await gql<{ createBook: { id: number; title: string } }>(
      request,
      token,
      `mutation CreateBook($input: CreateBookInput!) { createBook(input: $input) { id title } }`,
      { input: { libraryId: lib.createLibrary.id, title: "Peter Pan (E2E)", filePath: uploaded.path, metadata: JSON.stringify({ fileExt: "pdf" }) } },
    );

    await page.goto(`/read/${book.createBook.id}`);
    await expect(page.getByLabel("Back")).toBeVisible({ timeout: 25_000 });
    await expect(page.locator(".textLayer").first()).toBeVisible({ timeout: 25_000 });

    const span = page.locator(".textLayer span").filter({ hasText: /[A-Za-z]{4,}/ }).first();
    await expect(span).toBeVisible({ timeout: 25_000 });
    const selectedText = ((await span.textContent()) ?? "").trim().replace(/\s+/g, " ");
    const snippet = selectedText.length > 24 ? selectedText.slice(0, 24) : selectedText;
    test.skip(snippet.length < 4, `Could not extract selectable PDF text. Got: "${selectedText}"`);
    await span.selectText();
    await span.click({ button: "right" });
    await page.getByLabel("Highlight with color #fde047").click();
    await expect(page.locator("mark.nookline-reader-hl-pdf").first()).toBeVisible({ timeout: 15_000 });

    await span.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Save as bookmark" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await page.goto("/bookmarks");
    await expect(page.getByText("Bookmarks & Highlights", { exact: true })).toBeVisible();
    await expect(page.getByText("Peter Pan (E2E)", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Bookmark", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: /Highlights/i }).click();
    await expect(page.getByText(snippet, { exact: false }).first()).toBeVisible();
  });
});

