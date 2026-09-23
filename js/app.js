/* ==========================================================
   Pasapalabras — app.js
   Modo manual:
   - Iniciar muestra la primera pregunta y arranca el tiempo.
   - Correcta / Incorrecta avanzan a la siguiente (tiempo sigue).
   - Pasapalabra marca la letra en gris, DETIENE el tiempo y
     deja la siguiente pregunta lista. Continuar reanuda.
   ========================================================== */

"use strict";

/* ---------- Constantes ---------- */

const STATUS = {
  PENDING: "pending",
  CORRECT: "correct",
  INCORRECT: "incorrect",
  PASSED: "passed",
};

// Abecedario español (27 letras, incluye Ñ)
const ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G",
  "H", "I", "J", "K", "L", "M", "N",
  "Ñ", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z",
];

const DEFAULT_TIME = 60;
const MIN_TIME = 1;

// Mapeo estado -> clase CSS (nunca estilos inline)
const STATUS_CLASS = {
  [STATUS.CORRECT]: "letter--correct",
  [STATUS.INCORRECT]: "letter--incorrect",
  [STATUS.PASSED]: "letter--passed",
};

/* ---------- Estado global de la partida ---------- */

const state = {
  letters: [],       // [{ letter, question, answer, status }]
  currentIndex: 0,   // índice dentro de state.letters
  timeLeft: DEFAULT_TIME,
  timerId: null,
  correctCount: 0,
  isPlaying: false,
  isPaused: false,
};

/* ---------- Referencias DOM (se resuelven en init) ---------- */

const el = {};

/* ---------- Construcción de datos ---------- */

/* Banco de preguntas fáciles para niños.
   Todas son "Empieza por..." salvo W que es "Contiene..." por ser poco común. */
const QUESTION_BANK = {
  A: { question: "Empieza por A: Insecto que vuela, hace zum y nos da miel.", answer: "Abeja" },
  B: { question: "Empieza por B: Fruta amarilla y alargada que les encanta a los monos.", answer: "Banana" },
  C: { question: "Empieza por C: Animal de orejas largas que come zanahorias.", answer: "Conejo" },
  D: { question: "Empieza por D: Animal gigante que ya no existe y tenía dientes enormes.", answer: "Dinosaurio" },
  E: { question: "Empieza por E: Animal enorme con trompa larga y orejas grandes.", answer: "Elefante" },
  F: { question: "Empieza por F: Planta de muchos colores que huele muy bien.", answer: "Flor" },
  G: { question: "Empieza por G: Animal con bigotes que dice miau.", answer: "Gato" },
  H: { question: "Empieza por H: Comida fría y dulce que comemos en verano.", answer: "Helado" },
  I: { question: "Empieza por I: Pedazo de tierra rodeado de agua por todas partes.", answer: "Isla" },
  J: { question: "Empieza por J: Animal con el cuello muy largo que come hojas de los árboles.", answer: "Jirafa" },
  K: { question: "Empieza por K: Animal gris y peludo que abraza los árboles en Australia.", answer: "Koala" },
  L: { question: "Empieza por L: Sale de noche en el cielo y a veces parece una banana.", answer: "Luna" },
  M: { question: "Empieza por M: Fruta roja o verde que comía Blancanieves.", answer: "Manzana" },
  N: { question: "Empieza por N: Blancas y esponjosas, están en el cielo y a veces traen lluvia.", answer: "Nube" },
  "Ñ": { question: "Empieza por Ñ: Ave grande que corre muy rápido y parece un avestruz chiquito.", answer: "Ñandú" },
  O: { question: "Empieza por O: Animal grande y peludo que duerme todo el invierno.", answer: "Oso" },
  P: { question: "Empieza por P: El mejor amigo del hombre, ladra y mueve la cola.", answer: "Perro" },
  Q: { question: "Empieza por Q: Comida amarilla con agujeros que les gusta a los ratones.", answer: "Queso" },
  R: { question: "Empieza por R: Animal verde que salta y dice croac.", answer: "Rana" },
  S: { question: "Empieza por S: Nos da luz y calor durante el día.", answer: "Sol" },
  T: { question: "Empieza por T: Animal lento que lleva su casa en la espalda.", answer: "Tortuga" },
  U: { question: "Empieza por U: Fruta chiquita y redonda que crece en racimos.", answer: "Uva" },
  V: { question: "Empieza por V: Animal que dice muu y nos da leche.", answer: "Vaca" },
  W: { question: "Contiene la W: Nos conecta el celu y la compu a internet sin cables.", answer: "Wifi" },
  X: { question: "Empieza por X: Instrumento de colores que se toca con dos palitos.", answer: "Xilófono" },
  Y: { question: "Empieza por Y: Juguete que sube y baja atado a un hilo.", answer: "Yoyo" },
  Z: { question: "Empieza por Z: Verdura naranja y alargada que les encanta a los conejos.", answer: "Zanahoria" },
};

