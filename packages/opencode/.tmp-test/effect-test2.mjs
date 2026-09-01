import { Schema } from "../../../.kilo/node_modules/effect/dist/index.js"

// ToolStateCompleted.metadata = Record(String, Any) - test undefined value
const meta = { parentSessionId: "ses_a", sessionId: "ses_b", model: { modelID: "m", providerID: "p" }, variant: undefined }
for (const [name, schema] of [
  ["Record Any", Schema.Record(Schema.String, Schema.Any)],
  ["Record Unknown", Schema.Record(Schema.String, Schema.Unknown)],
  ["Record Json", Schema.Record(Schema.String, Schema.Json)],
]) {
  try {
    const r = Schema.encodeSync(schema)(meta)
    console.log(name, "encode OK:", JSON.stringify(r))
  } catch (e) {
    console.log(name, "encode FAIL:", e.message)
  }
}

// Struct with variant: optional string
const StructVariant = Schema.Struct({ parentSessionId: Schema.String, sessionId: Schema.String, model: Schema.Any, variant: Schema.optional(Schema.String) })
try {
  const r = Schema.encodeSync(StructVariant)(meta)
  console.log("Struct optional variant OK:", JSON.stringify(r))
} catch (e) {
  console.log("Struct optional variant FAIL:", e.message)
}

// Array of objects each with metadata.variant - matching the reported path [0]["metadata"]["variant"]
const arrSchema = Schema.Array(Schema.Struct({ metadata: Schema.Record(Schema.String, Schema.Json) }))
try {
  const r = Schema.encodeSync(arrSchema)([{ metadata: meta }])
  console.log("Array metadata Json OK:", JSON.stringify(r))
} catch (e) {
  console.log("Array metadata Json FAIL:", e.message)
}
