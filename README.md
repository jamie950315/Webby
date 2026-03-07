<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally. Webby uses OpenRouter to allow using various OpenAI-compatible models (e.g., `openai/gpt-5.4` or `google/gemini-3-flash-preview`) for prompt enhancement and code generation.

View your app in AI Studio: https://ai.studio/apps/71818307-c7f7-41b0-8545-9acd3ca47c3d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `OPENROUTER_API_KEY` in [.env.local](.env.local) to your OpenRouter API key
3. Run the app:
   `npm run dev`
