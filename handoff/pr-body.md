fix(text editor): keep collapsed list items sane on Enter (#11256)
======================================================================

## Why

Issue #11256 reports two Enter-key bugs for collapsed list items.

1. Pressing Enter at the end of a collapsed item inserts the new empty item between
   the parent and its hidden children. The children re-nest under the new line
   instead of staying under the parent.
2. With the caret in a child, the user collapses the parent. The visual caret moves
   onto the parent line, but the model caret stays inside the now-hidden child. A
   subsequent Enter edits invisible content.

## What

- `toggleCollapsed` now moves the model caret to the end of the parent's own content
  when the selection is inside one of the item's nested blocks at the moment the
  user collapses it. The expand path is unchanged.
- The post-fixer in `_enableAutoExpand` gains a new branch that detects the
  Enter-driven shape (an empty freshly-inserted block sitting in front of a
  collapsed ancestor's hidden run, with the same indent), drops the `listCollapsed`
  attribute on the new block, and moves the new block to after the deepest run of
  hidden siblings. Detection uses the existing `insertedNodes` set so a
  programmatic insert of the same shape is left alone.
- New tests cover the to-do repro from the issue, a two-level hidden subtree, and
  the in-child caret move.

## Out of scope

- Enter pressed in the *middle* of a collapsed parent is not handled by this change.
  A mid-text split produces a non-empty new block; the current `isEmpty` check
  skips it, so the children still re-nest under the new line. A follow-up could
  broaden the predicate to non-empty new blocks with the same indent; left out to
  keep this fix tight.

## Validation

- `pnpm typecheck`: no errors.
- `git diff --check`: clean.
- The unit tests for this plugin run in a real browser via webdriverio + Chrome;
  CI exercises them.

## Related

- #11256
- Plugin introduced in #10138; subsequent fixes in #10637.
- No other open PRs touch `collapsible_list_items.ts`.
