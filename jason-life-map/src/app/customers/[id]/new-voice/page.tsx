"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSession";

type Status = "idle" | "recording" | "transcribing" | "review" | "saving";

export default function NewVoiceConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        handleTranscribe(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setSeconds(0);
      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("無法使用麥克風，請確認已允許權限");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setStatus("transcribing");
  }

  async function handleTranscribe(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "轉錄失敗，請再試一次");
        setStatus("idle");
        return;
      }
      setTranscript(data.transcript || "");
      setStatus("review");
    } catch {
      setError("轉錄失敗，請再試一次");
      setStatus("idle");
    }
  }

  async function handleSave() {
    if (!user || !transcript.trim()) return;
    setStatus("saving");
    setError(null);

    let audioPath: string | null = null;
    if (audioBlob) {
      const path = `${user.id}/${params.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabaseBrowser.storage
        .from("conversation-audio")
        .upload(path, audioBlob, { contentType: audioBlob.type });
      if (!uploadError) audioPath = path;
    }

    const { error: insertError } = await supabaseBrowser
      .from("conversations")
      .insert({
        customer_id: params.id,
        user_id: user.id,
        input_type: "voice",
        audio_url: audioPath,
        transcript: transcript.trim(),
        summary: transcript.trim().slice(0, 60),
      });

    if (insertError) {
      setError("儲存失敗，請再試一次");
      setStatus("review");
      return;
    }

    await supabaseBrowser
      .from("customers")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.id);

    router.push(`/customers/${params.id}`);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper pb-10">
      <header className="flex items-center gap-3 px-5 pb-4 pt-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted"
          aria-label="返回"
        >
          ← 返回
        </button>
      </header>

      <div className="px-5">
        <h1 className="font-serif text-xl font-medium text-ink">
          新增語音紀錄
        </h1>
      </div>

      <div className="mt-8 flex flex-col items-center px-5">
        {status === "idle" && (
          <button
            onClick={startRecording}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-navy text-3xl text-white active:bg-navy-light"
            aria-label="開始錄音"
          >
            🎙
          </button>
        )}

        {status === "recording" && (
          <>
            <p className="mb-4 font-mono text-2xl text-ink">
              {formatTime(seconds)}
            </p>
            <button
              onClick={stopRecording}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white active:bg-red-700"
            >
              停止
            </button>
          </>
        )}

        {status === "transcribing" && (
          <p className="text-sm text-muted">正在轉成文字...</p>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {status === "review" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="mt-6 flex flex-col gap-4 px-5"
        >
          <p className="text-xs text-muted">
            以下是轉錄結果，可以直接修改再儲存
          </p>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            className="w-full rounded-card border border-line bg-white p-3 text-sm text-ink"
          />
          <button
            type="submit"
            disabled={status !== "review" || !transcript.trim()}
            className="flex items-center justify-center rounded-card bg-navy py-3.5 text-sm font-medium text-white active:bg-navy-light disabled:opacity-50"
          >
            儲存紀錄
          </button>
        </form>
      )}

      {status === "saving" && (
        <p className="mt-6 text-center text-sm text-muted">儲存中...</p>
      )}
    </main>
  );
}
