// Jalankan sekali setelah create-next-app:  node scripts/apply-kit.mjs
// Menambahkan script npm yang dipakai CI (lint, typecheck) dan engines Node.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

if (!existsSync("package.json")) {
  console.error("package.json tidak ditemukan. Jalankan create-next-app dulu.");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.scripts ??= {};

const before = JSON.stringify(pkg.scripts);
// Next.js 16 menghapus `next lint`; pastikan lint memakai ESLint CLI.
if (!pkg.scripts.lint || pkg.scripts.lint.includes("next lint")) pkg.scripts.lint = "eslint .";
pkg.scripts.typecheck ??= "tsc --noEmit";
pkg.scripts["docker:dev"] ??= "docker compose up --build --watch";
pkg.scripts.smoke ??= "bash scripts/smoke.sh";
pkg.engines ??= { node: ">=24" };

writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log(before === JSON.stringify(pkg.scripts) ? "Script sudah lengkap." : "Script npm diperbarui:", pkg.scripts);
