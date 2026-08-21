"use client";

import { BookToNumberOfChapters, BookToUkrainianName } from "@/lib/utils";
import { use, useEffect, useState } from "react";
import { redirect } from "next/navigation";

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
  const [data, setData] = useState<Verse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchChapter = async () => {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/${book}/${chapterNumber}`);
      if (!response.ok) throw new Error("Failed to fetch a chapter");
      const data: Verse[] = await response.json();
      setData(data);
      setIsLoading(false);
    };
    fetchChapter();
  }, []);

  const navgiateToPreviousChapter = () => {
    let prevChapter, prevBook;

    if (chapterNumber === 1) {
      const keys = Object.keys(BookToNumberOfChapters);
      const index = keys.indexOf(book);
      if (index === 0) prevBook = "REV";
      prevChapter =
        BookToNumberOfChapters[prevBook as keyof typeof BookToNumberOfChapters];
    } else {
      prevChapter = chapterNumber - 1;
      prevBook = book;
    }

    redirect(`/${prevBook}/${prevChapter}`);
  };

  const navgiateToNextChapter = () => {
    let nextChapter, nextBook;
    const maxChapter =
      BookToNumberOfChapters[book as keyof typeof BookToNumberOfChapters];

    if (chapterNumber === maxChapter) {
      const keys = Object.keys(BookToNumberOfChapters);
      const index = keys.indexOf(book);
      console.log(index);
      if (index === 65) nextBook = "GEN";
      nextChapter = 1;
    } else {
      nextChapter = chapterNumber + 1;
      nextBook = book;
    }

    redirect(`/${nextBook}/${nextChapter}`);
  };

  if (isLoading) return <p className="p-3">Завантаження розділу Біблії...</p>;
  else {
    return (
      <>
        <div className="p-3 mb-3">
          {data.map((verse, index) => (
            <p
              key={index}
              onClick={() =>
                navigator.clipboard.writeText(
                  `${verse.verse} (${BookToUkrainianName[book as keyof typeof BookToUkrainianName]} ${chapterNumber}:${verse.number})`,
                )
              }
            >
              <small>{verse.number} </small>
              <span>{verse.verse}</span>
            </p>
          ))}
        </div>
        <div className="px-3 flex justify-between fixed bottom-0 bg-white w-full">
          <button
            onClick={navgiateToPreviousChapter}
            className="hover:underline underline-offset-4 cursor-pointer text-sm"
          >
            Попередній
          </button>
          <button
            onClick={() => setIsModalOpen((isModalOpen) => !isModalOpen)}
            className="hover:underline underline-offset-4 cursor-pointer text-sm"
          >
            Розділ
          </button>
          <button
            onClick={navgiateToNextChapter}
            className="hover:underline underline-offset-4 cursor-pointer text-sm"
          >
            Наступний
          </button>
        </div>
        <div
          className={`${isModalOpen ? "fixed" : "hidden"} bg-black/50 h-screen w-full flex items-center justify-center`}
        >
          <div className="bg-white rounded-md p-3 flex flex-col">
            <button className="self-end" onClick={() => setIsModalOpen(false)}>
              Закрити
            </button>
          </div>
        </div>
      </>
    );
  }
}
