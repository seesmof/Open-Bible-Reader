"use client";

import { use, useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { BibleBook, BibleBooksData, CATEGORY_COLORS } from "@/data/Bible";
import Link from "next/link";

export interface Verse {
  number: number;
  verse: string;
}

export const apiUrl = "https://open-bible-api.vercel.app";

export default function ChapterPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = use(params);
  const chapterNumber = Number(chapter);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verses, setVerses] = useState<Verse[]>([]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const navgiateToPreviousChapter = () => {
    let prevChapter, prevBook;
    const currentBookIndex = BibleBooksData.findIndex(
      (b) => b.abbrEng === book,
    );

    if (chapterNumber === 1) {
      const prevBookObject = BibleBooksData[currentBookIndex - 1];

      if (!prevBookObject) prevBook = BibleBooksData[65]?.abbrEng;
      else prevBook = prevBookObject?.abbrEng;

      prevChapter = BibleBooksData.find(
        (b) => b.abbrEng === book,
      )?.numberOfChapters;
    } else {
      prevChapter = chapterNumber - 1;
      prevBook = book;
    }

    redirect(`/${prevBook}/${prevChapter}`);
  };

  const navgiateToNextChapter = () => {
    let nextChapter, nextBook;
    const maxChapter = BibleBooksData.find(
      (b) => b.abbrEng === book,
    )?.numberOfChapters;
    const currentBookIndex = BibleBooksData.findIndex(
      (b) => b.abbrEng === book,
    );

    if (chapterNumber === maxChapter) {
      const nextBookObject = BibleBooksData[currentBookIndex + 1];

      if (!nextBookObject) nextBook = BibleBooksData[0]?.abbrEng;
      else nextBook = nextBookObject?.abbrEng;

      nextChapter = 1;
    } else {
      nextChapter = chapterNumber + 1;
      nextBook = book;
    }

    redirect(`/${nextBook}/${nextChapter}`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key == "ArrowLeft") navgiateToPreviousChapter();
    else if (e.key == "ArrowRight") navgiateToNextChapter();
    else if (e.key == "s") setIsModalOpen((isModalOpen) => !isModalOpen);
    else if (e.key == "Escape") {
      setIsModalOpen(false);
      setSelectedBook(null);
    }
  };

  useEffect(() => {
    const fetchChapter = async () => {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/${book}/${chapterNumber}`);
      if (!response.ok) throw new Error("Failed to fetch a chapter");
      const data: Verse[] = await response.json();
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
            {BibleBooksData.find((b) => b.abbrEng === book)?.nameUkr}{" "}
            {chapterNumber}
          </h1>
          {verses.map((verse, index) => (
            <p
              key={index}
              onClick={() =>
                navigator.clipboard.writeText(
                  `${verse.verse} (${BibleBooksData.find((b) => b.abbrEng === book)?.nameUkr} ${chapterNumber}:${verse.number})`,
                )
              }
            >
              <small>{verse.number} </small>
              <span>{verse.verse}</span>
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
          className={`${isModalOpen ? "fixed" : "hidden"} bg-black/50 h-screen w-full flex items-center justify-center`}
        >
          <div className="bg-white rounded-md p-3 flex flex-col">
            <div className="grid grid-cols-6 gap-1">
              {!selectedBook
                ? BibleBooksData.map((Book, index) => (
                    <div
                      className={`aspect-square cursor-pointer p-1 flex items-center justify-center rounded-md text-white ${CATEGORY_COLORS[Book.category] ?? ""}`}
                      key={index}
                      onClick={() => setSelectedBook(Book)}
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
                      className="aspect-square w-10 text-white bg-sky-800 hover:bg-sky-900 cursor-pointer p-1 flex items-center justify-center rounded-md"
                      href={`/${selectedBook.abbrEng}/${chapter}`}
                    >
                      {chapter}
                    </Link>
                  ))}
            </div>
            <div className="flex justify-between items-center mt-4">
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