function createLetter(letter) {
  const entry = QUESTION_BANK[letter] || {};
  return {
    letter,
    question: entry.question || `Pregunta con la letra ${letter}…`,
    answer: entry.answer || "",
    status: STATUS.PENDING,
  };
}

function buildLetters() {
  return ALPHABET.map(createLetter);
}

function getConfiguredTime() {
  const value = Number.parseInt(el.timeConfig.value, 10);
  if (Number.isNaN(value) || value < MIN_TIME) return DEFAULT_TIME;
  return Math.floor(value);
}

/* ---------- Render ---------- */

function buildRosco() {
  el.rosco.innerHTML = "";
  const total = state.letters.length;

  state.letters.forEach((item, index) => {
    const li = document.createElement("li");
    // -90° para que la A (índice 0) quede arriba de todo (12 en punto).
    const angle = (360 / total) * index - 90;

    li.className = "letter";
    li.id = `letter-${item.letter}`;
    li.textContent = item.letter;
    li.dataset.index = String(index);
    li.title = `Letra ${item.letter}`;
    li.style.setProperty("--angle", `${angle}deg`);

    el.rosco.appendChild(li);
  });
}

function renderTimer() {
  el.timer.textContent = String(state.timeLeft);
  el.timer.classList.toggle("timer--warning", state.timeLeft <= 10 && state.timeLeft > 5);
  el.timer.classList.toggle("timer--danger", state.timeLeft <= 5);
}

function renderScore() {
  el.score.textContent = `Correctas: ${state.correctCount}`;
}

function renderQuestion() {
  // Antes de jugar o al reiniciar: placeholder.
  if (!state.isPlaying) {
    el.questionText.textContent = "Aquí aparecerá la pregunta";
    el.currentLetter.textContent = "–";
    return;
  }
  const current = state.letters[state.currentIndex];
  if (!current) {
    el.questionText.textContent = "Aquí aparecerá la pregunta";
    el.currentLetter.textContent = "–";
    return;
  }
  el.questionText.textContent = current.question;
  el.currentLetter.textContent = current.letter;
}

/**
 * Aplica el estado visual de una letra usando solo clases CSS.
 */
function setLetterStatus(letter, status, isCurrent = false) {
  const node = document.getElementById(`letter-${letter}`);
  if (!node) return;

  node.classList.remove(
    STATUS_CLASS[STATUS.CORRECT],
    STATUS_CLASS[STATUS.INCORRECT],
    STATUS_CLASS[STATUS.PASSED],
    "letter--current"
  );

  if (STATUS_CLASS[status]) node.classList.add(STATUS_CLASS[status]);
  if (isCurrent) node.classList.add("letter--current");
}

/** Repinta todo el rosco según state + letra actual. */
function refreshCurrentHighlight() {
  state.letters.forEach((item, index) => {
    const isCurrent = state.isPlaying && index === state.currentIndex;
    setLetterStatus(item.letter, item.status, isCurrent);
  });
}

/** Habilita/deshabilita controles según si la partida está activa. */
function setControlsPlaying(active) {
  // Iniciar sigue habilitado en pausa para actuar como "Continuar".
  el.btnStart.disabled = state.isPlaying && !state.isPaused;
  el.btnPause.disabled = !state.isPlaying;
  el.btnCorrect.disabled = !active;
  el.btnWrong.disabled = !active;
  el.btnPass.disabled = !active;
  el.timeConfig.disabled = state.isPlaying;
}

