# Webby - 演化式網頁建構器

[English (英文)](./README.md)

Webby 是一個使用 React、Vite 和 Tailwind CSS 打造的演化式網站建構平台。它利用 OpenRouter API（透過 OpenAI SDK）生成網頁，並採用獨特的「錦標賽賽制（Tournament-style bracket system）」來逐步優化與篩選網站設計。

## 核心概念

*   **錦標賽賽制 (Tournament Bracket)**：系統的核心機制是並排顯示兩個由 AI 生成的設計方案。使用者的每一次選擇都會讓優勝設計在二元樹狀結構（`BracketNode`）中晉級，直到選出最終的完美設計。
*   **即時串流生成 (Streaming AI Responses)**：享受即時的回饋體驗。Webby 使用 OpenAI SDK 串流 OpenRouter 的回應，在模型生成 HTML、CSS 和 JavaScript 程式碼的同時立即渲染畫面。
*   **安全的 Iframe 預覽 (Safe Iframe Previews)**：所有生成的 HTML、CSS 和 JavaScript 程式碼都會被封裝在隔離的 `<iframe>` 元素中安全地渲染，確保 AI 生成的程式碼不會干擾主要的 React 應用程式。

## 系統架構

*   **`src/App.tsx`**：主要的應用程式元件，負責管理三個不同的階段：
    *   `setup`（設定）：獲取使用者最初的提示並對其進行擴展與強化。
    *   `tournament`（錦標賽）：並排顯示候選設計並管理二元樹錦標賽流程。
    *   `result`（結果）：顯示最終的優勝設計，並提供複製或下載程式碼的選項。
*   **`src/services/openrouter.ts`**：負責處理與 OpenRouter API 的所有互動。允許使用者指定特定的模型（例如 `openai/gpt-5.4` 或 `google/gemini-3-flash-preview`）。主要處理：
    *   `enhancePrompt`：將使用者初步的想法擴展為詳盡完整的提示詞。
    *   `generateCandidateStream`：生成初始的設計候選方案（包含 HTML、CSS、JS 以及設計理念）。
*   **`src/i18n.ts`**：負責處理應用程式使用者介面的多國語言與在地化翻譯。

## 開始使用

### 系統需求

*   Node.js
*   一組 [OpenRouter API](https://openrouter.ai/) 金鑰

### 安裝與設定

1.  **安裝依賴套件**:
    ```bash
    npm install
    ```

2.  **設定環境變數**:
    在專案根目錄下建立或是修改 `.env.local` 檔案，並加入您的 OpenRouter API 金鑰：
    ```env
    OPENROUTER_API_KEY=在此填入您的_openrouter_api_key
    ```

3.  **啟動本地開發伺服器**:
    ```bash
    npm run dev
    ```

### 可用的腳本指令

*   `npm run dev`：啟動本地開發伺服器。
*   `npm run build`：建置正式生產版本。
*   `npm run preview`：在本地預覽建置好的生產版本。
*   `npm run lint`：執行型別檢查（執行 `tsc --noEmit`）。
*   `npm run clean`：清除所有的建置產物資料夾。