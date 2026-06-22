"use strict";

/*
 * Habla conmigo — LPS1001 Spanish Beginners Speaking Challenge
 * ------------------------------------------------------------------
 * To adapt the activity, edit the QUESTIONS array below. The challenge
 * gives up to QUESTION_DURATION_MS for each answer and always ends after
 * CHALLENGE_DURATION_MS of active (unpaused) speaking time.
 */

const CHALLENGE_DURATION_MS = 3 * 60 * 1000;
const QUESTION_DURATION_MS = 11 * 1000;
const END_OF_SPEECH_DELAY_MS = 1200;
const FAREWELL_WINDOW_MS = 12 * 1000;
const SPOKEN_INTRODUCTION =
  "¡Hola! Soy Lucía. Vamos a hablar en español. Escucha, responde y también puedes preguntarme: ¿Y tú? ¡Empezamos!";
const SPOKEN_FAREWELL =
  "Muchas gracias por hablar conmigo y por practicar español. Lo has hecho muy bien. ¡Hasta pronto!";

const QUESTIONS = [
  { es: "Hola, ¿cómo estás?", en: "Hello, how are you?" },
  { es: "¿Cómo te llamas?", en: "What is your name?" },
  { es: "¿Cuántos años tienes?", en: "How old are you?" },
  { es: "¿De dónde eres?", en: "Where are you from?" },
  { es: "¿Dónde vives?", en: "Where do you live?" },
  { es: "¿Qué estudias?", en: "What do you study?" },
  { es: "¿Tienes hermanos?", en: "Do you have brothers or sisters?" },
  { es: "¿Cómo es tu familia?", en: "What is your family like?" },
  { es: "¿Qué te gusta hacer en tu tiempo libre?", en: "What do you like doing in your free time?" },
  { es: "¿Te gusta la música?", en: "Do you like music?" },
  { es: "¿Qué comes normalmente?", en: "What do you normally eat?" },
  { es: "¿Qué bebes normalmente?", en: "What do you normally drink?" },
  { es: "¿Cómo es tu ciudad?", en: "What is your city like?" },
  { es: "¿Qué haces por la mañana?", en: "What do you do in the morning?" },
  { es: "¿Qué haces los fines de semana?", en: "What do you do at weekends?" },
  { es: "Describe un lugar que te gusta en tu ciudad.", en: "Describe a place you like in your city." }
];

const ENCOURAGEMENTS = ["¡Muy bien!", "¡Excelente!", "Continúa", "Muy buen intento"];
const FEMALE_VOICE_NAMES = [
  "paulina", "mónica", "monica", "ximena", "valentina", "catalina",
  "marisol", "luciana", "carolina", "gabriela", "victoria", "elvira",
  "sabina", "helena", "laura", "soledad", "conchita", "paloma",
  "isabela", "lupe", "female", "mujer"
];
const LATIN_AMERICAN_LOCALES = [
  "es-mx", "es-us", "es-419", "es-ar", "es-cl", "es-co", "es-pe",
  "es-ve", "es-uy", "es-cr", "es-ec", "es-gt", "es-do", "es-pa"
];

// Lucía's simple A1 profile lets her answer the student's questions consistently.
const LUCIA_PROFILE = {
  name: "Me llamo Lucía.",
  age: "Tengo veintidós años.",
  origin: "Soy de México.",
  home: "Vivo en la Ciudad de México.",
  studies: "Estudio idiomas.",
  siblings: "Sí, tengo una hermana.",
  family: "Mi familia es pequeña y muy alegre.",
  freeTime: "En mi tiempo libre, escucho música y camino en el parque.",
  music: "Sí, me gusta mucho la música latina.",
  food: "Normalmente como tacos, fruta y arroz.",
  drink: "Normalmente bebo agua y café.",
  city: "Mi ciudad es grande, animada y muy interesante.",
  morning: "Por la mañana desayuno y voy a la universidad.",
  weekend: "Los fines de semana veo a mis amigos y descanso.",
  place: "Me gusta el parque cerca de mi casa. Es verde y tranquilo."
};

