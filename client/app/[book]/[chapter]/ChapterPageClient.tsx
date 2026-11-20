"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { BibleBook, BibleBooksData, CATEGORY_COLORS } from "@/data/Bible";
import Link from "next/link";
import bible from "../../../bible.json";
import { useRouter } from "next/navigation";

type BibleData = Record<string, Record<string, Record<string, string>>>;
const bibleData = bible as unknown as BibleData;

export type Verse = { verseNumber: number; text: string };

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

// ---------- Fuzzy matching helpers ----------

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev: number[] = new Array(b.length + 1);
  const curr: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.6;

/**
 * Resolve a book name (abbr or Ukrainian) to a BibleBook.
 * Order: exact → prefix → fuzzy (full + prefix-of-id), Levenshtein based.
 */
function matchBookName(name: string): BibleBook | null {
  const nameLower = name.toLowerCase().trim();
  if (!nameLower) return null;

  // 1. Exact (case-insensitive)
  for (const book of BibleBooksData) {
    if (
      book.abbrEng.toLowerCase() === nameLower ||
      book.nameUkr.toLowerCase() === nameLower
    ) {
      return book;
    }
  }

  // 2. Prefix match
  for (const book of BibleBooksData) {
    if (
      book.abbrEng.toLowerCase().startsWith(nameLower) ||
      book.nameUkr.toLowerCase().startsWith(nameLower)
    ) {
      return book;
    }
  }

  // 3. Fuzzy match (full string and prefix-of-id)
  if (nameLower.length < 2) return null;
  let best: { book: BibleBook; score: number } | null = null;
  for (const book of BibleBooksData) {
    for (const id of [book.abbrEng, book.nameUkr]) {
      const idLower = id.toLowerCase();
      const simFull = similarity(nameLower, idLower);
      const prefixLen = Math.min(idLower.length, nameLower.length + 2);
      const simPrefix = similarity(nameLower, idLower.slice(0, prefixLen));
      const sim = Math.max(simFull, simPrefix);
      if (sim >= FUZZY_THRESHOLD && (!best || sim > best.score)) {
        best = { book, score: sim };
      }
    }
  }
  return best?.book ?? null;
}

/**
 * Parse "GEN 1 1", "Буття 1", "бут 1", "1 Івана 3", "GEN 1:1" …
 * Normalizes ":" and "." to spaces, then tries the shortest leading
 * token prefix as a book name and the remaining tokens as numbers.
 */
function parseSearchQuery(
  query: string,
): { book: BibleBook; chapter?: number; verse?: number } | null {
  const normalized = query.trim().replace(/[:.]/g, " ");
  if (!normalized) return null;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  for (let n = 1; n <= Math.min(tokens.length, 5); n++) {
    const numTokens = tokens.slice(n);
    if (!numTokens.every((t) => /^\d+$/.test(t))) continue;
    const nameCandidate = tokens.slice(0, n).join(" ");
    const book = matchBookName(nameCandidate);
    if (book) {
      return {
        book,
        chapter: numTokens[0] ? Number(numTokens[0]) : undefined,
        verse: numTokens[1] ? Number(numTokens[1]) : undefined,
      };
    }
  }
  return null;
}

