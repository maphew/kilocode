import { describe, expect, test } from "bun:test"
import * as AutoApprove from "../../../../../src/kilocode/cli/cmd/tui/auto-approve"

describe("tui auto approve", () => {
  test("scopes a root session with its task children", () => {
    const ids = AutoApprove.scope("root", [
      { id: "root" },
      { id: "task", parentID: "root" },
      { id: "other" },
    ])

    expect([...ids].toSorted()).toEqual(["root", "task"])
  })

  test("uses a parent session as the auto-approve root", () => {
    expect(AutoApprove.root({ id: "task", parentID: "root" })).toBe("root")
    expect(AutoApprove.root({ id: "root" })).toBe("root")
  })

  test("tracks enabled session roots independently", () => {
    const state = AutoApprove.create()

    expect(AutoApprove.toggle(state, "one")).toBe(true)
    expect(AutoApprove.toggle(state, "two")).toBe(true)
    expect(AutoApprove.active(state, "one")).toBe(true)
    expect(AutoApprove.active(state, "two")).toBe(true)
    expect(AutoApprove.toggle(state, "one")).toBe(false)

    expect(AutoApprove.active(state, "one")).toBe(false)
    expect(AutoApprove.active(state, "two")).toBe(true)
  })

  test("returns only unreplied pending requests", () => {
    const state = AutoApprove.create()
    const reqs = [
      { id: "a", sessionID: "root" },
      { id: "b", sessionID: "task" },
    ]

    AutoApprove.mark(state, reqs[0])

    expect(AutoApprove.next(state, reqs).map((req) => req.id)).toEqual(["b"])
  })

  test("collects pending requests in session scope", () => {
    const reqs = AutoApprove.pending(new Set(["root", "task"]), {
      root: [{ id: "a", sessionID: "root" }],
      task: [{ id: "b", sessionID: "task" }],
      other: [{ id: "c", sessionID: "other" }],
    })

    expect(reqs.map((req) => req.id)).toEqual(["a", "b"])
  })

  test("prunes stale reply tracking", () => {
    const state = AutoApprove.create()
    AutoApprove.mark(state, { id: "stale", sessionID: "root" })
    AutoApprove.mark(state, { id: "live", sessionID: "root" })

    AutoApprove.prune(state, [{ id: "live", sessionID: "root" }])

    expect([...state.replied]).toEqual(["live"])
  })
})