// Interface elements
const welcomeScreen = document.querySelector("#welcomeScreen");
const gameScreen = document.querySelector("#gameScreen");
const completeScreen = document.querySelector("#completeScreen");
const startButton = document.querySelector("#startButton");
const repeatButton = document.querySelector("#repeatButton");
const skipButton = document.querySelector("#skipButton");
const pauseButton = document.querySelector("#pauseButton");
const stopButton = document.querySelector("#stopButton");
const downloadButton = document.querySelector("#downloadButton");
const permissionError = document.querySelector("#permissionError");
const cameraPreview = document.querySelector("#cameraPreview");
const recordedVideo = document.querySelector("#recordedVideo");
const questionText = document.querySelector("#questionText");
const translationText = document.querySelector("#translationText");
const questionNumber = document.querySelector("#questionNumber");
const timer = document.querySelector("#timer");
const answerTimer = document.querySelector("#answerTimer");
const progressBar = document.querySelector("#progressBar");
const progressTrack = document.querySelector(".progress-track");
const encouragement = document.querySelector("#encouragement");
const listeningStatus = document.querySelector("#listeningStatus");
const heardText = document.querySelector("#heardText");
const recordingState = document.querySelector("#recordingState");
const completeTitle = document.querySelector("#completeTitle");
const completeMessage = document.querySelector("#completeMessage");
const recordedDuration = document.querySelector("#recordedDuration");

let mediaStream = null;
let mediaRecorder = null;
let speechRecognition = null;
let audioContext = null;
let microphoneAnalyser = null;
let microphoneSamples = null;
let voiceActivityFrameId = 0;
let recordedChunks = [];
let recordingUrl = "";
let challengeSegmentStart = 0;
let challengeElapsedBeforePause = 0;
let questionSegmentStart = 0;
let questionElapsedBeforePause = 0;
let currentQuestionIndex = 0;
let questionsShown = 0;
let animationFrameId = 0;
let questionTimeoutId = 0;
let speechSilenceTimeoutId = 0;
let encouragementTimeoutId = 0;
let challengeFinished = false;
let challengePaused = false;
let answerHandled = false;
let selectedFemaleVoice = null;
let completeTranscript = "";
let latestTranscript = "";
let recognitionIsActive = false;
let recognitionRestartTimerId = 0;
let studentSpeechStarted = false;
let speechStartedAt = 0;
let silenceStartedAt = 0;
let farewellInProgress = false;

function showScreen(screen) {
  [welcomeScreen, gameScreen, completeScreen].forEach((item) => {
    item.classList.toggle("active", item === screen);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getSupportedMimeType() {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function startChallenge() {
  permissionError.hidden = true;
  startButton.disabled = true;
  startButton.textContent = "Requesting access…";

  if (window.location.protocol === "file:") {
    showPermissionError(
      "For a live spoken dialogue, open this activity through http://localhost rather than directly as a file. Speech recognition cannot reliably transcribe replies from a file:// page."
    );
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showPermissionError(
      "This browser does not support camera recording. Please use a recent version of Chrome, Edge, Firefox or Safari."
    );
    return;
  }

  try {
    selectedFemaleVoice = await loadFemaleLatinAmericanVoice();
    if (!selectedFemaleVoice) {
      showPermissionError(
        "A female Latin American Spanish voice is not installed in this browser. Please enable or install a voice such as Paulina, Mónica or Luciana, then try again."
      );
      return;
    }

    // The browser shows its own camera/microphone permission request here.
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true }
    });

    cameraPreview.srcObject = mediaStream;
    await cameraPreview.play();
    prepareVoiceActivityDetection();
    beginRecording();
  } catch (error) {
    console.error("Camera or microphone access failed:", error);
    showPermissionError(
      "Camera and microphone access is needed for this activity. Check your browser permissions, then try again."
    );
  }
}

function showPermissionError(message) {
  permissionError.textContent = message;
  permissionError.hidden = false;
  startButton.disabled = false;
  startButton.innerHTML = 'Try again <span aria-hidden="true">→</span>';
}

function beginRecording() {
  recordedChunks = [];
  const mimeType = getSupportedMimeType();
  const options = mimeType ? { mimeType } : undefined;

  mediaRecorder = new MediaRecorder(mediaStream, options);
  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  });
  mediaRecorder.addEventListener("stop", preparePlayback);
  mediaRecorder.start(1000);

  challengeFinished = false;
  challengePaused = false;
  farewellInProgress = false;
  challengeElapsedBeforePause = 0;
  questionElapsedBeforePause = 0;
  challengeSegmentStart = performance.now();
  currentQuestionIndex = 0;
  questionsShown = 0;
  pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
  recordingState.textContent = "REC";
  showScreen(gameScreen);
  playIntroduction();
  animationFrameId = requestAnimationFrame(updateTimers);
}

