# Handoff: TriliumNext/Trilium — fix for #11256 (collapsed-list Enter bugs)

## Status in this session

- Branch `fix/collapsed-list-enter-11256` is committed locally (commit `af17e7770`,
  base `TriliumNext/Trilium@main`).
- Patch: `0001-fix-collapsed-list-enter-11256.patch` (12 KB, ~150 line diff across
  2 files).
- `pnpm typecheck` clean, `git diff --check` clean.
- The spec suite for this plugin needs a real browser (webdriverio + Chrome) — not
  available in this sandbox. CI will run it.
- Adversarial review by a second agent (general subagent) was applied. Final recommendations
  (narrow predicate with `insertedNodes`, use `Enter` instead of `Essentials`, no-op guard
  in `moveBlockAfterNestedRun`) are all in.

## What this session could NOT do

The `GH_TOKEN` available here can read `TriliumNext/Trilium` and the `maphew/Trilium` fork,
but is denied on:
- `git push` to `maphew/Trilium` (HTTP 403)
- `gh repo fork` (HTTP 403)
- `POST /repos/TriliumNext/Trilium/pulls` (HTTP 403, GraphQL: Resource not accessible by integration)

This is a token-scope limitation, not a missing piece of the work. The branch and the
patch are ready.

## What the other agent should do

On a machine with a token that can push to `maphew/Trilium` and open PRs against
`TriliumNext/Trilium`:

1. Apply the patch on a fresh branch off upstream `main`:

   ```bash
   git clone --filter=blob:none https://github.com/TriliumNext/Trilium.git
   cd Trilium
   git checkout -b fix/collapsed-list-enter-11256
   git am < /path/to/0001-fix-collapsed-list-enter-11256.patch
   ```

   Or copy the two touched files from `full.diff` and recreate the commit with the same
   message.

2. Push the branch:

   ```bash
   git push git@github.com:maphew/Trilium.git fix/collapsed-list-enter-11256
   ```

3. Open a draft PR against `TriliumNext/Trilium@main` with the body in
   `pr-body.md` (in this same handoff folder).

4. After CI is green and any requested review changes are addressed, mark ready for review.

## Triage notes for the next agent

- Issue: https://github.com/TriliumNext/Trilium/issues/11256
- Label: Easy
- No other open PR touches `packages/ckeditor5/src/plugins/collapsible_list_items.ts`.
- A separate, related PR for the same `maphew` identity (#11311) already covers #11204
  (slashes in search). No overlap with this fix.
- Two symptoms, one file, one defect class: post-fixer branch for symptom 1
  (Enter at end of collapsed item), `toggleCollapsed` change for symptom 2
  (caret in hidden child when collapse is requested).
- Out of scope (documented in PR body): mid-text split on a collapsed parent. The
  current predicate requires the new block to be empty (Enter at end of line), so a
  mid-text split is not fixed by this change. Follow-up if anyone files it.

## Files in this handoff

- `0001-fix-collapsed-list-enter-11256.patch` — `git format-patch` output, ready for `git am`.
- `full.diff` — `git diff HEAD~1` plain diff (no commit metadata).
- `diffstat.txt` — line count summary.
- `pr-body.md` — ready-to-paste PR title and body.

## Local repro (sanity check before push)

If the next machine has a browser, the easiest way to verify the fix:

1. Create a to-do list with a parent item and two children.
2. Collapse the parent via the gutter arrow.
3. Move the caret to the end of the parent line, press Enter.
   - Expected: a new sibling item appears below the (still collapsed) parent, children
     still nested under the parent. (Matches the issue's frame 4.)
4. With the caret in a child, click the gutter to collapse the parent.
   - Expected: the caret jumps to the end of the parent's own line, not the child.
