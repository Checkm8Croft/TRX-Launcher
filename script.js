const { ipcRenderer } = require("electron");

// ==========================
// AUDIO TRACKS + CROSSFADE
// ==========================
const audioMap = {
  tr1: "tracks/TR1.mp3",
  tr2: "tracks/TR2.mp3",
  tr3: "tracks/TR3.mp3"
};

let audioCurrent = new Audio();
let audioNext = new Audio();
audioCurrent.loop = true;
audioNext.loop = true;

let isMuted = false;
let activeScreen = null;
const fadeDuration = 1000;
let fadeInterval = null; // riferimento globale all’interval
// FUNZIONE CROSSFADE

function changeAudio(screenId) {
  if (activeScreen === screenId) return;
  activeScreen = screenId;

  const newSrc = audioMap[screenId];
  audioNext.src = newSrc;
  audioNext.volume = 0;
  audioNext.muted = isMuted;

  if (document.visibilityState === "visible") {
    audioNext.play().catch(() => console.log("Autoplay Requested"));
  }

  // cancella fade precedente se presente
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
    audioCurrent.volume = 1;
    audioNext.volume = 0;
    audioCurrent.pause(); // opzionale, ma evita audio fantasma
  }

  const step = 50;
  const steps = fadeDuration / step;
  let currentStep = 0;

  fadeInterval = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;
    audioCurrent.volume = 1 - progress;
    audioNext.volume = progress;
    if (currentStep >= steps) {
      clearInterval(fadeInterval);
      fadeInterval = null;
      audioCurrent.pause();
      [audioCurrent, audioNext] = [audioNext, audioCurrent];
    }
  }, step);
}

// ==========================
// TOGGLE MUTE
// ==========================
const muteButton = document.getElementById("muteToggle");
muteButton.addEventListener("click", () => {
  isMuted = !isMuted;
  audioCurrent.muted = isMuted;
  audioNext.muted = isMuted;
  muteButton.textContent = isMuted ? "🔇" : "🔊";
});

// ==========================
// OBSERVER SCHERMATE
// ==========================
const screens = document.querySelectorAll(".screen");
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      changeAudio(entry.target.id);
    }
  });
}, { threshold: 0.6 });

screens.forEach(screen => observer.observe(screen));

// ==========================
// PAGE VISIBILITY API
// ==========================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (activeScreen) {
      audioCurrent.play().catch(() => console.log("Autoplay Requested"));
    }
  } else {
    audioCurrent.pause();
    audioNext.pause();
  }
});

// ==========================
// PAUSA AUDIO QUANDO TRX PARTE
// ==========================
ipcRenderer.on("pause-audio", () => {
  audioCurrent.pause();
  audioNext.pause();
});

// ==========================
// LANCIO REALE TRX
// ==========================
function launch(game) {
  ipcRenderer.send("launch-game", game);
}

const screensArray = Array.from(screens);

document.addEventListener("keydown", (e) => {
  const currentIndex = screensArray.findIndex(s => s.id === activeScreen);
  if (e.key === "ArrowDown" && currentIndex < screensArray.length - 1) {
    // scrolla alla prossima schermata
    screensArray[currentIndex + 1].scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (e.key === "ArrowUp" && currentIndex > 0) {
    screensArray[currentIndex - 1].scrollIntoView({ behavior: "smooth", block: "center" });
  }
});
