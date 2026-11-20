import fs from "node:fs";

const csv = fs.readFileSync("references.csv", "utf8");
const index = {};

for (const line of csv.split(/\r?\n/)) {
  const [from, to, votes] = line.trim().split(",");

  if (!from || !to) continue;

  const [book, chapter, verse] = from.split(".");

  if (!book || !chapter || !verse) continue;

  const chapterKey = `${book}.${chapter}`;

  index[chapterKey] ??= {};
  index[chapterKey][verse] ??= [];

  index[chapterKey][verse].push({
    ref: to,
    votes: Number(votes) || 0,
  });
}

for (const chapter of Object.values(index)) {
  for (const refs of Object.values(chapter)) {
    refs.sort((a, b) => b.votes - a.votes);
  }
}

fs.writeFileSync("public/references.json", JSON.stringify(index));

console.log("Cross-references generated!");
