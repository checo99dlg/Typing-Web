const wordDisplay = document.getElementById("wordDisplay");
const textInput = document.getElementById("textInput");
const timeDisplay = document.getElementById("timeDisplay");
const wpmDisplay = document.getElementById("wpmDisplay");
const accuracyDisplay = document.getElementById("accuracyDisplay");
const errorDisplay = document.getElementById("errorDisplay");
const durationInput = document.getElementById("durationInput");
const infiniteToggle = document.getElementById("infiniteToggle");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const caret = document.getElementById("caret");
const capitalizeToggle = document.getElementById("capitalizeToggle");
const languageToggle = document.getElementById("languageToggle");
const accentToggle = document.getElementById("accentToggle");
const punctuationToggle = document.getElementById("punctuationToggle");
const numbersToggle = document.getElementById("numbersToggle");
const hardModeToggle = document.getElementById("hardModeToggle");
const resultsScreen = document.getElementById("resultsScreen");
const resultWpm = document.getElementById("resultWpm");
const resultRawWpm = document.getElementById("resultRawWpm");
const resultAccuracy = document.getElementById("resultAccuracy");
const resultChars = document.getElementById("resultChars");
const resultDuration = document.getElementById("resultDuration");
const themeMenuToggle = document.getElementById("themeMenuToggle");
const themeMenu = document.getElementById("themeMenu");
const themeLabel = document.getElementById("themeLabel");
const isAuthenticated = document.body.dataset.authenticated === "true";

function focusTypingInput() {
  if (!textInput || textInput.disabled) {
    return;
  }
  textInput.focus({ preventScroll: true });
}

let words = [];
let currentIndex = 0;
let correctKeystrokes = 0;
let incorrectKeystrokes = 0;
let correctChars = 0;
let incorrectChars = 0;
let extraChars = 0;
let missedChars = 0;
let errors = 0;
let isRunning = false;
let startTime = null;
let timerId = null;
let timeLeft = 60;
let infiniteMode = false;
let wordResults = [];
let typedWords = [];
const wordsPerView = 36;
const capitalizeStorageKey = "typing-capitalize";
let capitalizeEnabled = localStorage.getItem(capitalizeStorageKey) === "true";
const languageStorageKey = "typing-language";
let currentLanguage = localStorage.getItem(languageStorageKey) || "en";
const accentStorageKey = "typing-accents";
let accentsEnabled = localStorage.getItem(accentStorageKey) !== "false";
const punctuationStorageKey = "typing-punctuation";
let punctuationEnabled = localStorage.getItem(punctuationStorageKey) === "true";
const numbersStorageKey = "typing-numbers";
let numbersEnabled = localStorage.getItem(numbersStorageKey) === "true";
const hardModeStorageKey = "typing-hard-mode";
let hardModeEnabled = localStorage.getItem(hardModeStorageKey) === "true";
const colorThemeStorageKey = "typing-color-theme";
const supportedLanguages = ["en", "es", "fr", "de", "pt"];
const accentLanguages = new Set(["es", "fr", "de", "pt"]);
if (!supportedLanguages.includes(currentLanguage)) {
  currentLanguage = "en";
}

