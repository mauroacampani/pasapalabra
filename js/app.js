/* ==========================================================
   Pasapalabras — app.js
   Modo manual con 4 roscos elegibles:
   - Rosco 1 y 2: fáciles para niños.
   - Rosco 3 (medio) y 4 (difícil): un reto mayor.
   - Iniciar muestra la primera pregunta y arranca el tiempo.
   - Correcta avanza (tiempo sigue).
   - Incorrecta y Pasapalabra avanzan pero DETIENEN el tiempo.
     Continuar reanuda.
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
  roscoIndex: 0,     // rosco elegido (0-3)
};

/* ---------- Referencias DOM (se resuelven en init) ---------- */

const el = {};

/* ---------- Construcción de datos ---------- */

/* ---------- Bancos de preguntas ---------- */

/* 4 roscos: 1 y 2 fáciles para niños, 3 medio y 4 difícil.
   Cada banco cubre las 27 letras (incluye Ñ). */
const ROSCOS = [
  {
    name: "Primeras palabras",
    level: "Fácil",
    description: "Animales y cosas de todos los días.",
    questions: {
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
    },
  },
  {
    name: "Juegos y comida",
    level: "Fácil",
    description: "Juguetes, comida y lugares conocidos.",
    questions: {
      A: { question: "Empieza por A: Medio de transporte que vuela por el cielo.", answer: "Avión" },
      B: { question: "Empieza por B: Tiene dos ruedas y se maneja con pedales.", answer: "Bicicleta" },
      C: { question: "Empieza por C: Dulce chiquito de muchos sabores.", answer: "Caramelo" },
      D: { question: "Empieza por D: Cubo con puntitos para jugar a la oca.", answer: "Dado" },
      E: { question: "Empieza por E: Lugar donde aprendemos con amigos y maestras.", answer: "Escuela" },
      F: { question: "Empieza por F: Deporte donde se patea una pelota.", answer: "Fútbol" },
      G: { question: "Empieza por G: Se infla con aire y flota en las fiestas.", answer: "Globo" },
      H: { question: "Empieza por H: Pan redondo con carne y queso, con papas al lado.", answer: "Hamburguesa" },
      I: { question: "Empieza por I: Atrae los metales y pega dibujos en la heladera.", answer: "Imán" },
      J: { question: "Empieza por J: Bebida dulce de naranja o manzana.", answer: "Jugo" },
      K: { question: "Empieza por K: Salsa roja para las papas fritas.", answer: "Ketchup" },
      L: { question: "Empieza por L: Sirve para escribir y dibujar.", answer: "Lápiz" },
      M: { question: "Empieza por M: Juguete con forma de bebé para abrazar.", answer: "Muñeca" },
      N: { question: "Empieza por N: Agua blanca y fría que cae en invierno.", answer: "Nieve" },
      "Ñ": { question: "Empieza por Ñ: Comida italiana chiquita hecha de papa.", answer: "Ñoqui" },
      O: { question: "Empieza por O: Sirve para cocinar la sopa.", answer: "Olla" },
      P: { question: "Empieza por P: Hace reír con su nariz roja.", answer: "Payaso" },
      Q: { question: "Empieza por Q: Lugar donde compramos golosinas.", answer: "Quiosco" },
      R: { question: "Empieza por R: Lo abrimos con alegría en los cumpleaños.", answer: "Regalo" },
      S: { question: "Empieza por S: Pan con jamón y queso adentro.", answer: "Sándwich" },
      T: { question: "Empieza por T: Transporte largo con muchos vagones.", answer: "Tren" },
      U: { question: "Empieza por U: Ropa igual para todos en la escuela.", answer: "Uniforme" },
      V: { question: "Empieza por V: Parte de la casa para mirar afuera.", answer: "Ventana" },
      W: { question: "Empieza por W: Dulce con cuadraditos, rico con miel.", answer: "Wafle" },
      X: { question: "Empieza por X: Instrumento de colores que suena con dos palitos.", answer: "Xilófono" },
      Y: { question: "Empieza por Y: Comida cremosa de frutilla o vainilla.", answer: "Yogur" },
      Z: { question: "Empieza por Z: Lo usamos en los pies para salir.", answer: "Zapato" },
    },
  },
  {
    name: "Exploradores",
    level: "Medio",
    description: "Planetas, animales y naturaleza. Un poco más difícil.",
    questions: {
      A: { question: "Empieza por A: Continente de hielo en el polo sur.", answer: "Antártida" },
      B: { question: "Empieza por B: Lugar con muchísimos árboles juntos.", answer: "Bosque" },
      C: { question: "Empieza por C: Animal que cambia de color para esconderse.", answer: "Camaleón" },
      D: { question: "Empieza por D: Dinosaurio gigante de cuello larguísimo.", answer: "Diplodocus" },
      E: { question: "Empieza por E: Momento en que la Luna tapa al Sol.", answer: "Eclipse" },
      F: { question: "Empieza por F: Proceso con el que las plantas fabrican su propio alimento usando el sol.", answer: "Fotosíntesis" },
      G: { question: "Empieza por G: Fuerza invisible que nos pega al suelo.", answer: "Gravedad" },
      H: { question: "Empieza por H: Parte dura del cuerpo que nos sostiene.", answer: "Hueso" },
      I: { question: "Empieza por I: Bichito de 6 patas, como la hormiga.", answer: "Insecto" },
      J: { question: "Empieza por J: El planeta más grande del sistema solar.", answer: "Júpiter" },
      K: { question: "Empieza por K: Mil gramos para pesar la fruta.", answer: "Kilogramo" },
      L: { question: "Empieza por L: Roca derretida que sale de los volcanes.", answer: "Lava" },
      M: { question: "Empieza por M: Planeta rojo vecino de la Tierra.", answer: "Marte" },
      N: { question: "Empieza por N: Gas que forma la mayor parte del aire.", answer: "Nitrógeno" },
      "Ñ": { question: "Empieza por Ñ: Ave corredora de la Patagonia, prima del avestruz.", answer: "Ñandú" },
      O: { question: "Empieza por O: Camino de la Tierra alrededor del Sol.", answer: "Órbita" },
      P: { question: "Empieza por P: Punto más frío de la Tierra, norte o sur.", answer: "Polo" },
      Q: { question: "Empieza por Q: Ciencia que estudia los materiales y las mezclas.", answer: "Química" },
      R: { question: "Empieza por R: Luz rapidísima que aparece en las tormentas.", answer: "Relámpago" },
      S: { question: "Empieza por S: Planeta famoso por sus anillos.", answer: "Saturno" },
      T: { question: "Empieza por T: Dinosaurio carnívoro de brazos cortitos.", answer: "Tiranosaurio" },
      U: { question: "Empieza por U: Parte de la vaca de donde sale la leche.", answer: "Ubre" },
      V: { question: "Empieza por V: Montaña que escupe lava.", answer: "Volcán" },
      W: { question: "Contiene la W: Conjunto de páginas que visitamos en internet.", answer: "Web" },
      X: { question: "Empieza por X: Gas que se usa en las luces potentes de los autos.", answer: "Xenón" },
      Y: { question: "Empieza por Y: Lugar donde se encuentran fósiles.", answer: "Yacimiento" },
      Z: { question: "Empieza por Z: Sonido que hacen las abejas al volar.", answer: "Zumbido" },
    },
  },
  {
    name: "Reto de genios",
    level: "Difícil",
    description: "Ciencia y palabras desafiantes para expertos.",
    questions: {
      A: { question: "Empieza por A: Persona que estudia las estrellas y planetas.", answer: "Astrónomo" },
      B: { question: "Empieza por B: Instrumento con aguja que siempre apunta al norte.", answer: "Brújula" },
      C: { question: "Empieza por C: Paso del vapor de agua a líquido, como en el vidrio frío.", answer: "Condensación" },
      D: { question: "Empieza por D: Montaña de arena que el viento mueve.", answer: "Duna" },
      E: { question: "Empieza por E: Desgaste de las rocas por el agua y el viento.", answer: "Erosión" },
      F: { question: "Empieza por F: Fuerza que frena cuando algo roza.", answer: "Fricción" },
      G: { question: "Empieza por G: Rama de la matemática de figuras y ángulos.", answer: "Geometría" },
      H: { question: "Empieza por H: Sueño larguísimo de algunos animales en invierno.", answer: "Hibernación" },
      I: { question: "Empieza por I: Roca formada por lava enfriada.", answer: "Ígnea" },
      J: { question: "Empieza por J: Escritura con dibujos del antiguo Egipto.", answer: "Jeroglífico" },
      K: { question: "Empieza por K: Unidad para medir la temperatura absoluta.", answer: "Kelvin" },
      L: { question: "Empieza por L: Distancia de un lugar al ecuador.", answer: "Latitud" },
      M: { question: "Empieza por M: Cambio de oruga a mariposa.", answer: "Metamorfosis" },
      N: { question: "Empieza por N: Centro caliente de la Tierra.", answer: "Núcleo" },
      "Ñ": { question: "Contiene la Ñ: Estación del año con hojas amarillas.", answer: "Otoño" },
      O: { question: "Empieza por O: Capa que nos protege de los rayos del sol.", answer: "Ozono" },
      P: { question: "Empieza por P: Viaje del polen con ayuda de las abejas.", answer: "Polinización" },
      Q: { question: "Empieza por Q: Objeto brillantísimo y lejanísimo del universo.", answer: "Quásar" },
      R: { question: "Empieza por R: Giro de la Tierra sobre sí misma, dura un día.", answer: "Rotación" },
      S: { question: "Empieza por S: Igualdad perfecta de las dos mitades.", answer: "Simetría" },
      T: { question: "Empieza por T: Placas gigantes que se mueven y causan terremotos.", answer: "Tectónica" },
      U: { question: "Empieza por U: Ser vivo formado por una sola célula.", answer: "Unicelular" },
      V: { question: "Empieza por V: Lo espeso de un líquido, como la miel.", answer: "Viscosidad" },
      W: { question: "Contiene la W: Deporte acuático con tabla y vela.", answer: "Windsurf" },
      X: { question: "Empieza por X: Parte de la planta que lleva el agua hacia arriba.", answer: "Xilema" },
      Y: { question: "Empieza por Y: Parte amarilla del huevo.", answer: "Yema" },
      Z: { question: "Empieza por Z: Metal que protege del óxido.", answer: "Zinc" },
    },
  },
];