function updatePauseButton() {
  el.btnPause.textContent = state.isPaused ? "Reanudar" : "Pausar";
}

function updateStartButton() {
  el.btnStart.textContent = state.isPaused ? "Continuar" : "Iniciar";
}

function updateControlButtons() {
  updatePauseButton();
  updateStartButton();
}

/* ---------- Temporizador ---------- */

function startTimer() {
  stopTimer();
  state.timerId = setInterval(tick, 1000);
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function tick() {
  if (!state.isPlaying || state.isPaused) return;
  state.timeLeft -= 1;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    renderTimer();
    endGame("time");
    return;
  }
  renderTimer();
}

/* ---------- Avance del rosco ---------- */

function hasUnresolved() {
  return state.letters.some(
    (item) => item.status === STATUS.PENDING || item.status === STATUS.PASSED
  );
}

/** Busca la siguiente letra pendiente o pasada (para 1ª y 2ª vuelta). -1 si no hay. */
function findNextUnresolvedIndex(fromIndex) {
  const total = state.letters.length;
  for (let step = 1; step <= total; step += 1) {
    const idx = (fromIndex + step) % total;
    const status = state.letters[idx].status;
    if (status === STATUS.PENDING || status === STATUS.PASSED) return idx;
  }
  return -1;
}

function setCurrent(index) {
  state.currentIndex = index;
  refreshCurrentHighlight();
  renderQuestion();
}

/** Marca la letra actual y avanza. Es la única vía de marcado (manual). */
function markCurrent(status) {
  if (!state.isPlaying || state.isPaused) return;
  const current = state.letters[state.currentIndex];
  if (!current) return;
  // Las ya resueltas (verde/rojo) no se vuelven a preguntar.
  if (current.status === STATUS.CORRECT || current.status === STATUS.INCORRECT) {
    const next = findNextUnresolvedIndex(state.currentIndex);
    if (next === -1) endGame("complete");
    else setCurrent(next);
    return;
  }

  current.status = status;
  if (status === STATUS.CORRECT) state.correctCount += 1;
  renderScore();

  const next = findNextUnresolvedIndex(state.currentIndex);
  if (next === -1) {
    refreshCurrentHighlight();
    endGame("complete");
    return;
  }
  setCurrent(next);
}

function markCorrect() {
  markCurrent(STATUS.CORRECT);
}

function markIncorrect() {
  markCurrent(STATUS.INCORRECT);
}

function passWord() {
  if (!state.isPlaying || state.isPaused) return;
  const current = state.letters[state.currentIndex];
  if (!current) return;
  if (current.status === STATUS.CORRECT || current.status === STATUS.INCORRECT) return;

  // 1. Marca la letra actual en gris.
  current.status = STATUS.PASSED;

  // 2. Busca la siguiente pendiente/pasada.
  const next = findNextUnresolvedIndex(state.currentIndex);
  if (next === -1) {
    refreshCurrentHighlight();
    endGame("complete");
    return;
  }

  // 3. Deja la siguiente pregunta ya visible...
  state.currentIndex = next;
  refreshCurrentHighlight();
  renderQuestion();

  // 4. ...pero con el tiempo detenido hasta pulsar Continuar.
  state.isPaused = true;
  stopTimer();
  setControlsPlaying(false);
  // Mantener habilitados Iniciar/Continuar y Reanudar para seguir.
  el.btnStart.disabled = false;
  el.btnPause.disabled = false;
  updateControlButtons();
}

/* ---------- Control de partida ---------- */

function startGame() {
  // Si está en pausa (por Pasapalabra o Pausar), actúa como "Continuar".
  if (state.isPlaying && state.isPaused) {
    state.isPaused = false;
    startTimer();
    setControlsPlaying(true);
    updateControlButtons();
    return;
  }
  if (state.isPlaying) return;

  // Si el rosco anterior quedó completo, empezar uno nuevo.
  if (!hasUnresolved()) state.letters = buildLetters();

  state.timeLeft = getConfiguredTime();
  state.correctCount = 0;
  state.isPlaying = true;
  state.isPaused = false;

  const first = findNextUnresolvedIndex(-1);
  state.currentIndex = first === -1 ? 0 : first;

  buildRosco();
  renderTimer();
  renderScore();
  setControlsPlaying(true);
  updateControlButtons();
  setCurrent(state.currentIndex);
  startTimer();
}