export default function ChapterPageClient({
  book,
  chapter,
  initialVerses,
}: {
  book: string;
  chapter: string;
  initialVerses: Verse[];
}) {
  const chapterNumber = Number(chapter);
  const bookName = book.toUpperCase();

  const [verses, setVerses] = useState<Verse[]>(initialVerses);

  const [crossRefs, setCrossRefs] = useState<Record<string, CrossRef[]>>({});
  const [expandedVerses, setExpandedVerses] = useState<Set<number>>(new Set());
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);
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
    const target = e.target as HTMLElement;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    if (e.key === "Escape") {
      setIsModalOpen(false);
      setSelectedBook(null);
      return;
    }

    if (isInput) return;

    if (e.key === "ArrowLeft") navigateToPreviousChapter();
    else if (e.key === "ArrowRight") navigateToNextChapter();
    else if (e.key === "s") {
      setIsModalOpen((v) => !v);
      setSelectedBook(null);
    }
  };

  // Load verses
  useEffect(() => {
    addEventListener("keydown", handleKeyDown);
    return () => removeEventListener("keydown", handleKeyDown);
  }, [bookName, chapterNumber]);

  useEffect(() => {
    let cancelled = false;

    setCrossRefs({});
    setExpandedVerses(new Set());
    setExpandedRefs(new Set());

    fetch("/references.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load references");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCrossRefs(data[`${bookName}.${chapterNumber}`] ?? {});
        }
      })
      .catch(() => {
        if (!cancelled) setCrossRefs({});
      });

    return () => {
      cancelled = true;
    };
  }, [bookName, chapterNumber]);

  useEffect(() => {
    if (verses.length === 0) return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [verses]);

  // Search UX: focus the field when the modal opens; reset on close.
  // Guard against hidden (display:none) inputs on mobile.
  useEffect(() => {
    if (!isModalOpen) {
      setSearchQuery("");
      setSelectedBook(null);
      return;
    }
    const id = setTimeout(() => {
      const el = searchInputRef.current;
      if (el && el.offsetParent !== null) el.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [isModalOpen]);

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

  // ----- Search / quick-jump derived state -----
  const parsed = parseSearchQuery(searchQuery);
  const jumpBook = parsed?.book ?? null;
  const jumpChapter = parsed?.chapter ?? null;
  const jumpVerse = parsed?.verse ?? null;

  const hasValidChapter =
    jumpBook != null &&
    jumpChapter != null &&
    jumpChapter >= 1 &&
    jumpChapter <= jumpBook.numberOfChapters;

  const suggestionLabel: string | null = jumpBook
    ? hasValidChapter
      ? `${jumpBook.nameUkr} ${jumpChapter}${
          jumpVerse != null ? ":" + jumpVerse : ""
        } → Перейти`
      : `${jumpBook.nameUkr} → Показати розділи`
    : null;

  const showChapters = selectedBook != null && searchQuery.trim() === "";

  const filteredBooks = (() => {
    if (!searchQuery.trim()) return BibleBooksData;
    if (jumpBook) return [jumpBook];
    const q = searchQuery.trim().toLowerCase();
    return BibleBooksData.filter(
      (b) =>
        b.abbrEng.toLowerCase().startsWith(q) ||
        b.nameUkr.toLowerCase().startsWith(q),
    );
  })();

  const goToBookChapter = (bookAbbr: string, chapter: number) => {
    router.push(`/${bookAbbr}/${chapter}`);
    setIsModalOpen(false);
    setSelectedBook(null);
    setSearchQuery("");
  };

  const activateSuggestion = () => {
    if (!jumpBook) return;
    if (hasValidChapter && jumpChapter != null) {
      goToBookChapter(jumpBook.abbrEng, jumpChapter);
    } else {
      setSelectedBook(jumpBook);
      setSearchQuery("");
    }
  };

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    activateSuggestion();
  };

  return (
    <>
      <main className="p-3 mx-auto max-w-3xl mb-8">
        <h1 className="font-bold">
          {BibleBooksData.find((b) => b.abbrEng === bookName)?.nameUkr}{" "}
          {chapterNumber}
        </h1>

        {verses.map((verse) => {
          const refs = crossRefs[String(verse.verseNumber)] ?? [];
          const verseOpen = expandedVerses.has(verse.verseNumber);

          return (
            <div
              key={verse.verseNumber}
              className="mb-1 scroll-mt-3"
              id={`v${verse.verseNumber}`}
            >
              <p
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${verse.text} (${BibleBooksData.find((b) => b.abbrEng === bookName)?.nameUkr} ${chapterNumber}:${verse.verseNumber})`,
                  )
                }
              >
                {verse.verseNumber}. {verse.text}
              </p>

              {refs.length > 0 && (
                <div className="ml-6 text-sm">
                  <button
                    className="text-blue-600 hover:underline cursor-pointer"
                    onClick={() => toggleVerse(verse.verseNumber)}
                  >
                    {verseOpen ? "▼" : "▶"} Перехресні посилання ({refs.length})
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
                              title={`${r.votes} голосів`}
                            >
                              {formatRefDisplay(r.ref)}
                            </button>
                            {open && (
                              <div className="mt-1 mb-2 ml-2 pl-2 border-l-2 border-gray-300">
                                <span className="text-gray-700">
                                  {getRefText(r.ref)}
                                </span>
                                <div className="mt-1">
                                  <Link
                                    href={`/${parseRef(r.ref).book}/${parseRef(r.ref).chapter}#v${parseRef(r.ref).startVerse}`}
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    Перейти →
                                  </Link>
                                </div>
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
        className={`${isModalOpen ? "fixed" : "hidden"} inset-0 bg-black/50 flex items-center justify-center p-4`}
      >
        <div className="bg-white rounded-md p-3 flex flex-col max-h-[90vh] w-[min(100%,22rem)] overflow-hidden">
          {/* Quick search / jump field — larger screens only */}
          <div className="hidden sm:block">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Пошук: GEN 1, Буття 1, бут 1 1…"
              className="w-full mb-3 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-700"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="go"
            />

            {suggestionLabel && (
              <button
                onClick={activateSuggestion}
                className="w-full mb-3 text-left px-2 py-1 bg-sky-100 hover:bg-sky-200 rounded-md text-sky-900 cursor-pointer"
              >
                {suggestionLabel}
              </button>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1 overflow-y-auto min-h-0">
            {!showChapters ? (
              filteredBooks.length === 0 ? (
                <p className="col-span-6 text-sm text-gray-500">
                  Нічого не знайдено
                </p>
              ) : (
                filteredBooks.map((Book, index) => (
                  <div
                    className={`aspect-square w-full cursor-pointer p-1 flex items-center justify-center rounded-md text-white ${CATEGORY_COLORS[Book.category] ?? ""}`}
                    key={index}
                    onClick={() => {
                      if (Book.numberOfChapters === 1) {
                        goToBookChapter(Book.abbrEng, 1);
                      } else {
                        setSelectedBook(Book);
                        setSearchQuery("");
                      }
                    }}
                  >
                    {Book.abbrUkr}
                  </div>
                ))
              )
            ) : (
              Array.from(
                { length: selectedBook!.numberOfChapters },
                (_, i) => i + 1,
              ).map((ch, index) => (
                <Link
                  key={index}
                  className="aspect-square w-full text-white bg-sky-700 hover:bg-sky-800 cursor-pointer p-1 flex items-center justify-center rounded-md"
                  href={`/${selectedBook!.abbrEng}/${ch}`}
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedBook(null);
                    setSearchQuery("");
                  }}
                >
                  {ch}
                </Link>
              ))
            )}
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
