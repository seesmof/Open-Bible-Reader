"use client";

import { BookToNumberOfChapters, BookToUkrainianName } from "@/lib/utils";
import React, { use, useEffect, useState } from "react";
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
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key == "ArrowLeft") navgiateToPreviousChapter();
    else if (e.key == "ArrowRight") navgiateToNextChapter();
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
        <div className="p-3 mb-3">
          {verses.map((verse, index) => (
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
            <div className="grid grid-cols-6"></div>
            <button className="self-end" onClick={() => setIsModalOpen(false)}>
              Закрити
            </button>
          </div>
        </div>
      </>
    );
  }
}
