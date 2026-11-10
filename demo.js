import { SpicyLyrics, parseTtml } from "./src/index.js";

const samples = [
  {
    title: "A Little More Time",
    lines: [
      { startMs: 0, words: [
        { text: "The", startMs: 0, endMs: 180 }, { text: "city", startMs: 180, endMs: 650 },
        { text: "wakes", startMs: 650, endMs: 1050 }, { text: "up", startMs: 1050, endMs: 1320 },
        { text: "slowly", startMs: 1320, endMs: 2100 }
      ]},
      { startMs: 2600, words: [
        { text: "There's", startMs: 2600, endMs: 2950 }, { text: "a", startMs: 2950, endMs: 3070 },
        { text: "little", startMs: 3070, endMs: 3650 }, { text: "more", startMs: 3650, endMs: 4050 },
        { text: "time", startMs: 4050, endMs: 4900 }
      ]},
      { startMs: 5500, words: [
        { text: "Between", startMs: 5500, endMs: 6250 }, { text: "the", startMs: 6250, endMs: 6440 },
        { text: "noise", startMs: 6440, endMs: 7100 }, { text: "and", startMs: 7100, endMs: 7400 },
        { text: "the", startMs: 7400, endMs: 7560 }, { text: "light", startMs: 7560, endMs: 8500 }
      ]},
      { startMs: 9200, words: [
        { text: "So", startMs: 9200, endMs: 9500 }, { text: "let", startMs: 9500, endMs: 9800 },
        { text: "the", startMs: 9800, endMs: 10000 }, { text: "whole", startMs: 10000, endMs: 10600 },
        { text: "world", startMs: 10600, endMs: 11200 }, { text: "wait", startMs: 11200, endMs: 12400 }
      ]},
      { startMs: 13200, words: [
        { text: "We're", startMs: 13200, endMs: 13600 }, { text: "not", startMs: 13600, endMs: 13900 },
        { text: "finished", startMs: 13900, endMs: 15000 }, { text: "yet.", startMs: 15000, endMs: 16200 }
      ]}
    ]
  },
  {
    title: "Neon Weather",
    lines: [
      { startMs: 0, words: [
        { text: "Pink", startMs: 0, endMs: 450 }, { text: "clouds", startMs: 450, endMs: 1050 },
        { text: "over", startMs: 1050, endMs: 1450 }, { text: "the", startMs: 1450, endMs: 1620 },
        { text: "avenue", startMs: 1620, endMs: 2550 }
      ]},
      { startMs: 3100, words: [
        { text: "Electric", startMs: 3100, endMs: 4050 }, { text: "blue", startMs: 4050, endMs: 4750 },
        { text: "in", startMs: 4750, endMs: 5000 }, { text: "the", startMs: 5000, endMs: 5200 },
        { text: "rain", startMs: 5200, endMs: 6250 }
      ]},
      { startMs: 7000, words: [
        { text: "We", startMs: 7000, endMs: 7300 }, { text: "make", startMs: 7300, endMs: 7750 },
        { text: "our", startMs: 7750, endMs: 8000 }, { text: "own", startMs: 8000, endMs: 8500 },
        { text: "weather", startMs: 8500, endMs: 9900 }
      ]},
      { startMs: 10800, words: [
        { text: "And", startMs: 10800, endMs: 11100 }, { text: "we", startMs: 11100, endMs: 11400 },
        { text: "glow", startMs: 11400, endMs: 12300 }, { text: "all", startMs: 12300, endMs: 12600 },
        { text: "night", startMs: 12600, endMs: 14200 }
      ]}
    ]
  }
];

const $ = selector => document.querySelector(selector);
const lyricElement = $("#lyrics");
const titleElement = $("#track-title");
const stageHint = $("#stage-hint");
const playButton = $("#play");
const restartButton = $("#restart");
const seek = $("#seek");
const currentTime = $("#current-time");
const durationLabel = $("#duration");
const speedSelect = $("#speed");
const sampleSelect = $("#sample");
const lettersToggle = $("#letters");
const ttmlInput = $("#ttml-file");
const audioInput = $("#audio-file");
const audio = $("#audio");
const status = $("#import-status");

let sampleIndex = 0;
let activeLines = samples[0].lines;
let activeDuration = 0;
let positionMs = 0;
let playing = false;
let speed = 1;
let lastFrame = 0;
let frameId = 0;
let renderer;
let usingImportedLyrics = false;
let audioUrl = null;

