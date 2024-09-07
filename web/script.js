async function readUsfmFile(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const text = await response.text();
    displayText(text);
  } catch (error) {
    console.error("Error fetching the USFM file:", error);
  }
}

function displayText(text) {
  const container = document.getElementById("container");
  container.innerHTML = "";

  const lines = text.split("\n");
  let lastBookName = "";

  lines.forEach((line) => {
    const tag = line.startsWith("\\") ? line.split(" ")[0] : "";
    const paragraph = document.createElement("p");

    switch (tag) {
      case "\\id":
      case "\\toc1":
      case "\\toc2":
      case "\\toc3":
      case "\\mt1":
        paragraph.style.display = "none";
        break;

      case "\\h":
        lastBookName = line.replace(/\\[a-z]+\s*/g, "").trim();
        break;

      case "\\c":
        paragraph.style.fontWeight = "bold";
        paragraph.textContent = `${lastBookName} ${line.replace(
          /\\[a-z]+\s*/g,
          ""
        )}`;
        break;

      case "\\s1":
      case "\\s2":
      case "\\s3":
        // replace the number after s
        paragraph.style.fontStyle = "italic";
        paragraph.textContent = line.replace(/\\[a-z]+\d+\s*/g, "").trim();
        break;

      default:
        paragraph.textContent = line.replace(/\\[a-z]+\s*/g, "").trim();
        break;
    }

    if (paragraph.textContent) {
      container.appendChild(paragraph);
    }
  });
}

readUsfmFile("44JHNBSB.usfm");
