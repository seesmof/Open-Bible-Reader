"use client";

import { use, useEffect, useState } from "react";
import { BibleBook, BibleBooksData, CATEGORY_COLORS } from "@/data/Bible";
import Link from "next/link";
import bible from "../../../bible.json";
import { useRouter } from "next/navigation";

type BibleData = Record<string, Record<string, Record<string, string>>>;
const bibleData = bible as unknown as BibleData;

export type Verse = { verseNumber: number; text: string };

// ─── NEW: cross-reference helpers ───────────────────────────────
type CrossRef = { ref: string; votes: number };

function parseRef(ref: string) {
  const [start, end] = ref.split("-");
  const [startBook, startCh, startV] = start.split(".");
  const chapter = Number(startCh);
  const startVerse = Number(startV);

  if (!end) {
    return {
      book: startBook,
      chapter,
      startVerse,
      endChapter: chapter,
      endVerse: startVerse,
    };
  }
  const [, endCh, endV] = end.split(".");
  return {
    book: startBook,
    chapter,
    startVerse,
    endChapter: Number(endCh),
    endVerse: Number(endV),
  };
}

function bookNameUkr(abbr: string) {
  return BibleBooksData.find((b) => b.abbrEng === abbr)?.nameUkr ?? abbr;
}

function formatRefDisplay(ref: string) {
  const p = parseRef(ref);
  const name = bookNameUkr(p.book);
  if (p.chapter === p.endChapter) {
    return p.startVerse === p.endVerse
      ? `${name} ${p.chapter}:${p.startVerse}`
      : `${name} ${p.chapter}:${p.startVerse}-${p.endVerse}`;
  }
  return `${name} ${p.chapter}:${p.startVerse}-${p.endChapter}:${p.endVerse}`;
}

