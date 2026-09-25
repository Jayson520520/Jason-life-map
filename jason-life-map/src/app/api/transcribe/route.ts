import { NextRequest, NextResponse } from "next/server";

// Fluid compute gives Hobby up to 300s by default, but we set this
// explicitly so behavior doesn't depend on project-level defaults.
export const maxDuration = 120;
export const runtime = "nodejs";

// Receives a Supabase Storage signed URL (JSON body: { audioUrl }) rather
// than the raw audio file. The audio never passes through this function's
// REQUEST body, so it isn't subject to Vercel's 4.5MB request body limit —
// only the (tiny) JSON payload is. We fetch the audio server-side, then
// forward it to OpenAI's Whisper endpoint.
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "伺服器缺少 OPENAI_API_KEY 設定" },
      { status: 500 }
    );
  }

  let audioUrl: string | undefined;
  try {
    const body = await req.json();
    audioUrl = body?.audioUrl;
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (!audioUrl) {
    return NextResponse.json({ error: "沒有收到音檔網址" }, { status: 400 });
  }

  // Fetch the recording from Supabase Storage (signed URL, so no auth
  // header needed here).
  let audioBuffer: ArrayBuffer;
  let contentType = "audio/webm";
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: "無法讀取錄音檔，請再試一次" },
        { status: 502 }
      );
    }
    contentType = audioRes.headers.get("content-type") || contentType;
    audioBuffer = await audioRes.arrayBuffer();
  } catch (err) {
    console.error("Failed to fetch audio from storage:", err);
    return NextResponse.json(
      { error: "無法讀取錄音檔，請再試一次" },
      { status: 502 }
    );
  }

  // Whisper's hard limit is 25MB per file.
  const MAX_BYTES = 25 * 1024 * 1024;
  if (audioBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "錄音檔太大（超過 25MB），請分段錄製" },
      { status: 400 }
    );
  }

  const whisperForm = new FormData();
  const filename = contentType.includes("mp4") ? "recording.mp4" : "recording.webm";
  whisperForm.append("file", new Blob([audioBuffer], { type: contentType }), filename);
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