function playIntroduction() {
  clearTimeout(questionTimeoutId);
  stopListening();
  answerHandled = true;
  questionNumber.textContent = "Introducción";
  questionText.textContent = "¡Hola! Soy Lucía.";
  translationText.textContent =
    "Listen, answer in Spanish, and ask “¿Y tú?” if you want Lucía to answer too.";
  answerTimer.textContent = "Ready";
  heardText.textContent = "";
  setListeningStatus("Lucía explica la actividad…", false);

  speakText(SPOKEN_INTRODUCTION, () => {
    if (!challengeFinished && !challengePaused) {
      showQuestion(0, false);
    }
  });
}

function showQuestion(index, showPraise = true) {
  clearTimeout(questionTimeoutId);
  clearTimeout(speechSilenceTimeoutId);
  stopListening();
  window.speechSynthesis?.cancel();

  currentQuestionIndex = ((index % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  questionsShown += 1;
  questionElapsedBeforePause = 0;
  questionSegmentStart = performance.now();
  answerHandled = false;
  completeTranscript = "";
  latestTranscript = "";

  const question = QUESTIONS[currentQuestionIndex];
  questionText.textContent = question.es;
  translationText.textContent = question.en;
  questionNumber.textContent = `Pregunta ${questionsShown}`;
  answerTimer.textContent = "11s";
  heardText.textContent = "";
  setListeningStatus("Lucía está hablando…", false);

  if (showPraise) showEncouragement();
  speakText(question.es, () => {
    if (!challengeFinished && !challengePaused && !answerHandled) startListening();
  });

  scheduleAnswerTimeout(QUESTION_DURATION_MS);
}

function findFemaleLatinAmericanVoice() {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((voice) => {
      const language = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      return (
        LATIN_AMERICAN_LOCALES.some((locale) => language.startsWith(locale)) &&
        FEMALE_VOICE_NAMES.some((femaleName) => name.includes(femaleName))
      );
    }) ||
    voices.find((voice) => {
      const language = voice.lang.toLowerCase();
      const name = voice.name.toLowerCase();
      return (
        language.startsWith("es") &&
        FEMALE_VOICE_NAMES.some((femaleName) => name.includes(femaleName))
      );
    }) ||
    null
  );
}

function loadFemaleLatinAmericanVoice() {
  if (!("speechSynthesis" in window)) return Promise.resolve(null);

  const availableVoice = findFemaleLatinAmericanVoice();
  if (availableVoice) return Promise.resolve(availableVoice);

  // Chrome often loads its voice list asynchronously.
  return new Promise((resolve) => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(findFemaleLatinAmericanVoice());
    };
    const handleVoicesChanged = () => finish();
    speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    window.setTimeout(finish, 1800);
  });
}

