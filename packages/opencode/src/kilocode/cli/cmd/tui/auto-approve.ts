export type Session = {
  id: string
  parentID?: string | null
}

export type Request = {
  id: string
  sessionID: string
}

export type State = {
  enabled: Set<string>
  replied: Set<string>
}

export function create(): State {
  return {
    enabled: new Set(),
    replied: new Set(),
  }
}

export function root(session?: Session) {
  return session?.parentID ?? session?.id
}

export function active(state: State, root?: string) {
  return root ? state.enabled.has(root) : false
}

export function roots(state: State) {
  return [...state.enabled]
}

export function toggle(state: State, root: string) {
  if (state.enabled.has(root)) {
    state.enabled.delete(root)
    return false
  }
  state.enabled.add(root)
  return true
}

export function enable(state: State, root: string) {
  state.enabled.add(root)
}

export function scope(root: string, sessions: Session[]) {
  return new Set(
    sessions.filter((session) => session.id === root || session.parentID === root).map((session) => session.id),
  )
}

export function pending(ids: Set<string>, map: Record<string, Request[] | undefined>) {
  return [...ids].flatMap((id) => map[id] ?? [])
}

export function all(map: Record<string, Request[] | undefined>) {
  return Object.values(map).flatMap((reqs) => reqs ?? [])
}

export function next(state: State, reqs: Request[]) {
  return reqs.filter((req) => !state.replied.has(req.id))
}

export function mark(state: State, req: Request) {
  state.replied.add(req.id)
}

export function unmark(state: State, id: string) {
  state.replied.delete(id)
}

export function prune(state: State, reqs: Request[]) {
  const ids = new Set(reqs.map((req) => req.id))
  for (const id of state.replied) {
    if (!ids.has(id)) state.replied.delete(id)
  }
}
