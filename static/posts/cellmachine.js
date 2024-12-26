const width = 50;
const height = 50;
const scaleFactor = 10;
const initCount = 10;
const skipMax = 10;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
let playButton = document.getElementById("play");
let speedText = document.getElementById("speed");

var playing = true;
var mouseDown = false;
var skipCountDefault = 3;
var skipCount = skipCountDefault;
var curState = new Array(width * height);
var newState = new Array(width * height);
var rule = generateRule();

function init() {
  canvas.width = width * scaleFactor;
  canvas.height = height * scaleFactor;

  canvas.addEventListener("click", addCell);
  canvas.addEventListener("mouseup", function (event) {
    mouseDown = false;
  });
  canvas.addEventListener("mousedown", function (event) {
    mouseDown = true;
  });
  canvas.addEventListener("mousemove", function (event) {
    if (mouseDown) {
      addCell(event);
    }
  });

  setSpeedText();

  for (i = 0; i < initCount; i++) {
    const index = random(width * height);
    curState[index] = true;
  }

  window.requestAnimationFrame(clock);
}

function clock() {
  if (skipCount <= 0) {
    render();
    if (playing) {
      next();
    }
    skipCount = skipCountDefault;
  } else {
    skipCount -= 1;
  }
  window.requestAnimationFrame(clock);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (index = 0; index < width * height; index++) {
    const px = index % width;
    const py = Math.trunc(index / width);
    if (curState[index]) {
      ctx.fillRect(px * scaleFactor, py * scaleFactor, scaleFactor, scaleFactor);
    }
  }
}

function next() {
  for (index = 0; index < width * height; index++) {
    const px = index % width;
    const py = Math.trunc(index / width);
    newState[index] = rule(curState, px, py);
  }
  [curState, newState] = [newState, curState];
}

function V(f, x, y) {
  if (x < 0 || x > width || y < 0 || y > height) {
    return false;
  }
  return f[y * width + x];
}

function generateRule() {
  const count = random(10) + 2;
  let rule = [...Array(count).keys()]
    .map((v) => {
      const px = random(4) - 2;
      const py = random(4) - 2;
      return `V(f, x + ${px}, y + ${py})`;
    })
    .reduce((a, v) => {
      const op = sample(["&", "|", "^"]);
      return `${a} ${v} ${op}`;
    }, "");
  rule = rule.slice(0, rule.length - 2);
  console.info(`rule:${rule}`);
  // evil smile
  return eval(`(f, x, y) => { return ${rule}; }`);
}

function addCell(event) {
  const pos = getMousePos(canvas, event);
  pos.x = Math.trunc(pos.x / scaleFactor);
  pos.y = Math.trunc(pos.y / scaleFactor);
  curState[pos.y * width + pos.x] = true;
}

function random(max) {
  return Math.floor(Math.random() * max);
}

function sample(data) {
  return data[Math.floor(Math.random() * data.length)];
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / (rect.right - rect.left)) * canvas.width,
    y: ((evt.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height,
  };
}

function setSpeedText() {
  speedText.textContent = skipMax - skipCountDefault;
}

function speedup() {
  if (skipCountDefault > 0) {
    skipCountDefault -= 1;
    setSpeedText();
  }
}

function slowdown() {
  if (skipCountDefault < skipMax) {
    skipCountDefault += 1;
    setSpeedText();
  }
}

function regenerate() {
  rule = generateRule();
}

function reset() {
  curState = new Array(width * height);
  newState = new Array(width * height);
}

function playpause() {
  playing = !playing;
  playButton.textContent = playing ? "⏸" : "▶";
}

init();
