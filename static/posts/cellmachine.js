// максимальное замедление отображения
const skipMax = 10;

// следующие параметры ⮮ можно заменить из консоли
//
// размер поля (нужно обновление размера canvas)
let width = 50;
let height = 50;
// размер одного элемента
let scaleFactor = 10;
// количество элементов при первой загрузке
let initCount = 10;
// диапазон проверки в правиле
let xRange = 4;
let yRange = 4;
// максимальное количество нод в правиле
let itemCount = 10;

// доска для отрисовки
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
// текущее правило в текстовом виде
let ruleText = document.getElementById("rule");
// кнопка воспроизведения
let playButton = document.getElementById("play");
// текст текущей скорости
let speedText = document.getElementById("speed");

// мы в режиме воспроизведения?
var playing = true;
// мы рисуем мышкой?
var mouseDown = false;
// сколько кадров нужно пропустить
var skipCountDefault = 3;
// текущий счётчик пропущенных кадров
var skipCount = skipCountDefault;
// текущее состояние доски
var curState = new Array(width * height);
// следующее состояние доски
var newState = new Array(width * height);
// текущее генерирующее правило
var rule = generateRule();

// начальная инициализация
function init() {
  // установим размер
  canvas.width = width * scaleFactor;
  canvas.height = height * scaleFactor;

  // одиночное нажатие на поле
  canvas.addEventListener("click", addCell);
  // события для рисования курсором
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

  // применение правила из поля ввода по нажатию Enter
  ruleText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // это опасно, так как никак не валидируем что пришло из поля ввода
      rule = eval(`(f, x, y) => { return ${ruleText.value}; }`);
    }
  });

  // вывод текущей скорости
  setSpeedText();

  // сгенерируем случайные
  for (i = 0; i < initCount; i++) {
    const index = random(width * height);
    curState[index] = true;
  }

  // callback для анимации
  window.requestAnimationFrame(clock);
}

// основная функция для отрисовки и расчёта следующего состояния
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

// отрисовка
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

// расчёт следующего состояния
function next() {
  for (index = 0; index < width * height; index++) {
    const px = index % width;
    const py = Math.trunc(index / width);
    newState[index] = rule(curState, px, py);
  }
  // для быстроты будем просто свопать текущее и следующее состояние
  [curState, newState] = [newState, curState];
}

// основная функция для получения состояние доски
function V(f, x, y) {
  x %= width;
  y %= height;
  return f[y * width + x];
}

// генерация нового правила
function generateRule() {
  // выберем случайное количество операндов
  const count = random(itemCount) + 2;
  let rule = [...Array(count).keys()]
    .map((v) => {
      // сгенерируем для каждого операнда параметры в диапазоне [-val/2, val/2]
      const px = random(xRange) - xRange / 2;
      const py = random(yRange) - yRange / 2;
      return `V(f, x + ${px}, y + ${py})`.replaceAll("+ -", "- ");
    })
    .reduce((a, v) => {
      // раставим случайные операторы между операндами
      const op = sample(["&", "|", "^"]);
      return `${a} ${v} ${op}`;
    }, "");
  // удалим последний оператор
  rule = rule.slice(0, rule.length - 2).trim();
  // выведем текст правила
  updateTextRule(rule);
  // парсим код и возвращаем функцию
  return eval(`(f, x, y) => { return ${rule}; }`);
}

// включить ячейку под курсором мыши
function addCell(event) {
  const pos = getMousePos(canvas, event);
  pos.x = Math.trunc(pos.x / scaleFactor);
  pos.y = Math.trunc(pos.y / scaleFactor);
  curState[pos.y * width + pos.x] = true;
}

// это rand range по сути
function random(max) {
  return Math.floor(Math.random() * max);
}

// а это выброс случайного элемента из массива
function sample(data) {
  return data[Math.floor(Math.random() * data.length)];
}

// получения координаты курсора
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / (rect.right - rect.left)) * canvas.width,
    y: ((evt.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height,
  };
}

// ну тут должно быть и так понятно
function setSpeedText() {
  speedText.textContent = skipMax - skipCountDefault;
}

// ускорение задаётся количеством пропускаемых кадров
// при 0 мы их просто не пропускаем
function speedup() {
  if (skipCountDefault > 0) {
    skipCountDefault -= 1;
    setSpeedText();
  }
}

// а тут обратная логика, но ограничимся skipMax
function slowdown() {
  if (skipCountDefault < skipMax) {
    skipCountDefault += 1;
    setSpeedText();
  }
}

// дальше набор функция чисто чтобы можно со страницы вызвать

function regenerate() {
  rule = generateRule();
}

function fill(value) {
  curState.fill(value);
  newState.fill(value);
}

function playpause() {
  playing = !playing;
  playButton.textContent = playing ? "⏸" : "▶";
}

function updateTextRule(rule) {
  ruleText.value = rule;
  ruleText.style.minWidth = width * scaleFactor + "px";
  ruleText.style.maxWidth = width * scaleFactor + "px";
}

init();
