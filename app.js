let QUESTIONS = [];
let QUIZ = [];
let RESULTS = [];
let MODE = "A";
let INDEX = 0;

const NUM_QUESTIONS = 25;
const PASS_MARK = 20;

async function loadQuestions() {
  const res = await fetch("questions.csv");
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const delimiter = lines[0].includes(";") ? ";" : ",";

  const headers = lines[0]
    .split(delimiter)
    .map(h => h.replace(/\uFEFF/g, "").trim());

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);
    if (cols.length < headers.length) continue;

    let obj = {};
    headers.forEach((h, j) => obj[h] = (cols[j] || "").trim());
    if (!obj.correct_answer) continue;

    QUESTIONS.push(obj);
  }

  showStart();
}

function showStart() {
  document.getElementById("app").innerHTML = `
    <div class="cyan">
      <p>${QUESTIONS.length} spørgsmål er klar.</p>
      <p>Vælg tilstand:</p>
    </div>
    <button onclick="startQuiz('A')">A – Standard</button><br>
    <button onclick="startQuiz('B')">B – Studie</button><br>
    <button onclick="startQuiz('C')">C – Test</button>
  `;
}

function startQuiz(mode) {
  MODE = mode;
  QUIZ = [...QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, NUM_QUESTIONS);
  RESULTS = [];
  INDEX = 0;
  showQuestion();
}

function showQuestion() {
  const q = QUIZ[INDEX];
  const correct = q.correct_answer.trim().toUpperCase();

  let html = `
    <div class="cyan">
      <p>Spørgsmål ${INDEX + 1} af ${QUIZ.length}</p>
      <p>Sæson: ${q.season} | År: ${q.year} | Nr: ${q.question_number}</p>
      <hr>
    </div>
    <p>${q.question_text}</p>
  `;

  ["A","B","C"].forEach(letter => {
    const txt = q["option_" + letter];
    if (!txt) return;

    if (MODE === "C" && letter === correct) {
      html += `<button onclick="answer('${letter}')">${letter}: ${txt} ← KORREKT SVAR</button><br>`;
    } else {
      html += `<button onclick="answer('${letter}')">${letter}: ${txt}</button><br>`;
    }
  });

  document.getElementById("app").innerHTML = html;
}

function answer(letter) {
  const q = QUIZ[INDEX];
  const correct = q.correct_answer.trim().toUpperCase();
  const ok = letter === correct;

  RESULTS.push({ q, letter, correct, ok });

  if (MODE === "B" || MODE === "C") {
    if (ok) {
      alert("KORREKT!");
    } else {
      alert(`FORKERT.\nKorrekt svar: ${correct}: ${q["option_" + correct]}`);
    }
  }

  INDEX++;
  if (INDEX >= QUIZ.length) {
    showResults();
  } else {
    showQuestion();
  }
}

function showResults() {
  const correctCount = RESULTS.filter(r => r.ok).length;
  let html = `
    <div class="cyan">
      <h2>Resultat</h2>
      <p>Du fik ${correctCount} ud af ${QUIZ.length} rigtige.</p>
    </div>
  `;

  if (correctCount >= PASS_MARK) {
    html += renderFlag();
  } else {
    html += renderSadCat();
  }

  html += `<div class="review-block"><h3>Detaljeret oversigt</h3>`;

  RESULTS.forEach((r, i) => {
    html += `
      <div class="review-block">
        <p><strong>Spørgsmål ${i+1}</strong> (${r.q.season} ${r.q.year}, nr. ${r.q.question_number})</p>
        <p>${r.q.question_text}</p>
        <p>Dit svar: ${r.letter}: ${r.q["option_" + r.letter] || ""}</p>
        <p>Rigtigt svar: ${r.correct}: ${r.q["option_" + r.correct]}</p>
        <p class="${r.ok ? "correct" : "wrong"}">${r.ok ? "KORREKT" : "FORKERT"}</p>
      </div>
    `;
  });

  html += `
    <button onclick="showStart()">Tag en ny prøve</button>
  `;

  document.getElementById("app").innerHTML = html;
}

function renderFlag() {
  const lines = [
    "########+==+###############",
    "########+==+###############",
    "########+==+###############",
    "########+==+###############",
    "+++++++++==++++++++++++++++",
    "===========================",
    "+++++++++==++++++++++++++++",
    "########+==+###############",
    "########+==+###############",
    "########+==+###############",
    "########+==+###############"
  ];

  let html = `<pre>`;
  lines.forEach(line => {
    for (let char of line) {
      if (char === "#") {
        html += `<span class="flag-red">#</span>`;
      } else {
        html += `<span class="flag-white">${char}</span>`;
      }
    }
    html += "\n";
  });
  html += `</pre><p class="correct">TILLYKKE! 🇩🇰</p>`;
  return html;
}

function renderSadCat() {
  return `
<pre>
 /\\_/\\
( o.o )  < øv...
 > ^ <
</pre>
<p class="wrong">Du bestod ikke denne gang – prøv igen! 😿</p>
`;
}

loadQuestions();
