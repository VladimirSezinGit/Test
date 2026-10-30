import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "./server.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
test("Все локальные ресурсы и якоря существуют", async () => {
  const html = await readFile(resolve(root, "index.html"), "utf8");
  const css = await readFile(resolve(root, "styles.css"), "utf8");
  const assets = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(
    (match) => match[1],
  );
  assets.push(
    ...[...css.matchAll(/url\(["']([^"']+)["']\)/g)].map((match) => match[1]),
  );
  for (const path of new Set(assets))
    assert.ok((await stat(resolve(root, path))).size > 0, path);
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, "Нет повторяющихся id");
  for (const [, id] of html.matchAll(/href="#([^"\s]+)"/g))
    assert.ok(ids.includes(id), id);
});
test("HTTP: сайт и ресурсы доступны, служебные пути закрыты", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Меньше шума/);
  const font = await fetch(`${base}/assets/inter.woff2`);
  assert.equal(font.status, 200);
  assert.equal(font.headers.get("content-type"), "font/woff2");
  for (const path of [
    "/.git/config",
    "/package.json",
    "/missing",
    "/assets/../README.md",
  ]) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  assert.equal((await fetch(base, { method: "POST" })).status, 405);
  const head = await fetch(base, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
