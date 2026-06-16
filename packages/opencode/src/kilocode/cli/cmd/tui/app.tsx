/**
 * Kilo-specific TUI app customizations.
 *
 * Everything in this module is called from the shared upstream `app.tsx`
 * via thin integration points so the upstream diff stays minimal.
 */

import { createEffect, createMemo, createSignal, on } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import * as Clipboard from "@tui/util/clipboard"
import { useCommandPalette } from "@tui/context/command-palette"
import { useBindings } from "@tui/keymap"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import { useProject } from "@tui/context/project"
import { useArgs } from "@tui/context/args"
import { useDialog } from "@tui/ui/dialog"
import { useToast } from "@tui/ui/toast"
import { useTheme } from "@tui/context/theme"
import { DialogAlert } from "@tui/ui/dialog-alert"
import { DialogSelect } from "@tui/ui/dialog-select"
import { Link } from "@tui/ui/link"
import { isKiloError, showKiloErrorToast } from "@/kilocode/kilo-errors"
import { registerKiloCommands } from "@/kilocode/kilo-commands"
import { initializeTUIDependencies } from "@kilocode/kilo-gateway/tui"
import { DialogProcessList } from "@/kilocode/cli/cmd/tui/component/dialog-process-list"
import { useIndexingWarnings } from "@/kilocode/cli/cmd/tui/indexing-warning"
import * as AutoApprove from "@/kilocode/cli/cmd/tui/auto-approve"

// Re-export so upstream can render the route without importing directly
export { KiloClawView } from "@/kilocode/claw/view"

// Hot reload TUI-local settings (keybinds/theme/ui) when changed from the Kilo Console.
// Called from the App body (below SDKProvider and the TuiConfig provider).
export { useTuiConfigHotReload } from "@/kilocode/cli/cmd/tui/context/tui-config-hot-reload"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default terminal window title. */
export const APP_TITLE = "Kilo CLI"

/** Public docs URL shown in the command palette. */
export const DOCS_URL = "https://kilo.ai/docs"

/** Human-readable product name used in user-facing messages. */
export const APP_NAME = "Kilo"

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function isAllowEverything(permission: unknown): boolean {
  if (typeof permission !== "object" || permission === null) return false
  const wildcard = (permission as Record<string, unknown>)["*"]
  if (typeof wildcard === "string") return wildcard === "allow"
  if (typeof wildcard === "object" && wildcard !== null) return (wildcard as Record<string, unknown>)["*"] === "allow"
  return false
}

// ---------------------------------------------------------------------------
// Session effects
// ---------------------------------------------------------------------------

/**
 * Reactive effects for session management:
 * - Notify the server which session the user is viewing (live indicators)
 * - Evict per-session data from the store when navigating away
 *
 * Must be called inside the App component body (needs SolidJS owner).
 */
export function useSessionEffects(deps: {
  route: ReturnType<typeof import("@tui/context/route").useRoute>
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
}) {
  const pty = process.env.KILO_PTY_ID
  const state = { prev: "" }

  // Notify server which session the user is viewing
  createEffect(() => {
    const sessionID = deps.route.data.type === "session" ? deps.route.data.sessionID : undefined
    deps.sdk.client.session.viewed({ focused: sessionID ? [sessionID] : [] }).catch(() => {})

    if (!pty) return
    const session = sessionID ? deps.sync.session.get(sessionID) : undefined
    const key = [sessionID ?? "", session?.title ?? ""].join("\n")
    if (key === state.prev) return
    state.prev = key

    deps.sdk.client.pty
      .update({
        ptyID: pty,
        sessionID: sessionID ?? null,
        ...(session?.title ? { title: session.title } : {}),
      })
      .catch(() => {})
  })

  // Evict per-session data from store when navigating away
  createEffect(
    on(
      () => (deps.route.data.type === "session" ? deps.route.data.sessionID : undefined),
      (current, prev) => {
        if (prev && prev !== current) deps.sync.session.evict(prev)
      },
    ),
  )
}

// ---------------------------------------------------------------------------
// Terminal title
// ---------------------------------------------------------------------------

/**
 * Returns the terminal title for kiloclaw routes.
 * Returns undefined for other routes (caller should handle them).
 */
export function getTerminalTitle(
  route: ReturnType<typeof import("@tui/context/route").useRoute>,
  base: string,
): string | undefined {
  if (route.data.type === "kiloclaw") return `${base} | KiloClaw`
  return undefined
}

// ---------------------------------------------------------------------------
// Session error handling
// ---------------------------------------------------------------------------

/**
 * Intercepts Kilo-specific errors and shows a warning toast.
 * Returns `true` if the error was handled, `false` otherwise.
 */
