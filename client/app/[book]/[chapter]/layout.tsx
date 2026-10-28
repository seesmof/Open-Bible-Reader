import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BibleBooksData } from "@/data/Bible";

type Props = {
  params: Promise<{ book: string; chapter: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book, chapter } = await params;

  const bookInfo = BibleBooksData.find((b) => b.abbrEng === book.toUpperCase());

  return {
    title: bookInfo ? `${bookInfo.nameUkr} ${chapter}` : "Читалка Біблії",
  };
}

export default function ChapterLayout({ children }: { children: ReactNode }) {
  return children;
}
