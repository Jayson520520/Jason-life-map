import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "伺服器未設定 OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const audio = formData.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "缺少音檔" }, { status: 400 });
  }

  const openaiForm = new FormData();
  openaiForm.append("file", audio, "recording.webm");
  openaiForm.append("model", "whisper-1");
  openaiForm.append("language", "zh");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: openaiForm,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `轉錄失敗：${text}` }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ transcript: data.text as string });
}
