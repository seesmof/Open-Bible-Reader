import { redirect } from "next/navigation";

export interface Verse {
  number: number;
  verse: string;
}

export const apiUrl = "https://open-bible-api.vercel.app";

interface Props {
  params: {
    book: string;
    chapter: string;
  };
}

export default async function IndexPage({ params }: Props) {
  const { book, chapter } = await params;
  const chapterNumber = Number(chapter);
  const response = await fetch(`${apiUrl}/${book}/${chapterNumber}`);
  const data: Verse[] = await response.json();

  const prevPage = () => {
    let newChapter = chapterNumber - 1;
    let newBook = book;
    redirect(`/${newBook}/${newChapter}`);
  };

  const nextPage = () => {
    let newChapter = chapterNumber + 1;
    let newBook = book;
    redirect(`/${newBook}/${newChapter}`);
  };

  return (
    <>
      <div className="p-3">
        {data.map((verse, index) => (
          <p key={index}>
            <small>{verse.number} </small>
            <span>{verse.verse}</span>
          </p>
        ))}
      </div>
      <div className="px-3 flex justify-between items-center">
        <button
          className="bg-stone-600 text-white rounded-md p-1"
          onClick={prevPage}
        >
          Prev
        </button>
        <button
          className="bg-stone-600 text-white rounded-md p-1"
          onClick={nextPage}
        >
          Next
        </button>
      </div>
    </>
  );
}