/** Botón de parar: congela el tiempo y el marcado. Pulsa de nuevo para reanudar. */
function pauseGame() {
  if (!state.isPlaying) return;
  if (state.isPaused) {
    state.isPaused = false;
    startTimer();
    setControlsPlaying(true);
  } else {
    state.isPaused = true;
    stopTimer();
    setControlsPlaying(false);
    // El botón de pausa debe seguir habilitado para poder reanudar.
    el.btnPause.disabled = false;
    el.btnStart.disabled = false;
  }
  updateControlButtons();
}

function resetGame() {
  stopTimer();
  state.isPlaying = false;
  state.isPaused = false;
  state.letters = buildLetters();
  state.currentIndex = 0;
  state.correctCount = 0;
  state.timeLeft = getConfiguredTime();

  buildRosco();
  renderTimer();
  renderScore();
  renderQuestion();
  setControlsPlaying(false);
  updateControlButtons();
}

function endGame(reason) {
  stopTimer();
  state.isPlaying = false;
  state.isPaused = false;
  refreshCurrentHighlight();
  setControlsPlaying(false);
  updateControlButtons();

  const total = state.letters.length;
  if (reason === "time") {
    el.questionText.textContent =
      `¡Tiempo agotado! Correctas: ${state.correctCount} de ${total}. ` +
      `Pulsa Reiniciar para volver a jugar.`;
  } else {
    el.questionText.textContent =
      `¡Rosco completo! Correctas: ${state.correctCount} de ${total}. ` +
      `Pulsa Reiniciar para volver a jugar.`;
  }
  el.currentLetter.textContent = "–";
}

/* ---------- Init ---------- */

function cacheDom() {
  el.timeConfig = document.getElementById("time-config");
  el.btnStart = document.getElementById("btn-start");
  el.btnPause = document.getElementById("btn-pause");
  el.btnReset = document.getElementById("btn-reset");
  el.timer = document.getElementById("timer");
  el.score = document.getElementById("score");
  el.rosco = document.getElementById("rosco");
  el.questionText = document.getElementById("question-text");
  el.currentLetter = document.getElementById("current-letter");
  el.btnCorrect = document.getElementById("btn-correct");
  el.btnWrong = document.getElementById("btn-wrong");
  el.btnPass = document.getElementById("btn-pass");
}

function bindEvents() {
  el.btnStart.addEventListener("click", startGame);
  el.btnPause.addEventListener("click", pauseGame);
  el.btnReset.addEventListener("click", resetGame);
  el.btnCorrect.addEventListener("click", markCorrect);
  el.btnWrong.addEventListener("click", markIncorrect);
  el.btnPass.addEventListener("click", passWord);

  // Clic en una letra pendiente/pasada para saltar a ella.
  el.rosco.addEventListener("click", (event) => {
    const node = event.target.closest(".letter");
    if (!node || !state.isPlaying || state.isPaused) return;
    const idx = Number.parseInt(node.dataset.index, 10);
    if (Number.isNaN(idx)) return;
    const item = state.letters[idx];
    if (!item) return;
    if (item.status === STATUS.CORRECT || item.status === STATUS.INCORRECT) return;
    setCurrent(idx);
  });

  // El temporizador muestra en vivo el tiempo configurado (antes de jugar)
  el.timeConfig.addEventListener("input", () => {
    if (state.isPlaying) return;
    state.timeLeft = getConfiguredTime();
    renderTimer();
  });
}

function init() {
  cacheDom();
  state.letters = buildLetters();
  state.timeLeft = getConfiguredTime();
  buildRosco();
  renderTimer();
  renderScore();
  renderQuestion();
  setControlsPlaying(false);
  updateControlButtons();
  bindEvents();
}

document.addEventListener("DOMContentLoaded", init);
