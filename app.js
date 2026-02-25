let QUESTIONS = [];
let QUIZ = [];
let RESULTS = [];
let MODE = "A";
let INDEX = 0;

let TIMER_INTERVAL = null;
let TIME_LEFT = 1800; // 30 minutes in seconds

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

    const obj = {};
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
      <li>Den officielle medborgerskabsprøve består af 25 skriftlige spørgsmål om det danske folkestyre, hverdagsliv samt dansk kultur og historie.</li>
      <li>Hvert spørgsmål har 2 eller 3 svarmuligheder.</li>
      <li>Prøven varer 30 minutter.</li>
      <li>Du skal have mindst 20 rigtige svar for at bestå.</li>
      <li>Bestået prøve kan opfylde kravet om medborgerskab ved ansøgning om permanent opholdstilladelse.</li>
    </ul>

    <p><em>Bemærk: Denne øveprøve indeholder udelukkende spørgsmål fra tidligere afholdte prøver.
    Der udvælges 25 tilfældige spørgsmål ved hver gennemførsel.</em></p>

    <h3>Vælg tilstand:</h3>

    <button onclick="startQuiz('A')">
      A – Standard (tidsbegrænset)<br>
      <small>Resultatet vises først, når alle spørgsmål er besvaret. Prøven er tidsbegrænset til 30 minutter.</small>
    </button><br>

    <button onclick="startQuiz('B')">
      B – Studie<br>
      <small>Du får at vide efter hvert spørgsmål, om dit svar er rigtigt eller forkert.</small>
    </button><br>

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
  if (el) el.innerText = `Tid tilbage: ${minutes}:${seconds.toString().padStart(2, "0")}`;
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
    <div id="quiz-wrapper">
      <div id="question-box">
        ${MODE === "A" ? `<div id="timer"></div>` : ""}

        <p><strong>Spørgsmål ${INDEX + 1} af ${QUIZ.length}</strong></p>
        <p>Sæson: ${q.season} | År: ${q.year} | Nr: ${q.question_number}</p>
        <hr>
        <p>${q.question_text}</p>

        <div id="options">
  `;

  ["A", "B", "C"].forEach(letter => {
    const txt = q["option_" + letter];
    if (!txt) return;

    // No "A/B/C:" prefix in button text.
    // In Bug Testing mode, mark correct answer subtly with a check.
    const suffix = (MODE === "C" && letter === correct) ? " ✓" : "";

    html += `
      <button id="opt-${letter}" onclick="answer('${letter}')">${escapeHtml(txt)}${suffix}</button>
    `;
  });

  html += `
        </div>

        <div id="feedback" style="margin-top:20px; min-height:60px;"></div>
      </div>

      <div id="quiz-footer">
        <button class="secondary" onclick="showStart()">Nulstil prøve</button>
      </div>
    </div>
  `;

  document.getElementById("app").innerHTML = html;
  if (MODE === "A") updateTimerDisplay();
}

function answer(letter) {
  const q = QUIZ[INDEX];
  const correct = q.correct_answer.trim().toUpperCase();
  const ok = letter === correct;

  RESULTS.push({ q, letter, correct, ok });

  // Mode A = no feedback during quiz: move on immediately
  if (MODE === "A") {
    nextQuestion();
    return;
  }

  // Modes B/C: reveal colors, keep options visible, then allow "Next"
  revealCorrectness(correct);

  const fb = document.getElementById("feedback");
  if (ok) {
    fb.innerHTML = `<div style="color:green; font-weight:bold;">KORREKT!</div>
                    <button onclick="nextQuestion()">Næste spørgsmål</button>`;
  } else {
    const correctText = q["option_" + correct] || "";
    fb.innerHTML = `<div style="color:crimson; font-weight:bold;">
                      FORKERT – korrekt svar er ${escapeHtml(correctText)}
                    </div>
                    <button onclick="nextQuestion()">Næste spørgsmål</button>`;
  }
}

function revealCorrectness(correctLetter) {
  ["A", "B", "C"].forEach(letter => {
    const btn = document.getElementById(`opt-${letter}`);
    if (!btn) return;

    // Disable further clicks without changing to grey "disabled" styling
    btn.onclick = null;
    btn.style.cursor = "default";

    if (letter === correctLetter) {
      btn.style.background = "#16a34a"; // green
    } else {
      btn.style.background = "#dc2626"; // red
    }
  });
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
  // End immediately in Standard mode when time runs out
  showResults(true);
}

/* ---------------- RESULTS ---------------- */

function showResults(timedOut = false) {
  clearTimer();

  const correctCount = RESULTS.filter(r => r.ok).length;

  let html = `
    <h2>Resultat</h2>
    ${timedOut ? `<p style="color:crimson; font-weight:bold;">Tiden er udløbet.</p>` : ""}
    <p>Du fik ${correctCount} ud af ${QUIZ.length} rigtige.</p>
  `;

  if (correctCount >= PASS_MARK) {
    html += renderFlag();
  } else {
    html += renderSadCat();
  }

  html += `<h3>Detaljeret oversigt</h3>`;

  RESULTS.forEach((r, i) => {
    const userText = r.q["option_" + r.letter] || "";
    const correctText = r.q["option_" + r.correct] || "";

    html += `
      <div style="border-top:1px solid #ccc; margin-top:10px; padding-top:10px;">
        <p><strong>Spørgsmål ${i + 1}</strong> (${r.q.season} ${r.q.year}, nr. ${r.q.question_number})</p>
        <p>${escapeHtml(r.q.question_text || "")}</p>
        <p>Dit svar: ${escapeHtml(userText)}</p>
        <p>Rigtigt svar: ${escapeHtml(correctText)}</p>
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
    for (const ch of line) {
      if (ch === "#") html += `<span style="color:red">#</span>`;
      else html += `<span style="color:#ddd">${escapeHtml(ch)}</span>`;
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

/* ---------------- UTILS ---------------- */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadQuestions();
