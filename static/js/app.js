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
const themeToggle = document.getElementById("themeToggle");
const themeIconSun = document.getElementById("themeIconSun");
const themeIconMoon = document.getElementById("themeIconMoon");
const caret = document.getElementById("caret");
const capitalizeToggle = document.getElementById("capitalizeToggle");
const languageToggle = document.getElementById("languageToggle");
const accentToggle = document.getElementById("accentToggle");
const punctuationToggle = document.getElementById("punctuationToggle");
const numbersToggle = document.getElementById("numbersToggle");
const resultsScreen = document.getElementById("resultsScreen");
const resultWpm = document.getElementById("resultWpm");
const resultRawWpm = document.getElementById("resultRawWpm");
const resultAccuracy = document.getElementById("resultAccuracy");
const resultChars = document.getElementById("resultChars");
const resultDuration = document.getElementById("resultDuration");
const isAuthenticated = document.body.dataset.authenticated === "true";

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
const themeStorageKey = "typing-theme";
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
const supportedLanguages = ["en", "es", "fr", "de", "pt"];
const accentLanguages = new Set(["es", "fr", "de", "pt"]);
if (!supportedLanguages.includes(currentLanguage)) {
  currentLanguage = "en";
}

function getPreferredTheme() {
  const storedTheme = localStorage.getItem(themeStorageKey);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  document.body.classList.toggle("dark", theme === "dark");
  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    themeToggle.classList.add("is-toggling");
    window.setTimeout(() => themeToggle.classList.remove("is-toggling"), 220);
    if (themeIconSun && themeIconMoon) {
      themeIconSun.classList.toggle("rotate-90", isDark);
      themeIconSun.classList.toggle("scale-0", isDark);
      themeIconSun.classList.toggle("opacity-0", isDark);
      themeIconMoon.classList.toggle("rotate-90", !isDark);
      themeIconMoon.classList.toggle("scale-0", !isDark);
      themeIconMoon.classList.toggle("opacity-0", !isDark);
    }
  }
}

function applyCapitalizeToggle() {
  if (!capitalizeToggle) {
    return;
  }
  capitalizeToggle.setAttribute("aria-pressed", String(capitalizeEnabled));
  capitalizeToggle.classList.toggle("bg-slate-900", capitalizeEnabled);
  capitalizeToggle.classList.toggle("text-white", capitalizeEnabled);
  capitalizeToggle.classList.toggle("border-slate-900", capitalizeEnabled);
  capitalizeToggle.classList.toggle("dark:bg-slate-200", capitalizeEnabled);
  capitalizeToggle.classList.toggle("dark:text-slate-900", capitalizeEnabled);
  capitalizeToggle.classList.toggle("dark:border-slate-200", capitalizeEnabled);
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
  const isAccentLanguage = accentLanguages.has(currentLanguage);
  accentToggle.setAttribute("aria-pressed", String(accentsEnabled));
  accentToggle.classList.toggle("bg-slate-900", !accentsEnabled && isAccentLanguage);
  accentToggle.classList.toggle("text-white", !accentsEnabled && isAccentLanguage);
  accentToggle.classList.toggle("border-slate-900", !accentsEnabled && isAccentLanguage);
  accentToggle.classList.toggle("dark:bg-slate-200", !accentsEnabled && isAccentLanguage);
  accentToggle.classList.toggle("dark:text-slate-900", !accentsEnabled && isAccentLanguage);
  accentToggle.classList.toggle("dark:border-slate-200", !accentsEnabled && isAccentLanguage);
  accentToggle.classList.toggle("opacity-40", !isAccentLanguage);
  accentToggle.disabled = !isAccentLanguage;
}

function applyPunctuationToggle() {
  if (!punctuationToggle) {
    return;
  }
  punctuationToggle.setAttribute("aria-pressed", String(punctuationEnabled));
  punctuationToggle.classList.toggle("bg-slate-900", punctuationEnabled);
  punctuationToggle.classList.toggle("text-white", punctuationEnabled);
  punctuationToggle.classList.toggle("border-slate-900", punctuationEnabled);
  punctuationToggle.classList.toggle("dark:bg-slate-200", punctuationEnabled);
  punctuationToggle.classList.toggle("dark:text-slate-900", punctuationEnabled);
  punctuationToggle.classList.toggle("dark:border-slate-200", punctuationEnabled);
}

function applyNumbersToggle() {
  if (!numbersToggle) {
    return;
  }
  numbersToggle.setAttribute("aria-pressed", String(numbersEnabled));
  numbersToggle.classList.toggle("bg-slate-900", numbersEnabled);
  numbersToggle.classList.toggle("text-white", numbersEnabled);
  numbersToggle.classList.toggle("border-slate-900", numbersEnabled);
  numbersToggle.classList.toggle("dark:bg-slate-200", numbersEnabled);
  numbersToggle.classList.toggle("dark:text-slate-900", numbersEnabled);
  numbersToggle.classList.toggle("dark:border-slate-200", numbersEnabled);
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

const correctTypedLetterClasses = ["text-[#008000]", "dark:text-[#008000]"];
const incorrectTypedLetterClasses = ["text-rose-500", "dark:text-rose-400"];

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
  const sectionRect = wordDisplay.parentElement.getBoundingClientRect();
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
  textInput.focus();
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
    if (!accentLanguages.has(currentLanguage)) {
      return;
    }
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
    await fetchWords({ replace: true });
    hideResultsScreen();
    resetStats();
    textInput.focus();
  }
});

if (themeToggle) {
  applyTheme(getPreferredTheme());
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(themeStorageKey, nextTheme);
    applyTheme(nextTheme);
  });
}

fetchWords({ replace: true }).then(() => {
  resetStats();
  textInput.focus();
});

setUserTimezone();

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
