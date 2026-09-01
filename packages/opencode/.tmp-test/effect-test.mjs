import { Schema } from "../../../.kilo/node_modules/effect/dist/index.js"
const meta = { variant: undefined, model: { modelID: "m", providerID: "p" } }
const MetaSchema = Schema.Record(Schema.String, Schema.Any)
try {
  const r = Schema.encodeSync(MetaSchema)(meta)
  console.log("Record Any encode OK:", JSON.stringify(r))
} catch (e) {
  console.log("Record Any FAIL:", e.message)
}
const MetaJson = Schema.Record(Schema.String, Schema.Json)
try {
  const r = Schema.encodeSync(MetaJson)(meta)
  console.log("Record Json encode OK:", JSON.stringify(r))
} catch (e) {
  console.log("Record Json FAIL:", e.message)
}
const dec = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Any))
try {
  const r = dec(meta)
  console.log("Record Any decode OK:", JSON.stringify(r))
} catch (e) {
  console.log("Record Any decode FAIL:", e.message)
}
