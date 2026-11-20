import { BibleBooksData } from "@/data/Bible";
import ChapterPageClient from "./ChapterPageClient";
import bible from "../../../bible.json";
import { notFound } from "next/navigation";

type BibleData = Record<string, Record<string, Record<string, string>>>;

const bibleData = bible as unknown as BibleData;

// Generate all Bible chapter URLs at build time.
export function generateStaticParams() {
  return BibleBooksData.flatMap((book) =>
    Array.from({ length: book.numberOfChapters }, (_, index) => ({
      book: book.abbrEng,
      chapter: String(index + 1),
    })),
  );
}

// Only allow generated routes.
export const dynamicParams = false;

export default async function Page({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;

  const chapterData = bibleData[book.toUpperCase()]?.[chapter];

  if (!chapterData) {
    notFound();
  }

  const initialVerses = Object.entries(chapterData).map(
    ([verseNumber, text]) => ({
      verseNumber: Number(verseNumber),
      text,
    }),
  );

  return (
    <ChapterPageClient
      key={`${book}-${chapter}`}
      book={book}
      chapter={chapter}
      initialVerses={initialVerses}
    />
  );
}
