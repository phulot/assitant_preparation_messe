import { chat, chatStream, type ChatContext } from "@/lib/ai/chat";
import type { ChatMessage } from "@/lib/ai/provider";

interface ChatRequestBody {
  messages?: ChatMessage[];
  context?: ChatContext;
  stream?: boolean;
}

function validateMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return false;
  }

  return messages.every(
    (msg) =>
      typeof msg === "object" &&
      msg !== null &&
      typeof msg.role === "string" &&
      typeof msg.content === "string",
  );
}

export async function POST(request: Request) {
  const body: ChatRequestBody = await request.json();

  if (!validateMessages(body.messages)) {
    return Response.json(
      {
        error:
          "Invalid messages: must be a non-empty array with role and content for each message",
      },
      { status: 400 },
    );
  }

  const messages = body.messages;
  const context = body.context;

  if (body.stream) {
    const iterator = chatStream(messages, context);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(encoder.encode(value));
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const result = await chat(messages, context);

  return Response.json({
    content: result.content,
    toolCalls: result.toolCalls,
  });
}
