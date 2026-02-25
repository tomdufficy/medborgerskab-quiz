let QUESTIONS = [];

async function loadQuestions() {
  const res = await fetch("questions.csv");
  const text = await res.text();

  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.replace(/^\uFEFF/, "").trim());

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < headers.length) continue;

    let obj = {};
    headers.forEach((h, j) => obj[h] = cols[j].trim());
    if (!obj.correct_answer) continue;

    QUESTIONS.push(obj);
  }

  document.getElementById("app").innerHTML =
    `<p>${QUESTIONS.length} spørgsmål indlæst.</p>`;
}

loadQuestions();