function speakText(text, onEnd = () => {}) {
  if (!("speechSynthesis" in window) || !selectedFemaleVoice) {
    onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  utterance.rate = 0.9;
  utterance.pitch = 1.04;

  // Every spoken line uses the same verified female voice.
  utterance.voice = selectedFemaleVoice;

  let callbackUsed = false;
  const finishSpeaking = () => {
    if (callbackUsed) return;
    callbackUsed = true;
    onEnd();
  };
  utterance.addEventListener("end", finishSpeaking);
  utterance.addEventListener("error", finishSpeaking);
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function createSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = "es-MX";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("result", (event) => {
    let interimTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const words = event.results[index][0]?.transcript?.trim() || "";
      if (event.results[index].isFinal) {
        completeTranscript = `${completeTranscript} ${words}`.trim();
      } else {
        interimTranscript = `${interimTranscript} ${words}`.trim();
      }
    }

    latestTranscript = `${completeTranscript} ${interimTranscript}`.trim();
    if (!latestTranscript) return;

    // Keep imperfect automatic transcription hidden from the student.
    heardText.textContent = "";
    setListeningStatus("Escuchando…", true);

    // Silence after speech—not the full answer allowance—ends the turn.
    clearTimeout(speechSilenceTimeoutId);
    speechSilenceTimeoutId = window.setTimeout(() => {
      handleAnswer(latestTranscript);
    }, END_OF_SPEECH_DELAY_MS);
  });
  recognition.addEventListener("start", () => {
    recognitionIsActive = true;
  });
  recognition.addEventListener("end", () => {
    recognitionIsActive = false;
    if (shouldContinueListening()) {
      // Chrome can end recognition after a short silence before speech begins.
      recognitionRestartTimerId = window.setTimeout(startSpeechRecognition, 180);
    }
  });
  recognition.addEventListener("error", (event) => {
    // Transcription is optional. Voice-level detection continues locally.
    console.debug("Optional speech recognition stopped:", event.error);
  });

  return recognition;
}

function startListening() {
  if (challengeFinished || challengePaused || answerHandled) return;

  studentSpeechStarted = false;
  speechStartedAt = 0;
  silenceStartedAt = 0;
  setListeningStatus("Escuchando… Habla en español.", true);
  startVoiceActivityDetection();
  startSpeechRecognition();
}

function startSpeechRecognition() {
  if (challengeFinished || challengePaused || answerHandled || recognitionIsActive) return;

  if (!speechRecognition) speechRecognition = createSpeechRecognition();
  if (!speechRecognition) return;

  try {
    speechRecognition.start();
  } catch (error) {
    // Some browsers throw if recognition is already starting.
    console.debug("Speech recognition is already active.", error);
  }
}