export function handleSessionError(error: unknown, toast: ReturnType<typeof useToast>): boolean {
  if (error && typeof error === "object" && isKiloError(error as any)) {
    showKiloErrorToast(error as any, toast)
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * One-shot initialiser called from the App component body.
 *
 * - Injects TUI dependencies into kilo-gateway
 * - Registers Kilo Gateway commands (profile, teams, kiloclaw, etc.)
 * - Registers the auto-approve toggle command
 */
export function init() {
  const args = useArgs()
  const route = useRoute()
  const sync = useSync()
  const sdk = useSDK()
  const project = useProject()
  const toast = useToast()
  const dialog = useDialog()
  const state = AutoApprove.create()
  const boot = { enabled: args.autoApprove === true }
  const [tick, setTick] = createSignal(0)
  const current = createMemo(() => {
    if (route.data.type !== "session") return undefined
    return AutoApprove.root(sync.session.get(route.data.sessionID))
  })
  const active = () => {
    tick()
    return AutoApprove.active(state, current())
  }
  const bump = () => setTick((value) => value + 1)
  const reply = (req: AutoApprove.Request, root: string) => {
    if (!AutoApprove.active(state, root)) return
    AutoApprove.mark(state, req)
    void sdk.client.permission
      .reply({
        requestID: req.id,
        reply: "once",
        workspace: project.workspace.current(),
      })
      .then(
        (result) => {
          if (!result.error) return
          AutoApprove.unmark(state, req.id)
          toast.show({
            variant: "error",
            message: "Failed to auto-approve permission request",
          })
          bump()
        },
        (err) => {
          const msg = err instanceof Error ? err.message : String(err)
          AutoApprove.unmark(state, req.id)
          toast.show({
            variant: "error",
            message: `Failed to auto-approve permission request: ${msg}`,
          })
          bump()
        },
      )
  }

  createEffect(() => {
    tick()
    AutoApprove.prune(state, AutoApprove.all(sync.data.permission))
    for (const root of AutoApprove.roots(state)) {
      const ids = AutoApprove.scope(root, sync.data.session)
      const reqs = AutoApprove.pending(ids, sync.data.permission)
      for (const req of AutoApprove.next(state, reqs)) reply(req, root)
    }
  })

  createEffect(() => {
    if (!boot.enabled) return
    const root = current()
    if (!root) return
    boot.enabled = false
    AutoApprove.enable(state, root)
    toast.show({
      variant: "warning",
      message: "Session auto-approve enabled. Permission prompts will be approved once.",
    })
    bump()
  })

  useIndexingWarnings()

  // Inject TUI dependencies for kilo-gateway
  initializeTUIDependencies({
    useCommandPalette,
    useSync,
    useDialog,
    useToast,
    useTheme,
    useSDK,
    DialogAlert,
    DialogSelect,
    Link,
    Clipboard,
    useKeyboard,
    TextAttributes,
  })

  // Register Kilo Gateway commands (profile, teams, kiloclaw, remote, etc.)
  registerKiloCommands(useSDK)

  // Register auto-approve toggle
  useBindings(() => ({
    commands: [
      {
        namespace: "palette",
        name: "background_process.list",
        title: "Background processes",
        desc: "List and manage tracked background processes",
        category: "Kilo",
        slashName: "process",
        slashAliases: ["processes"],
        run: () => {
          dialog.replace(() => <DialogProcessList />)
        },
      },
      {
        namespace: "palette",
        name: "permission.allow_everything",
        get title() {
          return isAllowEverything(sync.data.config.permission)
            ? "Disable global auto-approve mode"
            : "Enable global auto-approve mode"
        },
        desc: "Persist auto-approve for all sessions in config",
        category: "System",
        run: async () => {
          const enabled = isAllowEverything(sync.data.config.permission)
          const result = await sdk.client.permission.allowEverything({ enable: !enabled })
          if (result.error) {
            toast.show({
              variant: "error",
              message: `Failed to ${!enabled ? "enable" : "disable"} auto-approve mode`,
            })
            return
          }
          dialog.clear()
        },
      },
      {
        namespace: "palette",
        name: "permission.auto_approve_session",
        get title() {
          return active() ? "Disable session auto-approve" : "Enable session auto-approve"
        },
        desc: "Approve permission prompts once for this session",
        category: "System",
        slashName: "auto-approve",
        slashAliases: ["yolo"],
        run: () => {
          const root = current()
          if (!root) {
            toast.show({
              variant: "warning",
              message: "Open a session before enabling auto-approve.",
            })
            return
          }
          const enabled = AutoApprove.toggle(state, root)
          toast.show({
            variant: enabled ? "warning" : "info",
            message: enabled
              ? "Session auto-approve enabled. Permission prompts will be approved once."
              : "Session auto-approve disabled.",
          })
          bump()
          dialog.clear()
        },
      },
    ],
  }))
}
