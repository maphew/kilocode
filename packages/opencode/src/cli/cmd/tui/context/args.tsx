import { createSimpleContext } from "./helper"

export interface Args {
  model?: string
  agent?: string
  autoApprove?: boolean // kilocode_change
  prompt?: string
  continue?: boolean
  sessionID?: string
  fork?: boolean
}

export const { use: useArgs, provider: ArgsProvider } = createSimpleContext({
  name: "Args",
  init: (props: Args) => props,
})
