// app/api/cross-references/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

type CrossRef = { ref: string; votes: number };
type ChapterIndex = Record<string, Record<string, CrossRef[]>>;

let cache: ChapterIndex | null = null;

function loadIndex(): ChapterIndex {
  if (cache) return cache;

  const csvPath = path.join(process.cwd(), "references.csv");
  const csv = fs.readFileSync(csvPath, "utf-8");

  const index: ChapterIndex = {};

  for (const rawLine of csv.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length < 3) continue;

    const [from, to, votesStr] = parts;
    const [book, chapter, verse] = from.split(".");
    if (!book || !chapter || !verse) continue;

    const chapterKey = `${book}.${chapter}`;
    index[chapterKey] ??= {};
    (index[chapterKey][verse] ??= []).push({
      ref: to,
      votes: Number(votesStr) || 0,
    });
  }

  // Sort every verse's refs by votes desc (most-relevant first)
  for (const ch in index) {
    for (const v in index[ch]) {
      index[ch][v].sort((a, b) => b.votes - a.votes);
    }
  }

  cache = index;
  return index;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = searchParams.get("book");
  const chapter = searchParams.get("chapter");

  if (!book || !chapter) {
    return NextResponse.json(
      { error: "Missing book or chapter" },
      { status: 400 },
    );
  }

  const index = loadIndex();
  return NextResponse.json(index[`${book}.${chapter}`] ?? {});
}
