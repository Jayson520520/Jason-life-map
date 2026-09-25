import { NextRequest, NextResponse } from "next/server";

// Allow up to 60s for this function on Vercel (Hobby plan max; raise if
// you're on Pro and need more headroom for longer recordings).
export const maxDuration = 60;
export const runtime = "nodejs";

// Receives the recorded audio as multipart/form-data (field name "audio"),
// forwards it to OpenAI's Whisper transcription endpoint, and returns the
// resulting text. Uses a direct fetch call rather than the openai package,
// matching the /api/analyze route's convention.
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "伺服器缺少 OPENAI_API_KEY 設定" },
      { status: 500 }
    );
  }

  let incomingForm: FormData;
  try {
    incomingForm = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "讀取音檔失敗，請再試一次" },
      { status: 400 }
    );
  }

  const audio = incomingForm.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "沒有收到音檔" },
      { status: 400 }
    );
  }

  // Whisper's hard limit is 25MB per file.
  const MAX_BYTES = 25 * 1024 * 1024;
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "錄音檔太大（超過 25MB），請分段錄製" },
      { status: 400 }
    );
  }

  const whisperForm = new FormData();
  // Whisper is picky about having a filename with a real extension.
  const filename =
    audio instanceof File && audio.name ? audio.name : "recording.webm";
  whisperForm.append("file", audio, filename);
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "zh");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperForm,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Whisper API error:", res.status, detail);
      return NextResponse.json(
        { error: "轉錄失敗，請再試一次" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { text?: string };
    if (!data.text) {
      return NextResponse.json(
        { error: "轉錄結果是空的，請再試一次" },
        { status: 502 }
      );
    }

    return NextResponse.json({ transcript: data.text });
  } catch (err) {
    console.error("Transcribe route failed:", err);
    return NextResponse.json(
      { error: "轉錄失敗，請再試一次" },
      { status: 500 }
    );
  }
}