function formatTime(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function getDuration(lines) {
  return Math.max(0, ...lines.flatMap(line => line.words.map(word => word.endMs)));
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function renderAtPosition() {
  renderer.setPosition(positionMs);
  seek.value = String(positionMs);
  currentTime.textContent = formatTime(positionMs);
}

function setPlaying(nextPlaying) {
  playing = nextPlaying;
  playButton.textContent = playing ? "Ⅱ" : "▶";
  playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
  stageHint.textContent = audio.src
    ? (playing ? "Playing your audio file · lyrics synced to audio" : "Audio loaded · press play")
    : (playing ? "Simulated playback · scrub to jump around" : "Paused · scrub or press play");

  if (audio.src) {
    if (playing) {
      audio.playbackRate = speed;
      audio.play().catch(error => {
        setPlaying(false);
        showStatus(`Could not play this audio file: ${error.message}`, true);
      });
    } else {
      audio.pause();
    }
  }

  if (playing) {
    lastFrame = performance.now();
    frameId = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(frameId);
  }
}

function tick(now) {
  if (!playing) return;
  if (audio.src) {
    positionMs = audio.currentTime * 1000;
  } else {
    const delta = Math.min(now - lastFrame, 100);
    positionMs += delta * speed;
  }
  lastFrame = now;

  if (positionMs >= activeDuration) {
    positionMs = activeDuration;
    renderAtPosition();
    setPlaying(false);
    stageHint.textContent = "That's the end. Run it back?";
    return;
  }
  renderAtPosition();
  frameId = requestAnimationFrame(tick);
}

function setLines(lines, title) {
  setPlaying(false);
  activeLines = lines;
  activeDuration = getDuration(lines);
  positionMs = 0;
  usingImportedLyrics = true;
  renderer?.destroy();
  renderer = new SpicyLyrics(lyricElement, {
    animation: true,
    letterEffects: lettersToggle.checked
  });
  renderer.load(activeLines);
  titleElement.textContent = title;
  seek.max = String(Math.max(activeDuration, 1));
  durationLabel.textContent = formatTime(activeDuration);
  stageHint.textContent = "Press play to begin";
  renderAtPosition();
  sampleSelect.value = "";
}

function loadSample(index) {
  setPlaying(false);
  sampleIndex = index;
  const sample = samples[sampleIndex];
  activeLines = sample.lines;
  activeDuration = getDuration(activeLines);
  positionMs = 0;
  usingImportedLyrics = false;
  renderer?.destroy();
  renderer = new SpicyLyrics(lyricElement, {
    animation: true,
    letterEffects: lettersToggle.checked
  });
  renderer.load(activeLines);
  titleElement.textContent = sample.title;
  seek.max = String(activeDuration);
  durationLabel.textContent = formatTime(activeDuration);
  stageHint.textContent = "Press play to begin";
  renderAtPosition();
}

playButton.addEventListener("click", () => {
  if (playing) return setPlaying(false);
  if (positionMs >= activeDuration) {
    positionMs = 0;
    if (audio.src) audio.currentTime = 0;
  }
  renderAtPosition();
  setPlaying(true);
});

restartButton.addEventListener("click", () => {
  positionMs = 0;
  if (audio.src) audio.currentTime = 0;
  renderAtPosition();
  stageHint.textContent = "Back to the beginning";
});

seek.addEventListener("input", () => {
  positionMs = Number(seek.value);
  if (audio.src) audio.currentTime = positionMs / 1000;
  renderAtPosition();
  if (playing) lastFrame = performance.now();
});

speedSelect.addEventListener("change", () => {
  speed = Number(speedSelect.value);
  if (audio.src) audio.playbackRate = speed;
});

sampleSelect.addEventListener("change", () => {
  if (sampleSelect.value !== "") {
    audio.pause();
    loadSample(Number(sampleSelect.value));
  }
});

lettersToggle.addEventListener("change", () => {
  const wasPlaying = playing;
  setPlaying(false);
  const lines = activeLines;
  const title = titleElement.textContent;
  const oldPosition = positionMs;
  renderer?.destroy();
  renderer = new SpicyLyrics(lyricElement, {
    animation: true,
    letterEffects: lettersToggle.checked
  });
  renderer.load(lines);
  positionMs = oldPosition;
  renderAtPosition();
  if (wasPlaying) setPlaying(true);
});

ttmlInput.addEventListener("change", async () => {
  const file = ttmlInput.files?.[0];
  if (!file) return;
  try {
    const lines = parseTtml(await file.text());
    audio.pause();
    setLines(lines, file.name.replace(/\.(ttml|xml|dfxp)$/i, ""));
    showStatus(`Loaded ${file.name} · ${lines.length} lyric lines · ${lines.reduce((n, line) => n + line.words.length, 0)} timed segments.`);
    $("#ttml-name").textContent = file.name;
  } catch (error) {
    showStatus(error.message, true);
  }
});

audioInput.addEventListener("change", () => {
  const file = audioInput.files?.[0];
  if (!file) return;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = URL.createObjectURL(file);
  audio.src = audioUrl;
  audio.load();
  $("#audio-name").textContent = file.name;
  showStatus(`Loaded audio: ${file.name}. Press play to sync it with the lyrics.`);
});

audio.addEventListener("loadedmetadata", () => {
  if (!usingImportedLyrics) {
    showStatus("Audio ready. Import a TTML file to test your own timed lyrics with it.");
  } else if (audio.duration * 1000 < activeDuration) {
    showStatus("Audio is shorter than the TTML timing range. Playback will stop at the audio end.", true);
  }
});

audio.addEventListener("ended", () => {
  positionMs = Math.min(activeDuration, audio.currentTime * 1000);
  renderAtPosition();
  setPlaying(false);
});

audio.addEventListener("error", () => {
  if (audio.src) showStatus("This browser could not decode that audio format.", true);
});

loadSample(0);
