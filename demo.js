import { SpicyLyrics } from "./src/index.js";

const samples = [
  {
    title: "A Little More Time",
    lines: [
      { startMs: 0, words: [
        { text: "The", startMs: 0, endMs: 180 },
        { text: "city", startMs: 180, endMs: 650 },
        { text: "wakes", startMs: 650, endMs: 1050 },
        { text: "up", startMs: 1050, endMs: 1320 },
        { text: "slowly", startMs: 1320, endMs: 2100 }
      ]},
      { startMs: 2600, words: [
        { text: "There's", startMs: 2600, endMs: 2950 },
        { text: "a", startMs: 2950, endMs: 3070 },
        { text: "little", startMs: 3070, endMs: 3650 },
        { text: "more", startMs: 3650, endMs: 4050 },
        { text: "time", startMs: 4050, endMs: 4900 }
      ]},
      { startMs: 5500, words: [
        { text: "Between", startMs: 5500, endMs: 6250 },
        { text: "the", startMs: 6250, endMs: 6440 },
        { text: "noise", startMs: 6440, endMs: 7100 },
        { text: "and", startMs: 7100, endMs: 7400 },
        { text: "the", startMs: 7400, endMs: 7560 },
        { text: "light", startMs: 7560, endMs: 8500 }
      ]},
      { startMs: 9200, words: [
        { text: "So", startMs: 9200, endMs: 9500 },
        { text: "let", startMs: 9500, endMs: 9800 },
        { text: "the", startMs: 9800, endMs: 10000 },
        { text: "whole", startMs: 10000, endMs: 10600 },
        { text: "world", startMs: 10600, endMs: 11200 },
        { text: "wait", startMs: 11200, endMs: 12400 }
      ]},
      { startMs: 13200, words: [
        { text: "We're", startMs: 13200, endMs: 13600 },
        { text: "not", startMs: 13600, endMs: 13900 },
        { text: "finished", startMs: 13900, endMs: 15000 },
        { text: "yet.", startMs: 15000, endMs: 16200 }
      ]}
    ]
  },
  {
    title: "Neon Weather",
    lines: [
      { startMs: 0, words: [
        { text: "Pink", startMs: 0, endMs: 450 },
        { text: "clouds", startMs: 450, endMs: 1050 },
        { text: "over", startMs: 1050, endMs: 1450 },
        { text: "the", startMs: 1450, endMs: 1620 },
        { text: "avenue", startMs: 1620, endMs: 2550 }
      ]},
      { startMs: 3100, words: [
        { text: "Electric", startMs: 3100, endMs: 4050 },
        { text: "blue", startMs: 4050, endMs: 4750 },
        { text: "in", startMs: 4750, endMs: 5000 },
        { text: "the", startMs: 5000, endMs: 5200 },
        { text: "rain", startMs: 5200, endMs: 6250 }
      ]},
      { startMs: 7000, words: [
        { text: "We", startMs: 7000, endMs: 7300 },
        { text: "make", startMs: 7300, endMs: 7750 },
        { text: "our", startMs: 7750, endMs: 8000 },
        { text: "own", startMs: 8000, endMs: 8500 },
        { text: "weather", startMs: 8500, endMs: 9900 }
      ]},
      { startMs: 10800, words: [
        { text: "And", startMs: 10800, endMs: 11100 },
        { text: "we", startMs: 11100, endMs: 11400 },
        { text: "glow", startMs: 11400, endMs: 12300 },
        { text: "all", startMs: 12300, endMs: 12600 },
        { text: "night", startMs: 12600, endMs: 14200 }
      ]}
    ]
  }
];

const lyricElement = document.querySelector("#lyrics");
const titleElement = document.querySelector("#track-title");
const stageHint = document.querySelector("#stage-hint");
const playButton = document.querySelector("#play");
const restartButton = document.querySelector("#restart");
const seek = document.querySelector("#seek");
const currentTime = document.querySelector("#current-time");
const durationLabel = document.querySelector("#duration");
const speedSelect = document.querySelector("#speed");
const sampleSelect = document.querySelector("#sample");
const lettersToggle = document.querySelector("#letters");

let sampleIndex = 0;
let positionMs = 0;
let playing = false;
let speed = 1;
let lastFrame = 0;
let frameId = 0;
let renderer;

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function getDuration(sample) {
  return Math.max(...sample.lines.flatMap(line => line.words.map(word => word.endMs)));
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
  stageHint.textContent = playing ? "Simulated playback · scrub to jump around" : "Paused · scrub or press play";
  if (playing) {
    lastFrame = performance.now();
    frameId = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(frameId);
  }
}

function tick(now) {
  if (!playing) return;
  const delta = Math.min(now - lastFrame, 100);
  lastFrame = now;
  positionMs += delta * speed;

  const duration = getDuration(samples[sampleIndex]);
  if (positionMs >= duration) {
    positionMs = duration;
    renderAtPosition();
    setPlaying(false);
    stageHint.textContent = "That's the end. Run it back?";
    return;
  }

  renderAtPosition();
  frameId = requestAnimationFrame(tick);
}

function loadSample(index) {
  setPlaying(false);
  sampleIndex = index;
  positionMs = 0;
  const sample = samples[sampleIndex];
  renderer?.destroy();
  renderer = new SpicyLyrics(lyricElement, {
    animation: true,
    letterEffects: lettersToggle.checked
  });
  renderer.load(sample.lines);
  titleElement.textContent = sample.title;
  seek.max = String(getDuration(sample));
  durationLabel.textContent = formatTime(getDuration(sample));
  stageHint.textContent = "Press play to begin";
  renderAtPosition();
}

playButton.addEventListener("click", () => {
  if (playing) {
    setPlaying(false);
    return;
  }
  if (positionMs >= getDuration(samples[sampleIndex])) positionMs = 0;
  renderAtPosition();
  setPlaying(true);
});

restartButton.addEventListener("click", () => {
  positionMs = 0;
  renderAtPosition();
  stageHint.textContent = "Back to the beginning";
});

seek.addEventListener("input", () => {
  positionMs = Number(seek.value);
  renderAtPosition();
  if (playing) lastFrame = performance.now();
});

speedSelect.addEventListener("change", () => {
  speed = Number(speedSelect.value);
});

sampleSelect.addEventListener("change", () => loadSample(Number(sampleSelect.value)));

lettersToggle.addEventListener("change", () => {
  const wasPlaying = playing;
  setPlaying(false);
  loadSample(sampleIndex);
  if (wasPlaying) setPlaying(true);
});

loadSample(0);
