# Cursor hooks setup (CAALM)

Project hooks live in **`.cursor/hooks.json`** and run for **IDE and cloud agents** when the workspace is this repo. User-level hooks (`~/.cursor/hooks.json`) are per machine and do **not** run on cloud agents.

## What the repo ships

| Hook | Script | Purpose |
|------|--------|---------|
| `postToolUse` | `graft-hooks.cjs cursor-post-tool` | Keep graft index warm after reads/search/shell |
| `afterMCPExecution` | `graft-hooks.cjs cursor-mcp` | Post-MCP graft maintenance |
| `sessionEnd` | `graft-hooks.cjs cursor-session-end` | Session-end graft hook |

Commands use **repo-relative** paths (`node .cursor/hooks/graft-hooks.cjs …`) so macOS, Linux, and cloud agents share the same config.

**Requirements:** `node` on the PATH Cursor uses; graft resolved via `npx @nanonets/graft` (MCP) or global/project install.

## Optional: Ponytail (per developer)

[Ponytail](https://github.com/DietrichGebert/ponytail) mode switching is **not** committed in project hooks (paths differ per machine). Install at user level:

```bash
git clone https://github.com/DietrichGebert/ponytail ~/Developer/ponytail
node ~/Developer/ponytail/scripts/cursor-hooks.js install
```

That merges into `~/.cursor/hooks.json` only. Do **not** copy ponytail paths into the repo `hooks.json`.

If you use the always-on rule `.cursor/rules/ponytail.mdc`, ponytail hooks defer to the rule (see ponytail docs).

## Optional: Windows path for graft

If hooks fail to find graft, install globally once:

```bash
npm install -g @nanonets/graft
```

Or rely on project MCP (`npx -y @nanonets/graft mcp`) which populates the npx cache `graft-hooks.cjs` discovers.

## Verify

1. Cursor → **Customize → Hooks** → run a chat; confirm no `node: command not found`.
2. After Agent reads a file, Hooks output should show graft hook runs (or silent no-op if graft unavailable).

See also: `docs/internal/principal-engineer-playbook.md` (Top 10 #3).
