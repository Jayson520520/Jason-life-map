// Phase 3: wires up OpenAI Speech-to-Text.
// Kept as an isolated module so the provider can be swapped later
// without touching any UI code.

export interface TranscribeResult {
  transcript: string;
}

export async function transcribeAudio(
  _audioBlob: Blob
): Promise<TranscribeResult> {
  throw new Error("transcribeAudio: not implemented until Phase 3");
}
