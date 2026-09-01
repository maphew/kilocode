import { Schema } from "../../../.kilo/node_modules/effect/dist/index.js"
// ToolStateCompleted.metadata in v1 is Record(String, Any) per opencode/src/session/session.ts
// But reporter sees metadata.variant as Json. Test ToolState schema directly.
const meta = { parentSessionId: "ses_a", sessionId: "ses_b", model: { modelID: "m", providerID: "p" }, variant: undefined }
const StructVariantJson = Schema.Struct({ variant: Schema.Json })
try {
  const r = Schema.encodeSync(StructVariantJson)(meta)
  console.log("Struct variant Json OK:", JSON.stringify(r))
} catch (e) {
  console.log("Struct variant Json FAIL:", e.message)
}
// Record with Json values nested in struct: metadata
const Outer = Schema.Struct({ metadata: Schema.Record(Schema.String, Schema.Json) })
try {
  const r = Schema.encodeSync(Outer)({ metadata: meta })
  console.log("Outer metadata Json OK:", JSON.stringify(r))
} catch (e) {
  console.log("Outer metadata Json FAIL:", e.message)
}
