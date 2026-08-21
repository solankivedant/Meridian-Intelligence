import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 0;

/**
 * The like counter.
 *
 * One number per story, shared by everyone. There are no accounts here, so
 * there is nobody to attribute a like to and no per-reader table to scope -
 * the counter *is* the record. Which stories a given browser has liked is kept
 * in that browser (`lib/likes.ts`), and that is the only thing stopping one
 * reader counting twice. That is a deliberate trade rather than an oversight:
 * the alternative is an account system, and this is a like button.
 *
 * The write is an atomic `increment`, not read-then-write, so two readers
 * pressing at the same moment produce two likes rather than one.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  const { id, liked } = (body ?? {}) as { id?: unknown; liked?: unknown };
  if (typeof id !== "string" || !id || typeof liked !== "boolean") {
    return NextResponse.json({ error: "Expected { id: string, liked: boolean }" }, { status: 400 });
  }

  try {
    const article = await db.article.update({
      where: { id },
      data: { likes: { increment: liked ? 1 : -1 } },
      select: { likes: true },
    });

    // A counter that has gone negative is a bug somewhere upstream - a double
    // un-like, or a browser whose stored list outlived a database reset. Floor
    // it rather than serving a negative number to every reader.
    if (article.likes < 0) {
      const fixed = await db.article.update({
        where: { id },
        data: { likes: 0 },
        select: { likes: true },
      });
      return NextResponse.json({ likes: fixed.likes });
    }

    return NextResponse.json({ likes: article.likes });
  } catch (err) {
    console.error("Like failed:", err);
    return NextResponse.json({ error: "Could not record that" }, { status: 500 });
  }
}
