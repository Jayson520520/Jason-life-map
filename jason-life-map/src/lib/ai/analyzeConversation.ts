// Phase 2: wires up the LLM call that turns a raw transcript into the
// structured AiAnalysis JSON (see spec section 七). Kept as an isolated
// module so the provider can be swapped later without touching any UI code.
//
// Hard rules for the eventual prompt (spec section 八):
// - only summarize what the user actually said
// - never guess income / assets / family details
// - inferences must be labelled 可能 / 待確認 / 建議詢問
// - product is never the focus — understand life stage first
// - missing information is reported as 待了解, never invented

import { AiAnalysis } from "@/types";

export async function analyzeConversation(
  _transcript: string,
  _existingProfileContext?: string
): Promise<AiAnalysis> {
  throw new Error("analyzeConversation: not implemented until Phase 2");
}
