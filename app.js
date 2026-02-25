let QUESTIONS = [];
let QUIZ = [];
let RESULTS = [];
let MODE = "A";
let INDEX = 0;
let TIMER_INTERVAL = null;
let TIME_LEFT = 1800;

const NUM_QUESTIONS = 25;
const PASS_MARK = 20;

/* ---------------- LOAD ---------------- */

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

/* ---------------- START SCREEN ---------------- */

function showStart() {
  clearTimer();

  document.getElementById("app").innerHTML = `
    <p><strong>Der er indlæst ${QUESTIONS.length} spørgsmål fra tidligere prøver.</strong></p>

    <h3>Om prøven:</h3>
    <ul>
      <li>Den officielle prøve består af 25 spørgsmål.</li>
      <li>Du skal have mindst 20 rigtige for at bestå.</li>
      <li>Prøven varer 30 minutter.</li>
    </ul>

    <p><em>Denne øveprøve bruger udelukkende tidligere spørgsmål. 
    Der udvælges 25 tilfældige spørgsmål ved hver gennemførsel.</em></p>

    <h3>Vælg tilstand:</h3>

    <button onclick="startQuiz('A')">
      A – Standard (tidsbegrænset)<br>
      <small>Resultatet vises først til sidst. 30 minutters tidsbegrænsning.</small>
    </button><br><br>

    <button onclick="startQuiz('B')">
      B – Studie<br>
      <small>Du får straks at vide, om dit svar er rigtigt eller forkert.</small>
    </button><br><br>

    <button onclick="startQuiz('C')">
      C – Bug Testing<br>
      <small>Det korrekte svar er markeret på forhånd.</small>
    </button>
  `;
}

/* ---------------- TIMER ---------------- */

function startTimer() {
  TIME_LEFT = 1800;
  TIMER_INTERVAL = setInterval(() => {
    TIME_LEFT--;
    updateTimerDisplay();

    if (TIME_LEFT <= 0) {
      clearTimer();
      endDueToTimeout();
    }
  }, 1000);
}

function clearTimer() {
  if (TIMER_INTERVAL) {
    clearInterval(TIMER_INTERVAL);
    TIMER_INTERVAL = null;
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(TIME_LEFT / 60);
  const seconds = TIME_LEFT % 60;
  const el = document.getElementById("timer");
  if (el) el.innerText =
    `Tid tilbage: ${minutes}:${seconds.toString().padStart(2,'0')}`;
}

/* ---------------- QUIZ ---------------- */

function startQuiz(mode) {
  MODE = mode;
  QUIZ = [...QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, NUM_QUESTIONS);
  RESULTS = [];
  INDEX = 0;

  if (MODE === "A") startTimer();
  showQuestion();
}

function showQuestion() {
  const q = QUIZ[INDEX];
  const correct = q.correct_answer.trim().toUpperCase();

  let html = `
    ${MODE === "A" ? `<div id="timer"></div>` : ""}
    <p><strong>Spørgsmål ${INDEX + 1} af ${QUIZ.length}</strong></p>
    <p>Sæson: ${q.season} | År: ${q.year} | Nr: ${q.question_number}</p>
    <hr>
    <p>${q.question_text}</p>
    <div id="options">
  `;

  ["A","B","C"].forEach(letter => {
    const txt = q["option_" + letter];
    if (!txt) return;

    if (MODE === "C" && letter === correct) {
      html += `<button onclick="answer('${letter}')">${letter}: ${txt} ← KORREKT</button><br>`;
    } else {
      html += `<button onclick="answer('${letter}')">${letter}: ${txt}</button><br>`;
    }
  });

  html += `
    </div>
    <div id="feedback" style="margin-top:15px;"></div>
    <br>
    <button onclick="showStart()">Nulstil prøve</button>
  `;

  document.getElementById("app").innerHTML = html;
  if (MODE === "A") updateTimerDisplay();
}

function answer(letter) {
  const q = QUIZ[INDEX];
  const correct = q.correct_answer.trim().toUpperCase();
  const ok = letter === correct;

  RESULTS.push({ q, letter, correct, ok });

  if (MODE === "B" || MODE === "C") {
    const fb = document.getElementById("feedback");

    if (ok) {
      fb.innerHTML = `<p style="color:green; font-weight:bold;">KORREKT!</p>`;
    } else {
      fb.innerHTML = `
        <p style="color:crimson; font-weight:bold;">
          FORKERT – korrekt svar er ${correct}: ${q["option_" + correct]}
        </p>`;
    }

    fb.innerHTML += `<button onclick="nextQuestion()">Næste spørgsmål</button>`;

    document.getElementById("options").innerHTML = "";
  } else {
    nextQuestion();
  }
}

function nextQuestion() {
  INDEX++;
  if (INDEX >= QUIZ.length) {
    showResults();
  } else {
    showQuestion();
  }
}

/* ---------------- TIMEOUT ---------------- */

function endDueToTimeout() {
  document.getElementById("app").innerHTML +=
    `<p style="color:crimson; font-weight:bold;">Tiden er udløbet.</p>`;
  showResults();
}

/* ---------------- RESULTS ---------------- */

function showResults() {
  clearTimer();
  const correctCount = RESULTS.filter(r => r.ok).length;

  let html = `
    <h2>Resultat</h2>
    <p>Du fik ${correctCount} ud af ${QUIZ.length} rigtige.</p>
  `;

  if (correctCount >= PASS_MARK) {
    html += renderFlag();
  } else {
    html += renderSadCat();
  }

  html += `<h3>Detaljeret oversigt</h3>`;

  RESULTS.forEach((r, i) => {
    html += `
      <div style="border-top:1px solid #ccc; margin-top:10px; padding-top:10px;">
        <p><strong>Spørgsmål ${i+1}</strong> (${r.q.season} ${r.q.year}, nr. ${r.q.question_number})</p>
        <p>${r.q.question_text}</p>
        <p>Dit svar: ${r.letter}: ${r.q["option_" + r.letter] || ""}</p>
        <p>Rigtigt svar: ${r.correct}: ${r.q["option_" + r.correct]}</p>
        <p style="color:${r.ok ? "green" : "crimson"}; font-weight:bold;">
          ${r.ok ? "KORREKT" : "FORKERT"}
        </p>
      </div>
    `;
  });

  html += `<br><button onclick="showStart()">Tag en ny prøve</button>`;

  document.getElementById("app").innerHTML = html;
}

/* ---------------- ASCII ---------------- */

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
      if (char === "#") html += `<span style="color:red">#</span>`;
      else html += `<span style="color:#ddd">${char}</span>`;
    }
    html += "\n";
  });
  html += `</pre><p style="color:green; font-weight:bold;">TILLYKKE! 🇩🇰</p>`;
  return html;
}

function renderSadCat() {
  return `
<pre>
 /\\_/\\
( o.o )  < øv...
 > ^ <
</pre>
<p style="color:crimson; font-weight:bold;">Du bestod ikke denne gang – prøv igen! 😿</p>
`;
}

loadQuestions();