function prepareVoiceActivityDetection() {
  if (!mediaStream || audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();
  const source = audioContext.createMediaStreamSource(mediaStream);
  microphoneAnalyser = audioContext.createAnalyser();
  microphoneAnalyser.fftSize = 1024;
  microphoneAnalyser.smoothingTimeConstant = 0.2;
  microphoneSamples = new Uint8Array(microphoneAnalyser.fftSize);
  source.connect(microphoneAnalyser);
}

function startVoiceActivityDetection() {
  cancelAnimationFrame(voiceActivityFrameId);
  if (!microphoneAnalyser || !microphoneSamples) return;

  const detectVoice = (now) => {
    if (!shouldContinueListening()) return;

    microphoneAnalyser.getByteTimeDomainData(microphoneSamples);
    let sumSquares = 0;
    for (const sample of microphoneSamples) {
      const normalised = (sample - 128) / 128;
      sumSquares += normalised * normalised;
    }
    const volume = Math.sqrt(sumSquares / microphoneSamples.length);
    const speaking = volume > 0.025;

    if (speaking) {
      silenceStartedAt = 0;
      if (!speechStartedAt) speechStartedAt = now;
      if (!studentSpeechStarted && now - speechStartedAt > 120) {
        studentSpeechStarted = true;
        setListeningStatus("Te escucho…", true);
      }
    } else {
      speechStartedAt = 0;
      if (studentSpeechStarted) {
        if (!silenceStartedAt) silenceStartedAt = now;
        if (now - silenceStartedAt >= END_OF_SPEECH_DELAY_MS) {
          handleAnswer(latestTranscript || "__voice_detected__");
          return;
        }
      }
    }

    voiceActivityFrameId = requestAnimationFrame(detectVoice);
  };

  voiceActivityFrameId = requestAnimationFrame(detectVoice);
}

function shouldContinueListening() {
  return (
    !challengeFinished &&
    !challengePaused &&
    !answerHandled &&
    getQuestionElapsed() < QUESTION_DURATION_MS
  );
}

function stopListening() {
  cancelAnimationFrame(voiceActivityFrameId);
  clearTimeout(speechSilenceTimeoutId);
  clearTimeout(recognitionRestartTimerId);
  if (!speechRecognition) return;
  try {
    if (recognitionIsActive) speechRecognition.stop();
  } catch (error) {
    console.debug("Speech recognition was not active.", error);
  }
}

function setListeningStatus(message, isListening) {
  listeningStatus.lastChild.textContent = ` ${message}`;
  listeningStatus.classList.toggle("listening", isListening);
  listeningStatus.classList.toggle("paused", challengePaused);
}

function handleAnswer(transcript) {
  if (answerHandled || challengeFinished || challengePaused) return;
  answerHandled = true;
  clearTimeout(questionTimeoutId);
  clearTimeout(speechSilenceTimeoutId);
  questionElapsedBeforePause = getQuestionElapsed();
  stopListening();

  heardText.textContent = "";
  answerTimer.textContent = "Done";
  const reply = transcript
    ? createDialogueReply(transcript, currentQuestionIndex)
    : "";
  if (!reply) {
    answerHandled = false;
    setListeningStatus("Escuchando… Habla cuando estés listo.", true);
    startListening();
    return;
  }
  const shouldSayGoodbye = getChallengeRemaining() <= FAREWELL_WINDOW_MS;
  const spokenReply = shouldSayGoodbye ? `${reply} ${SPOKEN_FAREWELL}` : reply;
  setListeningStatus(
    shouldSayGoodbye
      ? `Lucía responde y se despide: ${spokenReply}`
      : `Lucía responde: ${reply}`,
    false
  );
  showEncouragement();

  if (shouldSayGoodbye) farewellInProgress = true;
  speakText(spokenReply, () => {
    if (challengeFinished || challengePaused) return;
    if (shouldSayGoodbye) {
      farewellInProgress = false;
      finishChallenge();
      return;
    }
    questionTimeoutId = window.setTimeout(() => {
      if (getChallengeRemaining() <= FAREWELL_WINDOW_MS) {
        playFarewell();
      } else {
        showQuestion(currentQuestionIndex + 1, false);
      }
    }, 450);
  });
}

function playFarewell() {
  if (challengeFinished || challengePaused || farewellInProgress) return;
  farewellInProgress = true;
  clearTimeout(questionTimeoutId);
  stopListening();
  answerHandled = true;
  questionNumber.textContent = "Despedida";
  questionText.textContent = "¡Muchas gracias!";
  translationText.textContent = "Thank you for speaking with me. See you soon!";
  answerTimer.textContent = "Done";
  setListeningStatus(`Lucía se despide: ${SPOKEN_FAREWELL}`, false);

  speakText(SPOKEN_FAREWELL, () => {
    farewellInProgress = false;
    finishChallenge();
  });
}

function normalizeSpanish(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function answerStudentQuestion(text, currentPromptIndex) {
  const asksBack = containsAny(text, ["y tu", "y usted", "tu tambien"]);
  if (asksBack) {
    return [
      "Estoy muy bien, gracias.",
      LUCIA_PROFILE.name,
      LUCIA_PROFILE.age,
      LUCIA_PROFILE.origin,
      LUCIA_PROFILE.home,
      LUCIA_PROFILE.studies,
      LUCIA_PROFILE.siblings,
      LUCIA_PROFILE.family,
      LUCIA_PROFILE.freeTime,
      LUCIA_PROFILE.music,
      LUCIA_PROFILE.food,
      LUCIA_PROFILE.drink,
      LUCIA_PROFILE.city,
      LUCIA_PROFILE.morning,
      LUCIA_PROFILE.weekend,
      LUCIA_PROFILE.place
    ][currentPromptIndex];
  }

  // Also answer supported questions even when the student asks them out of order.
  if (containsAny(text, ["como estas", "que tal"])) return "Estoy muy bien, gracias. ¿Y tú?";
  if (containsAny(text, ["como te llamas", "cual es tu nombre"])) return `${LUCIA_PROFILE.name} ¿Y tú?`;
  if (containsAny(text, ["cuantos anos tienes", "que edad tienes"])) return LUCIA_PROFILE.age;
  if (containsAny(text, ["de donde eres", "de que pais eres"])) return LUCIA_PROFILE.origin;
  if (containsAny(text, ["donde vives", "donde esta tu casa"])) return LUCIA_PROFILE.home;
  if (containsAny(text, ["que estudias", "estudias"])) return LUCIA_PROFILE.studies;
  if (containsAny(text, ["tienes hermanos", "tienes hermanas"])) return LUCIA_PROFILE.siblings;
  if (containsAny(text, ["como es tu familia"])) return LUCIA_PROFILE.family;
  if (containsAny(text, ["tiempo libre", "que te gusta hacer"])) return LUCIA_PROFILE.freeTime;
  if (containsAny(text, ["te gusta la musica", "que musica"])) return LUCIA_PROFILE.music;
  if (containsAny(text, ["que comes", "comida favorita"])) return LUCIA_PROFILE.food;
  if (containsAny(text, ["que bebes", "bebida favorita"])) return LUCIA_PROFILE.drink;
  if (containsAny(text, ["como es tu ciudad"])) return LUCIA_PROFILE.city;
  if (containsAny(text, ["que haces por la manana"])) return LUCIA_PROFILE.morning;
  if (containsAny(text, ["que haces los fines", "fin de semana"])) return LUCIA_PROFILE.weekend;
  if (containsAny(text, ["lugar te gusta", "lugar favorito"])) return LUCIA_PROFILE.place;
  return "";
}

function createDialogueReply(transcript, promptIndex) {
  const text = normalizeSpanish(transcript);
  const directAnswer = answerStudentQuestion(text, promptIndex);

  // Use broad meaning only. Never repeat names, numbers, places or phrases
  // from an imperfect browser transcription.
  const reactions = [
    containsAny(text, ["muy bien", "bien", "feliz", "contento", "contenta"])
      ? "¡Me alegro! Yo también estoy muy bien."
      : containsAny(text, ["mal", "cansado", "cansada", "triste"])
        ? "Lo siento. Espero que te sientas mejor pronto."
        : "Gracias por responder. Yo estoy muy bien.",
    `¡Mucho gusto! ${LUCIA_PROFILE.name}`,
    `¡Qué bien! ${LUCIA_PROFILE.age}`,
    `¡Qué interesante! ${LUCIA_PROFILE.origin}`,
    `¡Qué bien! ${LUCIA_PROFILE.home}`,
    `¡Qué interesante! ${LUCIA_PROFILE.studies}`,
    containsAny(text, ["no tengo", "hijo unico", "hija unica"])
      ? "Entiendo. Yo tengo una hermana."
      : containsAny(text, ["hermano", "hermana"])
        ? "¡Qué bien! Yo tengo una hermana."
        : `Gracias por responder. ${LUCIA_PROFILE.siblings}`,
    containsAny(text, ["grande"])
      ? "¡Qué bien! Mi familia es pequeña y muy alegre."
      : containsAny(text, ["pequena", "pequeno"])
        ? "¡Qué bien! Mi familia también es pequeña."
        : `¡Qué bonita descripción! ${LUCIA_PROFILE.family}`,
    `¡Suena divertido! ${LUCIA_PROFILE.freeTime}`,
    containsAny(text, ["no me gusta"])
      ? "Entiendo. A mí me gusta la música latina."
      : containsAny(text, ["me gusta", "si"])
        ? "¡Qué bien! A mí me gusta la música latina."
        : LUCIA_PROFILE.music,
    `¡Qué rico! ${LUCIA_PROFILE.food}`,
    `Muy bien. ${LUCIA_PROFILE.drink}`,
    containsAny(text, ["grande", "pequena", "pequeno", "bonita", "bonito", "tranquila", "tranquilo", "animada"])
      ? "¡Qué interesante! Mi ciudad es grande y animada."
      : `¡Parece interesante! ${LUCIA_PROFILE.city}`,
    `¡Muy buena rutina! ${LUCIA_PROFILE.morning}`,
    `¡Qué buen plan! ${LUCIA_PROFILE.weekend}`,
    containsAny(text, ["parque", "museo", "restaurante", "cafeteria", "playa", "centro"])
      ? `¡Qué buen lugar! ${LUCIA_PROFILE.place}`
      : `¡Me gustaría visitar ese lugar! ${LUCIA_PROFILE.place}`
  ];

  if (directAnswer) {
    const asksOnlyQuestion = text.split(" ").length <= 4;
    return asksOnlyQuestion ? directAnswer : reactions[promptIndex];
  }
  return reactions[promptIndex];
}

function scheduleAnswerTimeout(delay) {
  clearTimeout(questionTimeoutId);
  questionTimeoutId = window.setTimeout(() => {
    if (latestTranscript || studentSpeechStarted) {
      handleAnswer(latestTranscript || "__voice_detected__");
      return;
    }

    // Do not invent an irrelevant answer when no transcript exists.
    // Repeat the same prompt and listen again while the three-minute clock continues.
    answerHandled = false;
    questionElapsedBeforePause = 0;
    questionSegmentStart = performance.now();
    setListeningStatus("Lucía repite la pregunta para escuchar tu respuesta…", false);
    speakText(QUESTIONS[currentQuestionIndex].es, startListening);
    scheduleAnswerTimeout(QUESTION_DURATION_MS);
  }, Math.max(0, delay));
}

function showEncouragement() {
  clearTimeout(encouragementTimeoutId);
  const phrase = ENCOURAGEMENTS[(questionsShown - 2) % ENCOURAGEMENTS.length];
  encouragement.textContent = phrase;
  encouragement.classList.add("show");
  encouragementTimeoutId = window.setTimeout(() => {
    encouragement.classList.remove("show");
  }, 1800);
}

function updateTimers(now) {
  if (challengeFinished || challengePaused) return;

  const elapsed = getChallengeElapsed(now);
  const remaining = Math.max(0, CHALLENGE_DURATION_MS - elapsed);
  const questionElapsed = getQuestionElapsed(now);
  const questionRemaining = Math.max(0, QUESTION_DURATION_MS - questionElapsed);

  timer.textContent = formatTime(remaining);
  if (!answerHandled) {
    answerTimer.textContent = `${Math.ceil(questionRemaining / 1000)}s`;
  }

  const progress = Math.min(100, (elapsed / CHALLENGE_DURATION_MS) * 100);
  progressBar.style.width = `${progress}%`;
  progressTrack.setAttribute("aria-valuenow", String(Math.floor(elapsed / 1000)));

  if (remaining <= 0) {
    timer.textContent = "00:00";
    if (farewellInProgress) return;
    if (studentSpeechStarted && !answerHandled) {
      handleAnswer(latestTranscript || "__voice_detected__");
    } else {
      playFarewell();
    }
    return;
  }

  animationFrameId = requestAnimationFrame(updateTimers);
}

function getChallengeElapsed(now = performance.now()) {
  return challengeElapsedBeforePause + (challengePaused ? 0 : now - challengeSegmentStart);
}

function getChallengeRemaining(now = performance.now()) {
  return Math.max(0, CHALLENGE_DURATION_MS - getChallengeElapsed(now));
}

function getQuestionElapsed(now = performance.now()) {
  return questionElapsedBeforePause + (challengePaused ? 0 : now - questionSegmentStart);
}

function formatTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function finishChallenge(stoppedEarly = false) {
  if (challengeFinished) return;
  const elapsed = Math.min(CHALLENGE_DURATION_MS, getChallengeElapsed());
  challengeFinished = true;
  clearTimeout(questionTimeoutId);
  clearTimeout(speechSilenceTimeoutId);
  clearTimeout(recognitionRestartTimerId);
  clearTimeout(encouragementTimeoutId);
  cancelAnimationFrame(animationFrameId);
  stopListening();
  window.speechSynthesis?.cancel();

  if (!stoppedEarly) {
    timer.textContent = "00:00";
    progressBar.style.width = "100%";
  progressTrack.setAttribute("aria-valuenow", "180");
    completeTitle.textContent = "¡Enhorabuena!";
    completeMessage.textContent = "You have completed the speaking challenge.";
  } else {
    completeTitle.textContent = "Sesión terminada";
    completeMessage.textContent = "Your recording has stopped and is ready to preview.";
  }
  recordedDuration.textContent = formatTimeFloor(elapsed);

  if (mediaRecorder?.state === "paused") mediaRecorder.resume();
  if (mediaRecorder?.state !== "inactive") {
    mediaRecorder.stop();
  } else {
    preparePlayback();
  }

  mediaStream?.getTracks().forEach((track) => track.stop());
  audioContext?.close();
  audioContext = null;
  microphoneAnalyser = null;
  microphoneSamples = null;
  cameraPreview.srcObject = null;
  showScreen(completeScreen);
}

function togglePause() {
  if (challengeFinished) return;

  if (!challengePaused) {
    const now = performance.now();
    challengeElapsedBeforePause += now - challengeSegmentStart;
    questionElapsedBeforePause += now - questionSegmentStart;
    challengePaused = true;

    clearTimeout(questionTimeoutId);
    clearTimeout(speechSilenceTimeoutId);
    clearTimeout(recognitionRestartTimerId);
    cancelAnimationFrame(animationFrameId);
    stopListening();
    window.speechSynthesis?.cancel();
    if (mediaRecorder?.state === "recording") mediaRecorder.pause();

    pauseButton.innerHTML = '<span aria-hidden="true">▶</span> Resume';
    recordingState.textContent = "PAUSED";
    setListeningStatus("Actividad en pausa.", false);
    answerTimer.textContent = `${Math.ceil(
      Math.max(0, QUESTION_DURATION_MS - questionElapsedBeforePause) / 1000
    )}s`;
    return;
  }

  challengePaused = false;
  challengeSegmentStart = performance.now();
  questionSegmentStart = performance.now();
  if (mediaRecorder?.state === "paused") mediaRecorder.resume();
  pauseButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
  recordingState.textContent = "REC";

  const questionRemaining = Math.max(0, QUESTION_DURATION_MS - questionElapsedBeforePause);
  if (questionRemaining <= 0) {
    handleAnswer("");
  } else {
    setListeningStatus("Lucía repite la pregunta…", false);
    speakText(QUESTIONS[currentQuestionIndex].es, startListening);
    scheduleAnswerTimeout(questionRemaining);
  }
  animationFrameId = requestAnimationFrame(updateTimers);
}

function preparePlayback() {
  if (!recordedChunks.length) return;

  const mimeType = mediaRecorder?.mimeType || "video/webm";
  const blob = new Blob(recordedChunks, { type: mimeType });

  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  recordingUrl = URL.createObjectURL(blob);
  recordedVideo.src = recordingUrl;

  downloadButton.onclick = () => {
    const link = document.createElement("a");
    link.href = recordingUrl;
    link.download = `LPS1001_Speaking_Challenge_${getDateStamp()}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
}

function formatTimeFloor(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

startButton.addEventListener("click", startChallenge);
repeatButton.addEventListener("click", () => {
  if (challengePaused || challengeFinished) return;
  stopListening();
  answerHandled = false;
  completeTranscript = "";
  latestTranscript = "";
  questionElapsedBeforePause = 0;
  questionSegmentStart = performance.now();
  clearTimeout(questionTimeoutId);
  heardText.textContent = "";
  setListeningStatus("Lucía repite la pregunta…", false);
  speakText(QUESTIONS[currentQuestionIndex].es, startListening);
  scheduleAnswerTimeout(QUESTION_DURATION_MS);
});
skipButton.addEventListener("click", () => {
  if (challengePaused || challengeFinished) return;
  showQuestion(currentQuestionIndex + 1);
});
pauseButton.addEventListener("click", togglePause);
stopButton.addEventListener("click", () => finishChallenge(true));

// Stop the camera if the page is closed during the challenge.
window.addEventListener("beforeunload", () => {
  mediaStream?.getTracks().forEach((track) => track.stop());
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
});
