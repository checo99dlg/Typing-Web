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
const resultsScreen = document.getElementById("resultsScreen");
const resultWpm = document.getElementById("resultWpm");
const resultAccuracy = document.getElementById("resultAccuracy");
const resultChars = document.getElementById("resultChars");
const resultDuration = document.getElementById("resultDuration");

let words = [];
let currentIndex = 0;
let correctKeystrokes = 0;
let incorrectKeystrokes = 0;
let errors = 0;
let isRunning = false;
let startTime = null;
let timerId = null;
let timeLeft = 60;
let infiniteMode = false;
let wordResults = [];
const wordsPerView = 36;
const themeStorageKey = "typing-theme";
const capitalizeStorageKey = "typing-capitalize";
let capitalizeEnabled = localStorage.getItem(capitalizeStorageKey) === "true";
const languageStorageKey = "typing-language";
let currentLanguage = localStorage.getItem(languageStorageKey) || "en";
const accentStorageKey = "typing-accents";
let accentsEnabled = localStorage.getItem(accentStorageKey) !== "false";

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

function applyAccentToggle() {
  if (!accentToggle) {
    return;
  }
  accentToggle.setAttribute("aria-pressed", String(accentsEnabled));
  accentToggle.classList.toggle("bg-slate-900", !accentsEnabled && currentLanguage === "es");
  accentToggle.classList.toggle("text-white", !accentsEnabled && currentLanguage === "es");
  accentToggle.classList.toggle("border-slate-900", !accentsEnabled && currentLanguage === "es");
  accentToggle.classList.toggle("dark:bg-slate-200", !accentsEnabled && currentLanguage === "es");
  accentToggle.classList.toggle("dark:text-slate-900", !accentsEnabled && currentLanguage === "es");
  accentToggle.classList.toggle("dark:border-slate-200", !accentsEnabled && currentLanguage === "es");
  accentToggle.classList.toggle("opacity-40", currentLanguage !== "es");
  accentToggle.disabled = currentLanguage !== "es";
}

function applyLanguageToggle() {
  if (!languageToggle) {
    return;
  }
  const label = currentLanguage === "es" ? "ES" : "EN";
  languageToggle.querySelector("span").textContent = label;
}

function resetStats() {
  currentIndex = 0;
  correctKeystrokes = 0;
  incorrectKeystrokes = 0;
  errors = 0;
  wordResults = [];
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
  const durationSeconds = startTime ? Math.max(1, Math.round((Date.now() - startTime) / 1000)) : 0;
  if (resultWpm) resultWpm.textContent = String(wpm);
  if (resultAccuracy) resultAccuracy.textContent = `${accuracy}%`;
  if (resultChars) resultChars.textContent = String(totalChars);
  if (resultDuration) resultDuration.textContent = `${durationSeconds}s`;
  resultsScreen.classList.remove("hidden");
  resultsScreen.classList.add("flex");
  textInput.disabled = true;
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
    if (wordResults[index] === true) {
      wordSpan.classList.add("text-slate-900", "dark:text-white");
    } else if (wordResults[index] === false) {
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
  });
  updateCaretPosition(textInput.value);
}

function nextWord(typed) {
  const target = words[currentIndex] || "";
  const isCorrect = typed === target;
  if (!isCorrect) {
    errors += 1;
  }
  wordResults[currentIndex] = isCorrect;
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
  const letterSpans = wordSpan.querySelectorAll("[data-letter]");
  let hasMistake = false;
  letterSpans.forEach((letterSpan, index) => {
    letterSpan.classList.remove(
      "text-rose-500",
      "dark:text-rose-400",
      "text-slate-600",
      "dark:text-slate-300",
    );
    if (index < typed.length) {
      if (typed[index] === target[index]) {
        letterSpan.classList.add("text-slate-600", "dark:text-slate-300");
      } else {
        hasMistake = true;
        letterSpan.classList.add("text-rose-500", "dark:text-rose-400");
      }
    }
  });
  const overflowSpan = wordSpan.querySelector("[data-overflow]");
  if (overflowSpan) {
    const overflow = typed.length > target.length ? typed.slice(target.length) : "";
    overflowSpan.textContent = overflow;
    overflowSpan.classList.toggle("text-rose-500", overflow.length > 0);
    overflowSpan.classList.toggle("dark:text-rose-400", overflow.length > 0);
    if (overflow.length > 0) {
      hasMistake = true;
    }
  }
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
  updateCurrentWordHighlight(value);
  updateStats();
  if (value.endsWith(" ")) {
    const typed = value.trim();
    nextWord(typed);
    textInput.value = "";
    updateCaretPosition("");
  }
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
  const response = await fetch(`/api/words?count=200&lang=${encodeURIComponent(currentLanguage)}`);
  const data = await response.json();
  const incoming = (data.words || [])
    .map((word) => (currentLanguage === "es" && !accentsEnabled ? stripAccents(word) : word))
    .map((word) => maybeCapitalize(word));
  if (replace || words.length === 0) {
    words = incoming;
  } else {
    words = words.concat(incoming);
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
  languageToggle.addEventListener("click", async () => {
    currentLanguage = currentLanguage === "es" ? "en" : "es";
    localStorage.setItem(languageStorageKey, currentLanguage);
    applyLanguageToggle();
    applyAccentToggle();
    await fetchWords({ replace: true });
    resetStats();
    textInput.focus();
  });
}

if (accentToggle) {
  applyAccentToggle();
  accentToggle.addEventListener("click", async () => {
    if (currentLanguage !== "es") {
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