function getRefText(ref: string) {
  const p = parseRef(ref);
  const out: string[] = [];
  for (let ch = p.chapter; ch <= p.endChapter; ch++) {
    const chapterData = bibleData[p.book]?.[String(ch)];
    if (!chapterData) continue;
    const startV = ch === p.chapter ? p.startVerse : 1;
    const endV =
      ch === p.endChapter ? p.endVerse : Object.keys(chapterData).length;
    for (let v = startV; v <= endV; v++) {
      const t = chapterData[String(v)];
      if (!t) continue;
      out.push(p.chapter === p.endChapter ? `${v}. ${t}` : `${ch}:${v}. ${t}`);
    }
  }
  return out.join(" ");
}
// ────────────────────────────────────────────────────────────────

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

  // NEW: cross-reference state
  const [crossRefs, setCrossRefs] = useState<Record<string, CrossRef[]>>({});
  const [expandedVerses, setExpandedVerses] = useState<Set<number>>(new Set());
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const router = useRouter();

  const navigateToPreviousChapter = () => {
    const currentBookIndex = BibleBooksData.findIndex(
      (b) => b.abbrEng === bookName,
    );
    if (currentBookIndex === -1) return;
    const currentBook = BibleBooksData[currentBookIndex];
    if (chapterNumber > 1) {
      router.push(`/${currentBook.abbrEng}/${chapterNumber - 1}`);
      return;
    }
    const prev =
      (currentBookIndex - 1 + BibleBooksData.length) % BibleBooksData.length;
    const prevBook = BibleBooksData[prev];
    router.push(`/${prevBook.abbrEng}/${prevBook.numberOfChapters}`);
  };

  const navigateToNextChapter = () => {
    const currentBookIndex = BibleBooksData.findIndex(
      (b) => b.abbrEng === bookName,
    );
    if (currentBookIndex === -1) return;
    const currentBook = BibleBooksData[currentBookIndex];
    if (chapterNumber < currentBook.numberOfChapters) {
      router.push(`/${currentBook.abbrEng}/${chapterNumber + 1}`);
      return;
    }
    const nextBook =
      BibleBooksData[(currentBookIndex + 1) % BibleBooksData.length];
    router.push(`/${nextBook.abbrEng}/1`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") navigateToPreviousChapter();
    else if (e.key === "ArrowRight") navigateToNextChapter();
    else if (e.key === "s") {
      setIsModalOpen((v) => !v);
      setSelectedBook(null);
    } else if (e.key === "Escape") {
      setIsModalOpen(false);
      setSelectedBook(null);
    }
  };

  // Load verses
  useEffect(() => {
    const fetchChapter = async () => {
      setIsLoading(true);
      const chapterData = bibleData[bookName]?.[String(chapterNumber)];
      if (!chapterData) {
        setVerses([]);
        setIsLoading(false);
        return;
      }
      setVerses(
        Object.entries(chapterData).map(([verseNumber, text]) => ({
          verseNumber: Number(verseNumber),
          text: text as string,
        })),
      );
      setIsLoading(false);
    };
    fetchChapter();

    addEventListener("keydown", handleKeyDown);
    return () => removeEventListener("keydown", handleKeyDown);
    // NEW: re-run when the chapter changes
  }, [bookName, chapterNumber]);

  // NEW: load cross-references for the current chapter
  useEffect(() => {
    let cancelled = false;
    setCrossRefs({});
    setExpandedVerses(new Set());
    setExpandedRefs(new Set());

    fetch(`/api/cross-references?book=${bookName}&chapter=${chapterNumber}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCrossRefs(data);
      })
      .catch(() => {
        if (!cancelled) setCrossRefs({});
      });

    return () => {
      cancelled = true;
    };
  }, [bookName, chapterNumber]);

  const toggleVerse = (v: number) =>
    setExpandedVerses((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });

  const toggleRef = (key: string) =>
    setExpandedRefs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  if (isLoading) return <p className="p-3">Завантаження розділу Біблії...</p>;

  return (
    <>
      <main className="p-3 mb-8">
        <h1 className="font-bold">
          {BibleBooksData.find((b) => b.abbrEng === bookName)?.nameUkr}{" "}
          {chapterNumber}
        </h1>

        {verses.map((verse) => {
          const refs = crossRefs[String(verse.verseNumber)] ?? [];
          const verseOpen = expandedVerses.has(verse.verseNumber);

          return (
            <div key={verse.verseNumber} className="mb-1">
              <p
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${verse.text} (${BibleBooksData.find((b) => b.abbrEng === bookName)?.nameUkr} ${chapterNumber}:${verse.verseNumber})`,
                  )
                }
              >
                <small>{verse.verseNumber} </small>
                <span>{verse.text}</span>
              </p>

              {refs.length > 0 && (
                <div className="ml-6 text-sm">
                  <button
                    className="text-blue-600 hover:underline cursor-pointer"
                    onClick={() => toggleVerse(verse.verseNumber)}
                  >
                    {verseOpen ? "▼" : "▶"} Cross-references ({refs.length})
                  </button>

                  {verseOpen && (
                    <ul className="mt-1 ml-4 list-disc list-inside">
                      {refs.map((r, i) => {
                        const refKey = `${verse.verseNumber}:${i}`;
                        const open = expandedRefs.has(refKey);
                        return (
                          <li key={refKey}>
                            <button
                              className="text-blue-600 hover:underline cursor-pointer"
                              onClick={() => toggleRef(refKey)}
                              title={`${r.votes} votes`}
                            >
                              {formatRefDisplay(r.ref)}
                            </button>
                            {open && (
                              <div className="mt-1 mb-2 ml-2 pl-2 border-l-2 border-gray-300 text-gray-700 italic">
                                {getRefText(r.ref)}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* ─── unchanged: footer + chapter modal ─── */}
      <aside className="flex justify-between fixed bottom-0 bg-white w-full">
        <button
          onClick={navigateToPreviousChapter}
          className="hover:underline underline-offset-4 cursor-pointer sm:text-sm w-full py-2 sm:py-0 px-3 text-start"
        >
          Попередній
        </button>
        <button
          onClick={() => setIsModalOpen((v) => !v)}
          className="hover:underline underline-offset-4 cursor-pointer sm:text-sm w-full py-2 sm:py-0 px-3"
        >
          Розділ
        </button>
        <button
          onClick={navigateToNextChapter}
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
                    className={`aspect-square w-10 cursor-pointer p-1 flex items-center justify-center rounded-md text-white ${CATEGORY_COLORS[Book.category] ?? ""}`}
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
                  (_, i) => i + 1,
                ).map((ch, index) => (
                  <Link
                    key={index}
                    className="aspect-square w-10 text-white bg-sky-700 hover:bg-sky-800 cursor-pointer p-1 flex items-center justify-center rounded-md"
                    href={`/${selectedBook.abbrEng}/${ch}`}
                  >
                    {ch}
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
