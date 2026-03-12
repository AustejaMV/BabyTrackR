#!/usr/bin/env node
/**
 * Bumps the patch version in both package.json and src/app/version.ts.
 * Run manually: node scripts/bump-version.js
 *
 * The pre-commit hook uses bump-version.ps1 instead (no Node path issues on Windows).
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Bump package.json ────────────────────────────────────────────────────────
const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
pkg.version = `${major}.${minor}.${patch + 1}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// ── Sync version.ts so the app can display it ────────────────────────────────
const versionPath = resolve(root, "src/app/version.ts");
writeFileSync(versionPath, `export const APP_VERSION = "${pkg.version}";\n`);

console.log(`✓ Bumped to v${pkg.version}`);
