# 客戶人生地圖（人生。房產。學）

Phase 1 — 專案結構 + Supabase schema + UI（mock data，尚未串 AI）

## 目前檔案結構

```
jason-life-map/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── .env.local.example
├── supabase/
│   └── schema.sql              ← customers / conversations /
│                                  customer_profiles / next_actions
│                                  + RLS policies + audio bucket
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx             ← 導向 /customers
    │   ├── login/page.tsx       ← Supabase Auth 登入
    │   └── customers/
    │       ├── page.tsx         ← 客戶列表（搜尋 + 新增客戶按鈕）
    │       ├── new/page.tsx     ← 新增客戶（只有姓名必填）
    │       └── [id]/page.tsx    ← 客戶詳細頁（A–I 卡片 + 時間軸）
    ├── components/
    │   ├── CustomerCard.tsx
    │   ├── ProfileCard.tsx
    │   └── RelationshipLevel.tsx
    ├── lib/
    │   ├── mockData.ts           ← 陳小姐／王先生範例資料
    │   ├── supabase/
    │   │   ├── client.ts         ← 瀏覽器端 client
    │   │   └── server.ts         ← 伺服器端 client
    │   └── ai/
    │       ├── transcribe.ts         ← stub，Phase 3 串接
    │       └── analyzeConversation.ts ← stub，Phase 2 串接
    └── types/index.ts
```

## 已完成頁面

- **登入頁** `/login` — Supabase Auth（email + password），尚未加上路由保護
- **客戶列表** `/customers` — 搜尋、＋新增客戶、客戶卡片（焦點／下一步）
- **新增客戶** `/customers/new` — 姓名必填，其餘欄位選填
- **客戶詳細頁** `/customers/[id]`：
  - 姓名／年齡／職業／最近互動／關係程度（1–5）
  - 家庭、工作、財務輪廓、人生想法、在乎的事情、抗拒／雷點、
    決策者、競爭者、下一步 — 九張卡片，無資料時顯示「待了解」
  - 談話紀錄時間軸，可展開看逐字稿
  - 🎙 說一段新的紀錄 / ✏️ 新增文字紀錄 — 按鈕已就位，
    目前顯示「下一階段開放」提示（尚未串語音／AI）

目前列表與詳細頁都讀 `src/lib/mockData.ts`，尚未接 Supabase 讀寫。

## 下一步準備做什麼（等你確認後進 Phase 2）

1. 把客戶列表／新增／詳細頁改接 Supabase（取代 mock data）
2. 新增文字紀錄的輸入畫面
3. `analyzeConversation.ts` 串接 LLM，回傳規格書第七節的 JSON 格式
4. AI 確認頁（本次摘要 / 新增資訊 / AI 觀察 / 下次建議問 / 目前不要急著談
   + 確認儲存／修改／放棄）

## 本機執行方式

```bash
npm install
cp .env.local.example .env.local   # 填入 Supabase 專案的 URL / anon key
npm run dev
```

`supabase/schema.sql` 需要在你的 Supabase 專案的 SQL Editor 執行一次，
建立資料表、RLS 政策，以及錄音用的 private storage bucket。
