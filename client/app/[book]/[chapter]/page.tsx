"use client";

import { use, useEffect, useState } from "react";
import { BibleBook, BibleBooksData, CATEGORY_COLORS } from "@/data/Bible";
import Link from "next/link";
import bible from "../../../bible.json";
import { useRouter } from "next/navigation";

type BibleData = Record<string, Record<string, Record<string, string>>>;
const bibleData = bible as unknown as BibleData;

export type Verse = {
  verseNumber: number;
  text: string;
};

export default function ChapterPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = use(params);
  const chapterNumber = Number(chapter);
  const bookName = book.toUpperCase();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verses, setVerses] = useState<Verse[]>([]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const router = useRouter();

  const navgiateToPreviousChapter = () => {
    const currentBookIndex = BibleBooksData.findIndex(
      (b) => b.abbrEng === bookName,
    );

    if (chapterNumber > 1) {
      router.push(`/${bookName}/${chapterNumber - 1}`);
    }

    const prevBook =
      currentBookIndex > 0
        ? BibleBooksData[currentBookIndex - 1]
        : BibleBooksData[BibleBooksData.length - 1];

    if (!prevBook) return;

    router.push(`/${prevBook.abbrEng}/${prevBook.numberOfChapters}`);
  };

  const navgiateToNextChapter = () => {
    const currentBookIndex = BibleBooksData.findIndex(
      (b) => b.abbrEng === bookName,
    );

    const currentBook = BibleBooksData[currentBookIndex];

    if (!currentBook) return;

    if (chapterNumber < currentBook.numberOfChapters) {
      router.push(`/${bookName}/${chapterNumber + 1}`);
    }

    const nextBook =
      BibleBooksData[(currentBookIndex + 1) % BibleBooksData.length];

    router.push(`/${nextBook.abbrEng}/1`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key == "ArrowLeft") navgiateToPreviousChapter();
    else if (e.key == "ArrowRight") navgiateToNextChapter();
    else if (e.key == "s") {
      setIsModalOpen((isModalOpen) => !isModalOpen);
      setSelectedBook(null);
    } else if (e.key == "Escape") {
      setIsModalOpen(false);
      setSelectedBook(null);
    }
  };

  useEffect(() => {
    const fetchChapter = async () => {
      setIsLoading(true);

      const chapterData = bibleData[bookName]?.[String(chapterNumber)];

      if (!chapterData) {
        setVerses([]);
        setIsLoading(false);
        return;
      }

      const data: Verse[] = Object.entries(chapterData).map(
        ([verseNumber, text]) => ({
          verseNumber: Number(verseNumber),
          text: text as string,
        }),
      );

      setVerses(data);
      setIsLoading(false);
    };
    fetchChapter();

    addEventListener("keydown", handleKeyDown);
    return () => removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) return <p className="p-3">Завантаження розділу Біблії...</p>;
  else {
    return (
      <>
        <main className="p-3 mb-8">
          <h1 className="font-bold">
            {BibleBooksData.find((b) => b.abbrEng === bookName)?.nameUkr}{" "}
            {chapterNumber}
          </h1>
          {verses.map((verse, index) => (
            <p
              key={index}
              onClick={() =>
                navigator.clipboard.writeText(
                  `${verse.text} (${BibleBooksData.find((b) => b.abbrEng === bookName)?.nameUkr} ${chapterNumber}:${verse.verseNumber})`,
                )
              }
            >
              <small>{verse.verseNumber} </small>
              <span>{verse.text}</span>
            </p>
          ))}
        </main>
        <aside className="flex justify-between fixed bottom-0 bg-white w-full">
          <button
            onClick={navgiateToPreviousChapter}
            className="hover:underline underline-offset-4 cursor-pointer sm:text-sm w-full py-2 sm:py-0 px-3 text-start"
          >
            Попередній
          </button>
          <button
            onClick={() => setIsModalOpen((isModalOpen) => !isModalOpen)}
            className="hover:underline underline-offset-4 cursor-pointer sm:text-sm w-full py-2 sm:py-0 px-3"
          >
            Розділ
          </button>
          <button
            onClick={navgiateToNextChapter}
            className="hover:underline underline-offset-4 cursor-pointer sm:text-sm w-full py-2 sm:py-0 px-3 text-end"
          >
            Наступний
          </button>
        </aside>
        <div
          className={`${isModalOpen ? "fixed" : "hidden"} inset-0 bg-black/50 flex items-center justify-center`}
        >
          <div className="bg-white rounded-md p-3 flex flex-col max-h-[90vh] max-w-full overflow-hidden">
            <div className="grid grid-cols-6 gap-1 overflow-y-auto">
              {!selectedBook
                ? BibleBooksData.map((Book, index) => (
                    <div
                      className={`aspect-square cursor-pointer p-1 flex items-center justify-center rounded-md text-white ${CATEGORY_COLORS[Book.category] ?? ""}`}
                      key={index}
                      onClick={() => {
                        if (Book.numberOfChapters === 1) {
                          router.push(`/${Book.abbrEng}/1`);
                          setIsModalOpen(false);
                          setSelectedBook(null);
                        } else {
                          setSelectedBook(Book);
                        }
                      }}
                    >
                      {Book.abbrUkr}
                    </div>
                  ))
                : Array.from(
                    { length: selectedBook.numberOfChapters },
                    (_, index) => index + 1,
                  ).map((chapter, index) => (
                    <Link
                      key={index}
                      className="aspect-square w-10 text-white bg-sky-700 hover:bg-sky-800 cursor-pointer p-1 flex items-center justify-center rounded-md"
                      href={`/${selectedBook.abbrEng}/${chapter}`}
                    >
                      {chapter}
                    </Link>
                  ))}
            </div>
            <div className="flex justify-between items-center mt-4 shrink-0">
              {selectedBook && (
                <button
                  className="hover:underline underline-offset-4 cursor-pointer"
                  onClick={() => setSelectedBook(null)}
                >
                  Назад
                </button>
              )}
              <p className="font-bold">{selectedBook?.nameUkr}</p>
              <button
                className="self-end hover:underline underline-offset-4 cursor-pointer"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedBook(null);
                }}
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
}
