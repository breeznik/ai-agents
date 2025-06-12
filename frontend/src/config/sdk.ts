import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";

export const groq = createGroq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
});

export const anthropic = createAnthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  baseURL: "https://api.anthropic.com/v1",
});

export const xai = createXai({
  apiKey: import.meta.env.VITE_XAI_API_KEY,
});

export const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
});

export const openAI = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  compatibility: "strict",
});


// === Dynamic Model Map ===
export const modelOptions = {
  "gpt-4.1-mini": {
    instance: openAI("gpt-4.1-mini"),
    label: "gpt-4.1 mini",
  },
  groq: {
    instance: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    label: "Groq",
  },
  "gemini-2.0-flash": {
    instance: google("gemini-2.0-flash"),
    label: "Gemini 2.0 Flash",
  },
  "gemini-2.0-flash-lite": {
    instance: google("gemini-2.0-flash-lite"),
    label: "Gemini 2.0 Flash Lite",
  },
  "gemini-1.5-flash": {
    instance: google("gemini-1.5-flash"),
    label: "Gemini 1.5 Flash",
  },
  "gemini-1.5-flash-8b": {
    instance: google("gemini-1.5-flash-8b"),
    label: "Gemini 1.5 Flash 8B",
  },
  "gemini-1.5-pro": {
    instance: google("gemini-1.5-pro"),
    label: "Gemini 1.5 Pro",
  },
  "Gemini 2.5 Pro Preview": {
    instance: google("gemini-2.5-pro-preview-05-06"),
    label: "gemini-2.5-pro-preview-05-06",
  },
  "gpt-4o-audio-preview": {
    instance: openAI("gpt-4o-audio-preview"),
    label: "gpt-4o-audio-preview",
  },
  "whisper-1": {
    instance: openAI.transcription("whisper-1"),
    label: "whisper-1",
  },

  "gpt-4o-mini-transcribe": {
    instance: openAI.transcription("gpt-4o-mini-transcribe"),
    label: "gpt-4o-mini-transcribe",
  },
  "gpt-4o-transcribe": {
    instance: openAI.transcription("gpt-4o-transcribe"),
    label: "gpt-4o-transcribe",
  },
  "gpt-4.1-2025-04-14": {
    instance: openAI("gpt-4.1-2025-04-14"),
    label: "gpt-4.1-2025-04-14",
  }
};