const colorThemes = [
  {
    id: "default",
    name: "Default",
    colors: {
      bg: "#0b1220",
      surface: "rgba(15, 23, 42, 0.9)",
      surfaceBorder: "#1f2937",
      text: "#f8fafc",
      muted: "#94a3b8",
      word: "#e2e8f0",
      pillBg: "rgba(15, 23, 42, 0.8)",
      pillBorder: "#334155",
      pillText: "#cbd5f5",
      caret: "#fbbf24",
      correct: "#076652",
      incorrect: "#f87171",
      menuBg: "rgba(15, 23, 42, 0.96)",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      bg: "#071629",
      surface: "rgba(9, 30, 56, 0.9)",
      surfaceBorder: "#1b3655",
      text: "#e6f0ff",
      muted: "#8aa4c6",
      word: "#d8e6ff",
      pillBg: "rgba(8, 26, 46, 0.85)",
      pillBorder: "#2b4a74",
      pillText: "#cfe0ff",
      caret: "#22d3ee",
      correct: "#60a5fa",
      incorrect: "#fb7185",
      menuBg: "rgba(9, 30, 56, 0.96)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    colors: {
      bg: "#0a1612",
      surface: "rgba(11, 27, 20, 0.9)",
      surfaceBorder: "#1b3a2c",
      text: "#e7f7ef",
      muted: "#8fb9a6",
      word: "#d7efe4",
      pillBg: "rgba(11, 27, 20, 0.85)",
      pillBorder: "#2b5a45",
      pillText: "#c9f0dc",
      caret: "#86efac",
      correct: "#34d399",
      incorrect: "#f97316",
      menuBg: "rgba(11, 27, 20, 0.96)",
    },
  },
  {
    id: "amber",
    name: "Amber",
    colors: {
      bg: "#1b1404",
      surface: "rgba(36, 26, 6, 0.9)",
      surfaceBorder: "#5c3d09",
      text: "#fff7e6",
      muted: "#c9a467",
      word: "#ffedc2",
      pillBg: "rgba(36, 26, 6, 0.85)",
      pillBorder: "#7a5414",
      pillText: "#ffdf9e",
      caret: "#fbbf24",
      correct: "#facc15",
      incorrect: "#ef4444",
      menuBg: "rgba(36, 26, 6, 0.96)",
    },
  },
  {
    id: "sakura",
    name: "Sakura",
    colors: {
      bg: "#1a1017",
      surface: "rgba(30, 18, 27, 0.92)",
      surfaceBorder: "#4a2a3b",
      text: "#fbe9f1",
      muted: "#c9a1b3",
      word: "#f8d8e6",
      pillBg: "rgba(30, 18, 27, 0.85)",
      pillBorder: "#6a3d55",
      pillText: "#f5c6da",
      caret: "#fb7185",
      correct: "#f9a8d4",
      incorrect: "#fb7185",
      menuBg: "rgba(30, 18, 27, 0.96)",
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    colors: {
      bg: "#14101f",
      surface: "rgba(23, 18, 37, 0.9)",
      surfaceBorder: "#3a2f56",
      text: "#efe9ff",
      muted: "#b3a6d1",
      word: "#e1d8ff",
      pillBg: "rgba(23, 18, 37, 0.85)",
      pillBorder: "#58417e",
      pillText: "#d6c8ff",
      caret: "#c4b5fd",
      correct: "#a78bfa",
      incorrect: "#f87171",
      menuBg: "rgba(23, 18, 37, 0.96)",
    },
  },
  {
    id: "arctic",
    name: "Arctic",
    colors: {
      bg: "#081a1f",
      surface: "rgba(10, 29, 35, 0.9)",
      surfaceBorder: "#1b4b59",
      text: "#e6fbff",
      muted: "#93c5d1",
      word: "#d2f6ff",
      pillBg: "rgba(10, 29, 35, 0.85)",
      pillBorder: "#2a6071",
      pillText: "#c7f2ff",
      caret: "#7dd3fc",
      correct: "#38bdf8",
      incorrect: "#f97316",
      menuBg: "rgba(10, 29, 35, 0.96)",
    },
  },
  {
    id: "ember",
    name: "Ember",
    colors: {
      bg: "#1b0c0c",
      surface: "rgba(32, 12, 12, 0.92)",
      surfaceBorder: "#4b1c1c",
      text: "#ffe9e9",
      muted: "#c78f8f",
      word: "#ffd7d7",
      pillBg: "rgba(32, 12, 12, 0.85)",
      pillBorder: "#6b2c2c",
      pillText: "#ffc2c2",
      caret: "#fb7185",
      correct: "#fca5a5",
      incorrect: "#fb7185",
      menuBg: "rgba(32, 12, 12, 0.96)",
    },
  },
  {
    id: "slate",
    name: "Slate",
    colors: {
      bg: "#0f131a",
      surface: "rgba(18, 23, 31, 0.9)",
      surfaceBorder: "#2a3644",
      text: "#edf2f7",
      muted: "#9aa8bd",
      word: "#e2e8f0",
      pillBg: "rgba(18, 23, 31, 0.85)",
      pillBorder: "#3b4a5f",
      pillText: "#d6e1f2",
      caret: "#cbd5e1",
      correct: "#93c5fd",
      incorrect: "#f87171",
      menuBg: "rgba(18, 23, 31, 0.96)",
    },
  },
  {
    id: "mint",
    name: "Mint",
    colors: {
      bg: "#0a1515",
      surface: "rgba(10, 24, 24, 0.9)",
      surfaceBorder: "#1e3d3d",
      text: "#e6fff9",
      muted: "#89bfb5",
      word: "#d4fff3",
      pillBg: "rgba(10, 24, 24, 0.85)",
      pillBorder: "#2c5a5a",
      pillText: "#c6fff0",
      caret: "#5eead4",
      correct: "#2dd4bf",
      incorrect: "#fb7185",
      menuBg: "rgba(10, 24, 24, 0.96)",
    },
  },
  {
    id: "honey",
    name: "Honey",
    colors: {
      bg: "#1a1203",
      surface: "rgba(36, 24, 4, 0.9)",
      surfaceBorder: "#6b4c12",
      text: "#fff7cc",
      muted: "#d6b874",
      word: "#ffe9a3",
      pillBg: "rgba(36, 24, 4, 0.85)",
      pillBorder: "#8a6218",
      pillText: "#ffdf8a",
      caret: "#fbbf24",
      correct: "#fde047",
      incorrect: "#f97316",
      menuBg: "rgba(36, 24, 4, 0.96)",
    },
  },
];

function applyColorTheme(themeId) {
  const theme = colorThemes.find((item) => item.id === themeId) || colorThemes[0];
  const root = document.documentElement;
  const colors = theme.colors;
  root.style.setProperty("--app-bg", colors.bg);
  root.style.setProperty("--app-surface", colors.surface);
  root.style.setProperty("--app-surface-border", colors.surfaceBorder);
  root.style.setProperty("--app-text", colors.text);
  root.style.setProperty("--app-muted", colors.muted);
  root.style.setProperty("--app-word", colors.word);
  root.style.setProperty("--app-pill-bg", colors.pillBg);
  root.style.setProperty("--app-pill-border", colors.pillBorder);
  root.style.setProperty("--app-pill-text", colors.pillText);
  root.style.setProperty("--app-caret", colors.caret);
  root.style.setProperty("--app-correct", colors.correct);
  root.style.setProperty("--app-incorrect", colors.incorrect);
  root.style.setProperty("--app-menu-bg", colors.menuBg);
  localStorage.setItem("typing-color-theme-values", JSON.stringify(colors));
  if (themeLabel) {
    themeLabel.textContent = theme.name;
  }
}

function renderThemeMenu() {
  if (!themeMenu) {
    return;
  }
  themeMenu.innerHTML = "";
  colorThemes.forEach((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "theme-item flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition";
    button.textContent = theme.name;
    button.addEventListener("click", () => {
      localStorage.setItem(colorThemeStorageKey, theme.id);
      applyColorTheme(theme.id);
      themeMenu.classList.add("hidden");
    });
    themeMenu.appendChild(button);
  });
}

function applyCapitalizeToggle() {
  if (!capitalizeToggle) {
    return;
  }
  capitalizeToggle.setAttribute("aria-pressed", String(capitalizeEnabled));
  capitalizeToggle.classList.toggle("bg-emerald-500/20", capitalizeEnabled);
  capitalizeToggle.classList.toggle("text-emerald-200", capitalizeEnabled);
  capitalizeToggle.classList.toggle("border-emerald-400/60", capitalizeEnabled);
  capitalizeToggle.classList.toggle("shadow-[0_0_14px_rgba(16,185,129,0.35)]", capitalizeEnabled);
  capitalizeToggle.classList.toggle("opacity-50", !capitalizeEnabled);
}

function maybeCapitalize(word) {
  if (!capitalizeEnabled || word.length === 0) {
    return word;
  }
  if (Math.random() < 0.3) {
    return `${word[0].toUpperCase()}${word.slice(1)}`;
  }
  return word;
}

function stripAccents(word) {
  return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function maybePunctuate(word) {
  if (!punctuationEnabled || word.length === 0) {
    return word;
  }
  if (Math.random() > 0.25) {
    return word;
  }
  const wrappers = [
    (w) => `(${w})`,
    (w) => `"${w}"`,
  ];
  const suffixes = [",", ".", ";", ":", "!", "?", "..."];
  const specials = [
    (w) => `${w}'s`,
    (w) => `${w}-${w}`,
    (w) => `${w}—${w}`,
  ];
  const roll = Math.random();
  if (roll < 0.2) {
    const wrap = wrappers[Math.floor(Math.random() * wrappers.length)];
    return wrap(word);
  }
  if (roll < 0.6) {
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${word}${suffix}`;
  }
  const special = specials[Math.floor(Math.random() * specials.length)];
  return special(word);
}

function maybeNumber(word) {
  if (!numbersEnabled) {
    return word;
  }
  if (Math.random() > 0.2) {
    return word;
  }
  const length = Math.floor(Math.random() * 4) + 1;
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += Math.floor(Math.random() * 10).toString();
  }
  return value;
}

function applyAccentToggle() {
  if (!accentToggle) {
    return;
  }
  const isEnabled = accentsEnabled;
  accentToggle.setAttribute("aria-pressed", String(accentsEnabled));
  accentToggle.classList.toggle("bg-emerald-500/20", isEnabled);
  accentToggle.classList.toggle("text-emerald-200", isEnabled);
  accentToggle.classList.toggle("border-emerald-400/60", isEnabled);
  accentToggle.classList.toggle(
    "shadow-[0_0_14px_rgba(16,185,129,0.35)]",
    isEnabled,
  );
  accentToggle.classList.toggle("opacity-50", !accentsEnabled);
  accentToggle.disabled = false;
}

function applyPunctuationToggle() {
  if (!punctuationToggle) {
    return;
  }
  punctuationToggle.setAttribute("aria-pressed", String(punctuationEnabled));
  punctuationToggle.classList.toggle("bg-emerald-500/20", punctuationEnabled);
  punctuationToggle.classList.toggle("text-emerald-200", punctuationEnabled);
  punctuationToggle.classList.toggle("border-emerald-400/60", punctuationEnabled);
  punctuationToggle.classList.toggle(
    "shadow-[0_0_14px_rgba(16,185,129,0.35)]",
    punctuationEnabled,
  );
  punctuationToggle.classList.toggle("opacity-50", !punctuationEnabled);
}

function applyNumbersToggle() {
  if (!numbersToggle) {
    return;
  }
  numbersToggle.setAttribute("aria-pressed", String(numbersEnabled));
  numbersToggle.classList.toggle("bg-emerald-500/20", numbersEnabled);
  numbersToggle.classList.toggle("text-emerald-200", numbersEnabled);
  numbersToggle.classList.toggle("border-emerald-400/60", numbersEnabled);
  numbersToggle.classList.toggle("shadow-[0_0_14px_rgba(16,185,129,0.35)]", numbersEnabled);
  numbersToggle.classList.toggle("opacity-50", !numbersEnabled);
}

function applyHardModeToggle() {
  if (!hardModeToggle) {
    return;
  }
  hardModeToggle.setAttribute("aria-pressed", String(hardModeEnabled));
  hardModeToggle.classList.toggle("bg-emerald-500/20", hardModeEnabled);
  hardModeToggle.classList.toggle("text-emerald-200", hardModeEnabled);
  hardModeToggle.classList.toggle("border-emerald-400/60", hardModeEnabled);
  hardModeToggle.classList.toggle("shadow-[0_0_14px_rgba(16,185,129,0.35)]", hardModeEnabled);
  hardModeToggle.classList.toggle("opacity-50", !hardModeEnabled);
}

function applyLanguageToggle() {
  if (!languageToggle) {
    return;
  }
  if (languageToggle.tagName === "SELECT") {
    languageToggle.value = currentLanguage;
    return;
  }
  const labels = { en: "EN", es: "ES", fr: "FR", de: "DE", pt: "PT" };
  const label = labels[currentLanguage] || "EN";
  const labelSpan = languageToggle.querySelector("span");
  if (labelSpan) {
    labelSpan.textContent = label;
  }
}

async function setLanguage(nextLanguage) {
  if (!supportedLanguages.includes(nextLanguage)) {
    return;
  }
  if (nextLanguage === currentLanguage) {
    return;
  }
  currentLanguage = nextLanguage;
  localStorage.setItem(languageStorageKey, currentLanguage);
  applyLanguageToggle();
  applyAccentToggle();
  await fetchWords({ replace: true });
  resetStats();
  textInput.focus();
}

function resetStats() {
  currentIndex = 0;
  correctKeystrokes = 0;
  incorrectKeystrokes = 0;
  correctChars = 0;
  incorrectChars = 0;
  extraChars = 0;
  missedChars = 0;
  errors = 0;
  wordResults = [];
  typedWords = [];
  startTime = null;
  timeLeft = getDuration();
  updateStats();
  renderWords();
  updateCaretPosition("");
  textInput.value = "";
  textInput.disabled = false;
  isRunning = false;
}

function getDuration() {
  const parsed = parseInt(durationInput.value, 10);
  if (Number.isNaN(parsed) || parsed < 5) {
    return 60;
  }
  return parsed;
}

function updateStats() {
  const totalChars = correctKeystrokes + incorrectKeystrokes;
  const accuracy = totalChars === 0 ? 100 : Math.round((correctKeystrokes / totalChars) * 100);
  const elapsedMinutes = startTime ? Math.max((Date.now() - startTime) / 60000, 1 / 60) : 0;
  const wpm = totalChars === 0 ? 0 : Math.round((correctKeystrokes / 5) / elapsedMinutes);

  accuracyDisplay.textContent = `${accuracy}%`;
  errorDisplay.textContent = `${errors}`;
  wpmDisplay.textContent = `${wpm}`;
}

function getCurrentWpm() {
  const elapsedMinutes = startTime ? Math.max((Date.now() - startTime) / 60000, 1 / 60) : 0;
  return correctKeystrokes === 0 ? 0 : Math.round((correctKeystrokes / 5) / elapsedMinutes);
}

function showResultsScreen() {
  if (!resultsScreen) {
    return;
  }
  const totalChars = correctKeystrokes + incorrectKeystrokes;
  const accuracy = totalChars === 0 ? 100 : Math.round((correctKeystrokes / totalChars) * 100);
  const wpm = getCurrentWpm();
  const elapsedMinutes = startTime ? Math.max((Date.now() - startTime) / 60000, 1 / 60) : 0;
  const rawWpm = totalChars === 0 ? 0 : Math.round((totalChars / 5) / elapsedMinutes);
  const durationSeconds = startTime ? Math.max(1, Math.round((Date.now() - startTime) / 1000)) : 0;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (resultWpm) resultWpm.textContent = String(wpm);
  if (resultRawWpm) resultRawWpm.textContent = String(rawWpm);
  if (resultAccuracy) resultAccuracy.textContent = `${accuracy}%`;
  if (resultChars) resultChars.textContent = String(totalChars);
  if (resultDuration) resultDuration.textContent = `${durationSeconds}s`;
  resultsScreen.classList.remove("hidden");
  resultsScreen.classList.add("flex");
  textInput.disabled = true;
  recordResult({
    wpm,
    rawWpm,
    accuracy,
    duration: durationSeconds,
    chars: totalChars,
    correctChars,
    incorrectChars,
    extraChars,
    missedChars,
    language: currentLanguage,
    capsEnabled: capitalizeEnabled,
    accentsEnabled: accentsEnabled,
    punctuationEnabled: punctuationEnabled,
    hardModeEnabled: hardModeEnabled,
    timezone,
  });
}

function hideResultsScreen() {
  if (!resultsScreen) {
    return;
  }
  resultsScreen.classList.add("hidden");
  resultsScreen.classList.remove("flex");
  textInput.disabled = false;
}

function updateTimeDisplay() {
  if (infiniteMode) {
    timeDisplay.textContent = "∞";
  } else {
    timeDisplay.textContent = `${timeLeft}`;
  }
}

function scoreWord(typed, target) {
  let correct = 0;
  let incorrect = 0;
  let extra = 0;
  let missed = 0;
  const minLength = Math.min(typed.length, target.length);
  for (let i = 0; i < minLength; i += 1) {
    if (typed[i] === target[i]) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  }
  if (typed.length > target.length) {
    extra = typed.length - target.length;
  } else if (typed.length < target.length) {
    missed = target.length - typed.length;
  }
  return { correct, incorrect, extra, missed };
}

function getExpectedCharAt(position) {
  const target = words[currentIndex] || "";
  if (position < target.length) {
    return target[position];
  }
  if (position === target.length) {
    return " ";
  }
  return null;
}

const correctTypedLetterClasses = ["typed-correct"];
const incorrectTypedLetterClasses = ["typed-incorrect"];

function resetLetterClasses(letterSpan) {
  letterSpan.classList.remove(...correctTypedLetterClasses, ...incorrectTypedLetterClasses);
}

function applyTypingToWord({ wordSpan, typed, target }) {
  const letterSpans = wordSpan.querySelectorAll("[data-letter]");
  const overflowSpan = wordSpan.querySelector("[data-overflow]");
  let hasMistake = false;

  letterSpans.forEach((letterSpan, index) => {
    resetLetterClasses(letterSpan);
    if (index < typed.length) {
      if (typed[index] === target[index]) {
        letterSpan.classList.add(...correctTypedLetterClasses);
      } else {
        letterSpan.classList.add(...incorrectTypedLetterClasses);
        hasMistake = true;
      }
    }
  });

  if (overflowSpan) {
    resetLetterClasses(overflowSpan);
    const overflow = typed.length > target.length ? typed.slice(target.length) : "";
    overflowSpan.textContent = overflow;
    if (overflow.length > 0) {
      overflowSpan.classList.add(...incorrectTypedLetterClasses);
      hasMistake = true;
    }
  }

  return hasMistake;
}

function renderWords() {
  wordDisplay.innerHTML = "";
  const startIndex = currentIndex;
  const endIndex = Math.min(startIndex + wordsPerView, words.length);
  words.slice(startIndex, endIndex).forEach((word, offset) => {
    const index = startIndex + offset;
    const wordSpan = document.createElement("span");
    wordSpan.dataset.index = String(index);
    wordSpan.classList.add("inline-flex", "items-center");
    if (index === currentIndex) {
      wordSpan.classList.add(
        "rounded",
        "px-1",
        "py-px",
        "outline",
        "outline-1",
        "outline-slate-400/70",
        "dark:outline-slate-500/70",
      );
    }
    if (wordResults[index] === false) {
      wordSpan.classList.add("text-rose-500", "dark:text-rose-400");
    }
    [...word].forEach((letter) => {
      const letterSpan = document.createElement("span");
      letterSpan.textContent = letter;
      letterSpan.dataset.letter = "true";
      wordSpan.appendChild(letterSpan);
    });
    const overflowSpan = document.createElement("span");
    overflowSpan.dataset.overflow = "true";
    wordSpan.appendChild(overflowSpan);
    wordDisplay.appendChild(wordSpan);

    if (index < currentIndex) {
      const typed = typedWords[index] || "";
      applyTypingToWord({ wordSpan, typed, target: word });
    }
  });
  updateCurrentWordHighlight(textInput.value);
}

function nextWord(typed) {
  const target = words[currentIndex] || "";
  const { correct, incorrect, extra, missed } = scoreWord(typed, target);
  correctChars += correct;
  incorrectChars += incorrect;
  extraChars += extra;
  missedChars += missed;
  const isCorrect = typed === target;
  if (!isCorrect) {
    errors += 1;
  }
  wordResults[currentIndex] = isCorrect;
  typedWords[currentIndex] = typed;
  currentIndex += 1;
  if (currentIndex >= words.length - 5) {
    fetchWords();
  }
  renderWords();
  updateStats();
}

function updateCurrentWordHighlight(value) {
  const wordSpan = wordDisplay.querySelector(`[data-index="${currentIndex}"]`);
  if (!wordSpan) {
    if (caret) {
      caret.classList.add("opacity-0");
    }
    return;
  }
  const typed = value.trimEnd();
  const target = words[currentIndex] || "";
  const hasMistake = applyTypingToWord({ wordSpan, typed, target });
  wordSpan.classList.toggle("outline-rose-300/70", hasMistake);
  wordSpan.classList.toggle("dark:outline-rose-400/60", hasMistake);
  wordSpan.classList.toggle("outline-slate-400/70", !hasMistake);
  wordSpan.classList.toggle("dark:outline-slate-500/70", !hasMistake);
  updateCaretPosition(value);
}

function updateCaretPosition(value) {
  if (!caret) {
    return;
  }
  const wordSpan = wordDisplay.querySelector(`[data-index="${currentIndex}"]`);
  if (!wordSpan) {
    caret.classList.add("opacity-0");
    return;
  }
  const typed = value.trimEnd();
  const target = words[currentIndex] || "";
  const letterSpans = wordSpan.querySelectorAll("[data-letter]");
  const overflowSpan = wordSpan.querySelector("[data-overflow]");
  const wordRect = wordSpan.getBoundingClientRect();
  const containerRect = wordDisplay.getBoundingClientRect();
  const sectionRect = wordDisplay.closest("section")?.getBoundingClientRect() || containerRect;
  let anchorRect = wordRect;
  let caretX = wordRect.left;
  if (typed.length === 0) {
    const firstLetter = letterSpans[0];
    anchorRect = firstLetter ? firstLetter.getBoundingClientRect() : wordRect;
    caretX = anchorRect.left - 4;
  } else if (typed.length < target.length && letterSpans[typed.length]) {
    anchorRect = letterSpans[typed.length].getBoundingClientRect();
    caretX = anchorRect.left - 4;
  } else if (typed.length > target.length && overflowSpan) {
    anchorRect = overflowSpan.getBoundingClientRect();
    caretX = anchorRect.right + 2;
  } else {
    const lastIndex = Math.min(typed.length, letterSpans.length);
    const anchor = letterSpans[Math.max(0, lastIndex - 1)];
    if (anchor) {
      anchorRect = anchor.getBoundingClientRect();
      caretX = anchorRect.right + 2;
    }
  }
  const centerY = anchorRect.top - sectionRect.top + anchorRect.height / 2;
  caret.style.left = `${caretX - sectionRect.left}px`;
  caret.style.top = `${centerY}px`;
  const caretLine = caret.firstElementChild;
  if (caretLine) {
    const fontSize = parseFloat(getComputedStyle(wordDisplay).fontSize || "24");
    caretLine.style.height = `${fontSize}px`;
  }
  caret.classList.remove("opacity-0");
}

function handleInput() {
  const value = textInput.value;
  if (!isRunning && value.length > 0) {
    startTest();
  }
  if (hardModeEnabled) {
    const typed = value.trimEnd();
    const target = words[currentIndex] || "";
    const max = Math.min(typed.length, target.length);
    let hasMistake = typed.length > target.length;
    for (let i = 0; i < max; i += 1) {
      if (typed[i] !== target[i]) {
        hasMistake = true;
        break;
      }
    }
    if (hasMistake) {
      fetchWords({ replace: true }).then(() => {
        hideResultsScreen();
        resetStats();
        textInput.focus();
      });
      return;
    }
  }
  if (value.endsWith(" ")) {
    const typed = value.trim();
    textInput.value = "";
    nextWord(typed);
    updateCaretPosition("");
    updateStats();
    return;
  }
  updateCurrentWordHighlight(value);
  updateStats();
}

function tick() {
  if (!isRunning || infiniteMode) {
    updateStats();
    return;
  }
  timeLeft -= 1;
  updateTimeDisplay();
  updateStats();
  if (timeLeft <= 0) {
    stopTest(true);
  }
}

function startTimer() {
  clearInterval(timerId);
  updateTimeDisplay();
  timerId = setInterval(tick, 1000);
}

function startTest() {
  if (words.length === 0) {
    return;
  }
  if (isRunning) {
    return;
  }
  hideResultsScreen();
  infiniteMode = infiniteToggle.checked;
  timeLeft = getDuration();
  updateTimeDisplay();
  startTime = Date.now();
  isRunning = true;
  textInput.disabled = false;
  textInput.focus();
  updateCaretPosition(textInput.value);
  startTimer();
}

function stopTest(showResults = false) {
  isRunning = false;
  textInput.disabled = false;
  clearInterval(timerId);
  updateStats();
  if (showResults) {
    showResultsScreen();
  }
}

async function fetchWords({ replace = false } = {}) {
  let data = null;
  try {
    const response = await fetch(`/api/words?count=200&lang=${encodeURIComponent(currentLanguage)}`);
    if (!response.ok) {
      throw new Error(`Words request failed: ${response.status}`);
    }
    data = await response.json();
  } catch (error) {
    console.error(error);
    return;
  }
  const incoming = (data.words || [])
    .map((word) =>
      accentLanguages.has(currentLanguage) && !accentsEnabled ? stripAccents(word) : word,
    )
    .map((word) => maybeCapitalize(word))
    .map((word) => maybeNumber(word))
    .map((word) => maybePunctuate(word));
  if (replace || words.length === 0) {
    words = incoming;
  } else {
    words = words.concat(incoming);
  }
  if (replace) {
    currentIndex = 0;
    if (textInput) {
      textInput.value = "";
    }
  }
  if (currentIndex >= words.length) {
    currentIndex = 0;
  }
  renderWords();
}

startBtn.addEventListener("click", () => {
  focusTypingInput();
});
resetBtn.addEventListener("click", async () => {
  await fetchWords({ replace: true });
  resetStats();
  updateCaretPosition("");
});
textInput.addEventListener("input", handleInput);
textInput.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (!words.length) {
    return;
  }
  if (resultsScreen && !resultsScreen.classList.contains("hidden")) {
    return;
  }
  if (event.key === "Backspace" || event.key === "Delete") {
    incorrectKeystrokes += 1;
    updateStats();
    return;
  }
  let key = event.key;
  if (key === "Spacebar" || key === "Space") {
    key = " ";
  }
  if (key.length !== 1) {
    return;
  }
  const value = textInput.value;
  const caretPos = textInput.selectionStart ?? value.length;
  const expected = getExpectedCharAt(caretPos);
  if (key === expected) {
    correctKeystrokes += 1;
  } else {
    incorrectKeystrokes += 1;
  }
  updateStats();
});

if (capitalizeToggle) {
  applyCapitalizeToggle();
  capitalizeToggle.addEventListener("click", async () => {
    capitalizeEnabled = !capitalizeEnabled;
    localStorage.setItem(capitalizeStorageKey, String(capitalizeEnabled));
    applyCapitalizeToggle();
    await fetchWords({ replace: true });
    resetStats();
    textInput.focus();
  });
}

if (languageToggle) {
  applyLanguageToggle();
  if (languageToggle.tagName === "SELECT") {
    const handleLanguageInput = (event) => {
      const nextLanguage = event.target?.value || languageToggle.value;
      setLanguage(nextLanguage);
    };
    languageToggle.addEventListener("change", handleLanguageInput);
    languageToggle.addEventListener("input", handleLanguageInput);
  } else {
    languageToggle.addEventListener("click", async () => {
      const currentLangIndex = supportedLanguages.indexOf(currentLanguage);
      const nextIndex =
        currentLangIndex === -1 ? 0 : (currentLangIndex + 1) % supportedLanguages.length;
      await setLanguage(supportedLanguages[nextIndex]);
    });
  }
}

if (accentToggle) {
  applyAccentToggle();
  accentToggle.addEventListener("click", async () => {
    accentsEnabled = !accentsEnabled;
    localStorage.setItem(accentStorageKey, String(accentsEnabled));
    applyAccentToggle();
    await fetchWords({ replace: true });
    resetStats();
    textInput.focus();
  });
}

if (punctuationToggle) {
  applyPunctuationToggle();
  punctuationToggle.addEventListener("click", async () => {
    punctuationEnabled = !punctuationEnabled;
    localStorage.setItem(punctuationStorageKey, String(punctuationEnabled));
    applyPunctuationToggle();
    await fetchWords({ replace: true });
    resetStats();
    textInput.focus();
  });
}

if (numbersToggle) {
  applyNumbersToggle();
  numbersToggle.addEventListener("click", async () => {
    numbersEnabled = !numbersEnabled;
    localStorage.setItem(numbersStorageKey, String(numbersEnabled));
    applyNumbersToggle();
    await fetchWords({ replace: true });
    resetStats();
    textInput.focus();
  });
}

if (hardModeToggle) {
  applyHardModeToggle();
  hardModeToggle.addEventListener("click", () => {
    hardModeEnabled = !hardModeEnabled;
    localStorage.setItem(hardModeStorageKey, String(hardModeEnabled));
    applyHardModeToggle();
  });
}

infiniteToggle.addEventListener("change", () => {
  durationInput.disabled = infiniteToggle.checked;
  if (!isRunning) {
    updateTimeDisplay();
  }
});

durationInput.addEventListener("change", () => {
  if (!isRunning && !infiniteToggle.checked) {
    timeLeft = getDuration();
    updateTimeDisplay();
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.key === "Enter" && event.shiftKey) {
    event.preventDefault();
    if (textInput) {
      textInput.value = "";
    }
    typedWords = [];
    wordResults = [];
    currentIndex = 0;
    await fetchWords({ replace: true });
    hideResultsScreen();
    resetStats();
    focusTypingInput();
  }
}, { capture: true });

if (themeMenuToggle) {
  renderThemeMenu();
  const storedTheme = localStorage.getItem(colorThemeStorageKey) || "default";
  applyColorTheme(storedTheme);
  themeMenuToggle.addEventListener("click", () => {
    themeMenu?.classList.toggle("hidden");
  });
  document.addEventListener("click", (event) => {
    if (!themeMenu || themeMenu.classList.contains("hidden")) {
      return;
    }
    if (event.target.closest("#themeMenu") || event.target.closest("#themeMenuToggle")) {
      return;
    }
    themeMenu.classList.add("hidden");
  });
}

fetchWords({ replace: true }).then(() => {
  resetStats();
  focusTypingInput();
});

setUserTimezone();

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button,select,a,input,textarea,label")) {
    return;
  }
  focusTypingInput();
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.key.length !== 1) {
    return;
  }
  const active = document.activeElement;
  if (
    active === textInput ||
    active?.tagName === "INPUT" ||
    active?.tagName === "TEXTAREA" ||
    active?.tagName === "SELECT"
  ) {
    return;
  }
  focusTypingInput();
});

async function recordResult(payload) {
  if (!isAuthenticated) {
    return;
  }
  try {
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Ignore save errors; results are still visible locally.
  }
}

async function setUserTimezone() {
  if (!isAuthenticated) {
    return;
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!tz) {
    return;
  }
  try {
    await fetch("/api/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    });
  } catch (error) {
    // Ignore timezone save errors.
  }
}
