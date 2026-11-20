import fs from "node:fs";
import path from "node:path";

const prerenderPath = ".next/prerender-manifest.json";
const outputPath = "public/chapter-manifest.json";

const prerender = JSON.parse(fs.readFileSync(prerenderPath, "utf8"));

const chapters = Object.keys(prerender.routes).filter((route) =>
  /^\/[^/]+\/\d+$/.test(route),
);

fs.writeFileSync(outputPath, JSON.stringify(chapters, null, 2));

console.log(`Generated manifest with ${chapters.length} chapters.`);
