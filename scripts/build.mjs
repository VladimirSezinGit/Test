import { mkdir, cp, copyFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const file of ["index.html", "styles.css", "app.js"])
  await copyFile(resolve(root, file), resolve(output, file));
await cp(resolve(root, "assets"), resolve(output, "assets"), {
  recursive: true,
});
console.log("Готово: dist/ — статический сайт без внешних зависимостей.");
