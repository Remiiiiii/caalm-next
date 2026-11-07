#!/usr/bin/env node
/**
 * Mirror .cursor/skills and .agents/skills into .claude/skills as Windows junctions.
 *
 * Source of truth stays under .cursor/skills and .agents/skills (tracked).
 * Claude Code reads .claude/skills — this makes those paths aliases, not copies.
 *
 * - Directories → junction (fs.symlink type "junction")
 * - Loose files  → hard link
 * - Never replaces .claude/skills/graft (tracked Claude-only skill)
 *
 * Usage (repo root):
 *   node scripts/sync-claude-skill-junctions.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const claudeSkills = path.join(repoRoot, ".claude", "skills");
const sources = [
  path.join(repoRoot, ".agents", "skills"),
  path.join(repoRoot, ".cursor", "skills"),
];

/** Tracked exception in .gitignore — do not junction over it. */
const PROTECTED = new Set(["graft"]);

function isReparsePoint(p) {
  try {
    return Boolean(fs.lstatSync(p).isSymbolicLink());
  } catch {
    return false;
  }
}

function readLinkTarget(p) {
  try {
    return path.resolve(path.dirname(p), fs.readlinkSync(p));
  } catch {
    return null;
  }
}

function samePath(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

/** Remove a junction/symlink/file/dir without following into the target. */
function removeForReplace(p) {
  if (!fs.existsSync(p) && !isReparsePoint(p)) return;
  const st = fs.lstatSync(p);
  if (st.isSymbolicLink()) {
    fs.unlinkSync(p);
    return;
  }
  if (st.isDirectory()) {
    fs.rmSync(p, { recursive: true, force: true });
    return;
  }
  fs.unlinkSync(p);
}

/** True when dest is already a hard link to the same bytes as target. */
function isHardLinkedTo(dest, target) {
  try {
    const a = fs.statSync(dest);
    const b = fs.statSync(target);
    return a.dev === b.dev && a.ino === b.ino;
  } catch {
    return false;
  }
}

let created = 0;
let updated = 0;
let skipped = 0;

if (!fs.existsSync(claudeSkills)) {
  fs.mkdirSync(claudeSkills, { recursive: true });
}

for (const sourceRoot of sources) {
  if (!fs.existsSync(sourceRoot)) continue;

  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    const name = entry.name;
    if (PROTECTED.has(name.toLowerCase())) {
      console.log(`skip protected: ${name}`);
      skipped++;
      continue;
    }

    const target = path.join(sourceRoot, name);
    const dest = path.join(claudeSkills, name);

    if (entry.isDirectory()) {
      if (fs.existsSync(dest) || isReparsePoint(dest)) {
        if (isReparsePoint(dest)) {
          const current = readLinkTarget(dest);
          if (current && samePath(current, target)) {
            console.log(`ok junction: ${name}`);
            skipped++;
            continue;
          }
          console.log(`update junction: ${name} -> ${target}`);
          removeForReplace(dest);
          fs.symlinkSync(target, dest, "junction");
          updated++;
          continue;
        }
        console.log(`replace dir with junction: ${name} -> ${target}`);
        removeForReplace(dest);
        fs.symlinkSync(target, dest, "junction");
        updated++;
        continue;
      }

      console.log(`create junction: ${name} -> ${target}`);
      fs.symlinkSync(target, dest, "junction");
      created++;
      continue;
    }

    if (!entry.isFile()) continue;

    if (fs.existsSync(dest) || isReparsePoint(dest)) {
      if (isHardLinkedTo(dest, target)) {
        console.log(`ok hardlink: ${name}`);
        skipped++;
        continue;
      }
      console.log(`replace path with hardlink: ${name}`);
      removeForReplace(dest);
      fs.linkSync(target, dest);
      updated++;
      continue;
    }

    console.log(`create hardlink: ${name} -> ${target}`);
    fs.linkSync(target, dest);
    created++;
  }
}

console.log("");
console.log(`Done. created=${created} updated=${updated} skipped=${skipped}`);
console.log('Verify with: cmd /c "dir /AL .claude\\skills"');
