import { Hono } from 'hono';
import { streamText, convertToModelMessages, stepCountIs } from "ai"
import { openai } from '@ai-sdk/openai';
import { SYSTEM_PROMPT } from '../lib/ai/prompts';
import { allTools } from '../lib/ai/tools';

type Bindings = {
  OPENAI_API_KEY: string;
};

const chat = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/chat - Streaming chat endpoint
 *
 * Proxies AI requests to OpenAI with tool schemas
 * Compatible with Vercel AI SDK's useChat hook
 */
chat.post('/', async (c) => {
  try {
    // Validate API key exists
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured in environment');
      return c.json(
        { error: 'OPENAI_API_KEY not configured on server' },
        500
      );
    }

    // Parse request body
    const body = await c.req.json();
    const { messages } = body;
    const modelMessages = convertToModelMessages(messages)

    // Log all messages for visibility
    console.log('\n========================================');
    console.log('=== CHAT REQUEST ===');
    console.log(`Received ${messages.length} messages`);
    console.log('========================================\n');

    messages.forEach((msg: any, i: number) => {
      console.log(`\n[Message ${i}] Role: ${msg.role}`);
      if (msg.parts) {
        msg.parts.forEach((part: any, j: number) => {
          if (part.type === 'text') {
            console.log(`  └─ Text: "${part.text}"`);
          } else if (part.type === 'tool-call') {
            console.log(`  └─ Tool Call: ${part.toolName}`);
            console.log(`     Args: ${JSON.stringify(part.args, null, 2)}`);
          } else if (part.type === 'tool-result') {
            console.log(`  └─ Tool Result for: ${part.toolName}`);
            console.log(`     Result: ${JSON.stringify(part.result, null, 2)}`);
          } else {
            console.log(`  └─ ${part.type}: ${JSON.stringify(part)}`);
          }
        });
      } else if (msg.content) {
        console.log(`  └─ Content: "${msg.content}"`);
      }
    });

    console.log('\n========================================\n');

    // Stream response from OpenAI
    const result = streamText({
      model: openai("gpt-5.1"),
      // model: openai("gpt-4o", { apiKey }),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: allTools,
      stopWhen: stepCountIs(10),
      toolChoice: "auto",
      onFinish: async ({ text, toolCalls, finishReason, usage }) => {
        console.log('\n========================================');
        console.log('=== AI RESPONSE ===');
        console.log('========================================\n');

        if (text) {
          console.log(`AI Text: "${text}"`);
        }

        if (toolCalls && toolCalls.length > 0) {
          console.log(`\nTool Calls (${toolCalls.length}):`);
          toolCalls.forEach((call: any, i: number) => {
            console.log(`  [${i}] ${call.toolName}`);
            console.log(`      ID: ${call.toolCallId}`);
            console.log(`      Args: ${JSON.stringify(call.args, null, 2)}`);
          });
        }

        console.log(`\nFinish Reason: ${finishReason}`);
        console.log(`Usage: ${JSON.stringify(usage, null, 2)}`);
        console.log('\n========================================\n');
      }
    });

    // Return streaming response compatible with Vercel AI SDK
    // toUIMessageStreamResponse() returns a Response directly
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }

    // Handle other errors
    return c.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default chat;