function getBank(index) {
  return ROSCOS[index] || ROSCOS[0];
}

function createLetter(letter, bank) {
  const entry = (bank && bank.questions[letter]) || {};
  return {
    letter,
    question: entry.question || `Pregunta con la letra ${letter}…`,
    answer: entry.answer || "",
    status: STATUS.PENDING,
  };
}

function buildLetters(bankIndex) {
  const bank = getBank(bankIndex);
  return ALPHABET.map((letter) => createLetter(letter, bank));
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
    li.style.setProperty("--angle-neg", `${-angle}deg`);

    el.rosco.appendChild(li);
  });
}

function renderTimer() {
  el.timer.textContent = String(state.timeLeft);
  el.timer.classList.toggle("timer--warning", state.timeLeft <= 10 && state.timeLeft > 5);
  el.timer.classList.toggle("timer--danger", state.timeLeft <= 5);
}

function renderScore() {
  el.score.textContent = String(state.correctCount);
}

function renderQuestion() {
  // Antes de jugar o al reiniciar: placeholder.
  if (!state.isPlaying) {
    el.questionText.textContent = "Aquí aparecerá la pregunta";
    el.answerText.textContent = "";
    el.currentLetter.textContent = "–";
    return;
  }
  const current = state.letters[state.currentIndex];
  if (!current) {
    el.questionText.textContent = "Aquí aparecerá la pregunta";
    el.answerText.textContent = "";
    el.currentLetter.textContent = "–";
    return;
  }
  el.questionText.textContent = current.question;
  el.answerText.textContent = current.answer || "";
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

/* ---------- Selección de rosco ---------- */

function renderRoscoName() {
  if (!el.roscoName) return;
  const bank = getBank(state.roscoIndex);
  el.roscoName.textContent = `· ${bank.name} (${bank.level})`;
}

function showSelectScreen() {
  if (!el.selectScreen) return;
  stopTimer();
  state.isPlaying = false;
  state.isPaused = false;
  setControlsPlaying(false);
  updateControlButtons();
  el.selectScreen.classList.remove("select-screen--hidden");
}

function hideSelectScreen() {
  if (!el.selectScreen) return;
  el.selectScreen.classList.add("select-screen--hidden");
}

function selectRosco(index) {
  state.roscoIndex = index;
  resetGame();
  renderRoscoName();
  hideSelectScreen();
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

/** Marca la letra actual en rojo, avanza y DETIENE el tiempo (igual que Pasapalabra). */
function markIncorrect() {
  markAndPause(STATUS.INCORRECT);
}

function passWord() {
  markAndPause(STATUS.PASSED);
}

/** Marca con el estado dado, muestra la siguiente y pausa hasta pulsar Continuar. */
function markAndPause(status) {
  if (!state.isPlaying || state.isPaused) return;
  const current = state.letters[state.currentIndex];
  if (!current) return;
  if (current.status === STATUS.CORRECT || current.status === STATUS.INCORRECT) return;

  // 1. Marca la letra actual (gris = pasada, rojo = incorrecta).
  current.status = status;

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

  // Si el rosco anterior quedó completo, empezar uno nuevo del mismo banco.
  if (!hasUnresolved()) state.letters = buildLetters(state.roscoIndex);

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
  state.letters = buildLetters(state.roscoIndex);
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
  el.answerText.textContent = "";
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
  el.answerText = document.getElementById("answer-text");
  el.currentLetter = document.getElementById("current-letter");
  el.btnCorrect = document.getElementById("btn-correct");
  el.btnWrong = document.getElementById("btn-wrong");
  el.btnPass = document.getElementById("btn-pass");
  el.btnChange = document.getElementById("btn-change");
  el.selectScreen = document.getElementById("select-screen");
  el.roscoOptions = document.getElementById("rosco-options");
  el.roscoName = document.getElementById("rosco-name");
}

function bindEvents() {
  el.btnStart.addEventListener("click", startGame);
  el.btnPause.addEventListener("click", pauseGame);
  el.btnReset.addEventListener("click", resetGame);
  el.btnCorrect.addEventListener("click", markCorrect);
  el.btnWrong.addEventListener("click", markIncorrect);
  el.btnPass.addEventListener("click", passWord);
  if (el.btnChange) el.btnChange.addEventListener("click", showSelectScreen);

  // Elección de rosco en la pantalla inicial.
  if (el.roscoOptions) {
    el.roscoOptions.addEventListener("click", (event) => {
      const option = event.target.closest("[data-rosco]");
      if (!option) return;
      const index = Number.parseInt(option.dataset.rosco, 10);
      if (Number.isNaN(index) || !ROSCOS[index]) return;
      selectRosco(index);
    });
  }

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
  bindEvents();
  state.roscoIndex = 0;
  state.letters = buildLetters(state.roscoIndex);
  state.timeLeft = getConfiguredTime();
  buildRosco();
  renderTimer();
  renderScore();
  renderQuestion();
  renderRoscoName();
  setControlsPlaying(false);
  updateControlButtons();
  // La pantalla inicial invita a elegir entre los 4 roscos.
  if (el.selectScreen) el.selectScreen.classList.remove("select-screen--hidden");
}

document.addEventListener("DOMContentLoaded", init);
