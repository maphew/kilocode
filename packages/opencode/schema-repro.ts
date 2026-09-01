import { Schema } from "effect"
import { SessionV1 } from "@opencode-ai/core/v1/session"

const meta = {
  parentSessionId: "ses_a",
  sessionId: "ses_b",
  model: { modelID: "m", providerID: "p" },
  variant: undefined,
}

const toolPart = {
  id: "p1",
  sessionID: "ses_a",
  messageID: "msg_1",
  type: "tool",
  tool: "task",
  state: { status: "completed", input: {}, output: "done", title: "t", time: { start: 0, end: 1 }, metadata: meta },
}

try {
  const decoded = Schema.decodeUnknownSync(SessionV1.Part)(toolPart)
  const encoded = Schema.encodeSync(SessionV1.Part)(decoded)
  console.log("ENCODED OK:", JSON.stringify(encoded.state.metadata))
} catch (e) {
  console.log("ENCODE FAIL:", (e as Error).message)
}
