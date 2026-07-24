export interface Verse {
  number: number;
  verse: string;
}

export const apiUrl = "https://open-bible-api.vercel.app";

export default async function IndexPage() {
  const response = await fetch(`${apiUrl}/GEN/1`);
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
