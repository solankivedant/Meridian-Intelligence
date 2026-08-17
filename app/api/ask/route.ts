import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { metaForCategory } from "@/lib/categoryMeta";

const MAX_QUESTION_LENGTH = 300;

export async function POST(req: NextRequest) {
  let body: { articleId?: unknown; question?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { articleId, question } = body;
  if (typeof articleId !== "string" || !articleId) {
    return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
  }
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: "Question is too long" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI Q&A is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  const article = await db.article.findUnique({
    where: { id: articleId },
    include: { source: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const categoryLabel = metaForCategory(article.category).label;
  const anthropic = new Anthropic();

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system:
        "You answer questions about a single news/policy article using only the headline, excerpt, and metadata given to you — you do not have access to the full article text. If the excerpt doesn't contain enough detail to answer, say so plainly and suggest the user open the source link rather than guessing. Keep answers concise (2-4 sentences unless the question genuinely needs more).",
      messages: [
        {
          role: "user",
          content: `Article:
Title: ${article.title}
Source: ${article.source.name}
Category: ${categoryLabel}
Published: ${article.publishedAt.toISOString()}
Excerpt: ${article.excerpt || "(no excerpt available)"}
URL: ${article.url}

Question: ${question.trim()}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The assistant declined to answer that question." },
        { status: 422 }
      );
    }

    const textBlock = response.content.find((block) => block.type === "text");
    const answer = textBlock && textBlock.type === "text" ? textBlock.text : "";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Failed to get an answer from the assistant." }, { status: 502 });
  }
}
