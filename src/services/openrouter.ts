import OpenAI from "openai";

export interface Candidate {
  html: string;
  css: string;
  js: string;
  design_philosophy: string;
  raw?: string;
  isFinished?: boolean;
}

function getAI(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OpenRouter API Key is missing.");
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    dangerouslyAllowBrowser: true // often needed for client side calls
  });
}

export async function generateRandomIdea(model: string, lang: string = 'en', apiKey?: string): Promise<string> {
  const ai = getAI(apiKey);
  try {
    const response = await ai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: `Generate a single, creative, and brief website idea (max 10 words).
IMPORTANT: Give ONLY the idea, no extra text, explanations, or quotes.
IMPORTANT: You MUST output the response in the language code: ${lang}.

Examples:
- A coffee bean e-commerce site with dark mode
- A personal portfolio for a frontend developer
- A landing page for a new fitness app
- A modern dashboard for a SaaS product`
        }
      ],
    });
    return response.choices[0]?.message?.content?.trim() || "A creative portfolio website";
  } catch (error) {
    console.error("Error in generateRandomIdea:", error);
    throw error;
  }
}

export async function enhancePrompt(initialPrompt: string, model: string, lang: string = 'en', apiKey?: string): Promise<string> {
  console.log("Enhancing prompt for:", initialPrompt);
  const ai = getAI(apiKey);
  try {
    const response = await ai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: `Enhance this website idea into a detailed prompt including target audience, color scheme suggestions, essential sections (Hero, product list, footer, etc.), and interactive effects. Make it detailed but concise.
IMPORTANT: You MUST output the response in the language code: ${lang}.

Idea: ${initialPrompt}`
        }
      ],
    });
    console.log("Enhance response received:", response);
    return response.choices[0]?.message?.content || "Failed to generate enhanced prompt.";
  } catch (error) {
    console.error("Error in enhancePrompt:", error);
    throw error;
  }
}

function parseStreamedResponse(accumulated: string): Candidate {
  const philosophyMatch = accumulated.match(/<PHILOSOPHY>([\s\S]*?)(?:<\/PHILOSOPHY>|$)/i);
  const htmlMatch = accumulated.match(/<HTML>([\s\S]*?)(?:<\/HTML>|$)/i);
  const cssMatch = accumulated.match(/<CSS>([\s\S]*?)(?:<\/CSS>|$)/i);
  const jsMatch = accumulated.match(/<JS>([\s\S]*?)(?:<\/JS>|$)/i);

  return {
    design_philosophy: philosophyMatch ? philosophyMatch[1].trim() : "",
    html: htmlMatch ? htmlMatch[1].trim() : "",
    css: cssMatch ? cssMatch[1].trim() : "",
    js: jsMatch ? jsMatch[1].trim() : "",
    raw: accumulated,
    isFinished: false
  };
}

export async function* generateCandidateStream(prompt: string, variant: 'left' | 'right', model: string, lang: string = 'en', apiKey?: string): AsyncGenerator<Candidate, void, unknown> {
  const ai = getAI(apiKey);
  const variantInstruction = variant === 'left'
    ? "Make this design clean, minimal, and light-themed."
    : "Make this design bold, vibrant, and dark-themed.";

  const stream = await ai.chat.completions.create({
    model: model,
    stream: true,
    messages: [
      {
        role: "user",
        content: `Based on this detailed website prompt: "${prompt}".
Generate a complete, beautiful, and functional website design.
${variantInstruction}

Assume Tailwind CSS is available via CDN, so you MUST use Tailwind classes in the HTML.
IMPORTANT: All text content in the HTML and the design philosophy MUST be in the language code: ${lang}.

You MUST output EXACTLY in this format, using these exact XML-like tags:

<PHILOSOPHY>
Explain your design choices here in language ${lang}.
</PHILOSOPHY>

<HTML>
Put the HTML content here (just the body content, no html/head/body tags). Use Tailwind CSS classes. All text MUST be in language ${lang}.
</HTML>

<CSS>
Put custom CSS here if needed.
</CSS>

<JS>
Put JavaScript here if needed.
</JS>`
      }
    ]
  });

  let accumulated = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      accumulated += content;
      yield parseStreamedResponse(accumulated);
    }
  }

  const finalCandidate = parseStreamedResponse(accumulated);
  finalCandidate.isFinished = true;
  yield finalCandidate;
}

export async function* mutateCandidateStream(winner: Candidate, prompt: string, variant: 'left' | 'right', model: string, lang: string = 'en', apiKey?: string): AsyncGenerator<Candidate, void, unknown> {
  const ai = getAI(apiKey);
  const variantInstruction = variant === 'left'
    ? "Make this a subtle refinement: tweak spacing, typography, and minor color shades."
    : "Make this a bold evolution: change the layout structure, introduce new accent colors, or add dramatic interactive elements.";

  const stream = await ai.chat.completions.create({
    model: model,
    stream: true,
    messages: [
      {
        role: "user",
        content: `Based on this winning website design for the prompt "${prompt}":

<PHILOSOPHY>
${winner.design_philosophy}
</PHILOSOPHY>
<HTML>
${winner.html}
</HTML>
<CSS>
${winner.css}
</CSS>
<JS>
${winner.js}
</JS>

Create a new mutated variation of this design.
${variantInstruction}

Assume Tailwind CSS is available via CDN.
IMPORTANT: All text content in the HTML and the design philosophy MUST be in the language code: ${lang}.

You MUST output EXACTLY in this format, using these exact XML-like tags:

<PHILOSOPHY>
Explain your mutation choices here in language ${lang}.
</PHILOSOPHY>

<HTML>
Put the HTML content here (just the body content). All text MUST be in language ${lang}.
</HTML>

<CSS>
Put custom CSS here.
</CSS>

<JS>
Put JavaScript here.
</JS>`
      }
    ]
  });

  let accumulated = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      accumulated += content;
      yield parseStreamedResponse(accumulated);
    }
  }

  const finalCandidate = parseStreamedResponse(accumulated);
  finalCandidate.isFinished = true;
  yield finalCandidate;
}
