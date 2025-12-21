import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

/**
 * Chat API endpoint
 *
 * This is a simple proxy that forwards requests to OpenAI.
 * Tool execution happens on the CLIENT, not here.
 */
export async function POST(req: Request) {
  try {
    const { messages, tools } = await req.json();

    // User must provide their own API key
    const apiKey = req.headers.get("x-openai-api-key");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key required. Set NEXT_PUBLIC_OPENAI_API_KEY in your .env.local" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = streamText({
      model: openai("gpt-4-turbo", { apiKey }),
      system: SYSTEM_PROMPT,
      messages,
      tools, // Tool schemas passed through (execution happens on client)
      maxSteps: 10, // Allow multiple tool call rounds
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
