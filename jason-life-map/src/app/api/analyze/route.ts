import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "伺服器未設定 OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { transcript, existingProfile } = await req.json();

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: "沒有內容可以分析" }, { status: 400 });
    }

    const existingContext = existingProfile
      ? `已知資訊（避免重複列出，只找新的內容）：
家庭：${(existingProfile.family || []).join("、") || "無"}
工作：${(existingProfile.work || []).join("、") || "無"}
不動產：${
          Object.entries(existingProfile.property || {})
            .map(([k, v]) => `${k}：${v}`)
            .join("、") || "無"
        }
人生目標：${(existingProfile.life_goals || []).join("、") || "無"}
在乎的事：${(existingProfile.concerns || []).join("、") || "無"}
抗拒點：${(existingProfile.resistance || []).join("、") || "無"}
決策者：${(existingProfile.decision_makers || []).join("、") || "無"}`
      : "目前沒有任何已知資訊。";

    const systemPrompt = `你是一位資深保險/理財顧問的助理，擅長從業務員跟客戶的談話紀錄中，整理出對後續銷售與服務有幫助的重點。這位顧問的專長是房地產與人生規劃結合，所以客戶名下的不動產細節特別重要，不能隨便帶過。

請只回傳 JSON，格式如下，不要加任何說明文字：
{
  "summary": "一句話摘要這次談話",
  "family_updates": ["新發現的家庭成員或家庭狀況"],
  "work_updates": ["新發現的工作/收入來源"],
  "financial_updates": ["新發現的財務資訊，格式為「項目：內容」，例如「房貸：每月3萬」"],
  "property_updates": ["新發現的不動產資訊，格式為「項目：內容」。只要談話中有提到房子，務必盡量拆成以下四項分別列出（每間房子分開列，不要混在一起）：「地點」（買在哪裡，例如「地點：新北三重」）、「持有年數」（買入幾年了，例如「持有年數：10年」）、「每月還款」（房貸每月要繳多少，例如「每月還款：2萬」，如果已繳清就寫「每月還款：已繳清」）、「持有狀態」（是自住、出租、還是其他用途，例如「持有狀態：自住」）。如果談話中沒提到某一項，就不要編造，只列有提到的部分"],
  "life_goal_updates": ["新發現的人生規劃或目標"],
  "concerns": ["客戶在乎、擔心的事"],
  "resistance": ["客戶的抗拒點、雷點、疑慮"],
  "decision_makers": ["這件事誰有決定權，例如「太太」"],
  "competitors": ["提到的其他保險/理財顧問或既有金融關係，簡短描述"],
  "important_quotes": ["值得記住的原話，1-2句"],
  "potential_needs": ["可能適合推薦的商品或服務方向"],
  "missing_information": ["還不清楚、下次該問的基本資訊。如果客戶有提到房子但漏了地點、持有年數、每月還款、持有狀態這四項裡的任何一項，把「還沒問到房子的OOO」加進這裡，提醒業務員下次要補問"],
  "next_questions": ["下次見面該問的具體問題"],
  "avoid_topics": ["這次談話顯示該避開的話題"],
  "follow_up_suggestion": "建議的追蹤方式與時間點"
}

如果某個欄位沒有新資訊，回傳空陣列 []，不要瞎猜或硬湊內容。`;

    const userPrompt = `${existingContext}

這次的談話逐字稿：
${transcript}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error(errText);
      return NextResponse.json({ error: "分析失敗，請再試一次" }, { status: 500 });
    }

    const completion = await openaiRes.json();
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const analysis = JSON.parse(raw);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "分析失敗，請再試一次" }, { status: 500 });
  }
}
