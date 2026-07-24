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

  return (
    <div className="p-3">
      {data.map((verse, index) => (
        <p key={index}>
          <small>{verse.number} </small>
          <span>{verse.verse}</span>
        </p>
      ))}
    </div>
  );
}
