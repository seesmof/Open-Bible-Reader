"use client";

import { BookToUkrainianName } from "@/lib/utils";
import { use, useEffect, useState } from "react";

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

  if (isLoading) return <p className="p-3">Завантаження розділу Біблії...</p>;
  else {
    return (
      <>
        <div className="p-3">
          {data.map((verse, index) => (
            <p
              key={index}
              onClick={() =>
                navigator.clipboard.writeText(
                  `${verse.verse} (${BookToUkrainianName[book]} ${chapterNumber}:${verse.number})`,
                )
              }
            >
              <small>{verse.number} </small>
              <span>{verse.verse}</span>
            </p>
          ))}
        </div>
        <div className="px-3 flex justify-between">
          <button className="hover:underline underline-offset-4 cursor-pointer text-sm">
            Попередній
          </button>
          <button className="hover:underline underline-offset-4 cursor-pointer text-sm">
            Наступний
          </button>
        </div>
      </>
    );
  }
}
