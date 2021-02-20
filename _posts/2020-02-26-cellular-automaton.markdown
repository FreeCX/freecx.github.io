---
title: Реализуем клеточный автомат
layout: post
---

Всем привет.

Похоже что я слишком рано занялся работами для следующей статьи, но ничего.
Сегодня будет не очень большая статья.

Быстро и просто реализуем клеточный автомат.
В этот раз будем писать на питоне, чтобы уложиться менее чем в *100* строк.

Ну что, погнали!

# Постановка задачи
Идея довольно проста... как и все остальные задачи что я рассматривал :)

Есть некая регулярная решётка ячеек. Каждая ячейка может находиться в одном из конечного множества *состояний*.

В нашем случае упростим до *активной* (1) и *неактивной* (0). Мы задаём начальное состояние данной регулярной решётки и на каждой итерации пересчитываем состояние всех ячеек по *некоторому* выбранному нами правилу.

Это очень поверхностное описание задачи. Для подробностей обратитесь к спец. литературе или к Стивену Вольфраму.

Навесим на нашу задачу несколько ограничений и требований:
- размер сетки: *100x100*
- количество итерации: *100*
- главная и побочная диагональ являются активными
- а также активны следующие точки: *(50, 0), (0, 50), (99, 50), (50, 99)*
- состояние текущей ячейки (*cell[x, y]*) будем считать вот так:
```text
cell[x, y] = cell[x - 1, y - 1] ^ cell[x + 1, y - 1] ^ cell[x - 1, y + 1] ^ cell[x + 1, y + 1]
```

Ну что, приступим!

# Реализация
Для нашей задачи достаточно одной сущности, которая будет реализовывать всё что нам нужно — *доска*.

Давайте определим её, а также необходимые методы:
```python
class Board:
    # кто нам доску создаст?
    def __init__(self, w, h):
        pass

    # мы хотим получать значение ячейки
    def get(self, x, y):
        pass

    # а также активировать ячейки
    def set(self, x, y):
        pass

    # и расчитывать следующее состояние используя функцию rule
    def next(self, rule):
        pass

    # также нужно куда-то всё это выводить
    def __str__(self):
        pass
```

Давайте пока повременим с реализацией данного класса и напишем код правила расчёта ячейки.
```python
# f -- функция возвращающая значение ячейки
# x, y -- координаты текущей ячейки
def rule(f, x, y):
    return f(x - 1, y - 1) ^ f(x + 1, y - 1) ^\
           f(x - 1, y + 1) ^ f(x + 1, y + 1)
```

А теперь напишем базовый код, который будет выводить каждое из состояние на печать
```python
# положение наших точек
extra_cells = [(50, 0), (0, 50), (99, 50), (50, 99)]
# количество итераций
iterations = 100
# размер сетки
size = 100

# инициализируем нашу доску
board = Board(size, size)
for i in range(size):
    # диагоналей
    board.set(i, i)
    board.set(size - i - 1, i)
for x, y in extra_cells:
    board.set(x, y)

# выводим на печать дополнительную инфорацию
print(f'{size};{size};{iterations}')
print(board)
# а также все итерации
for _ in range(1, iterations):
    board.next(rule)
    print(board)
```

Обвязочный код готов, а теперь можно приступить к реализации методов класса *Board*.

Пойдём по порядку.
```python
def __init__(self, w, h):
    # параметры доски
    self.width = w
    self.height = h
    # создаём коллекцию для наших ячеек
    self.cell = set()

def get(self, x, y):
    # если мы выходим за границы нашей доски, то это False
    if x < 0 or y < 0 or x > self.width or y > self.height:
        return False
    else:
        # иначе проверяем нашу коллекцию
        return (x, y) in self.cell

def set(self, x, y):
    # элементарное добавление элемента
    self.cell.add((x, y))

def next(self, rule):
    # не хочу писать два цикла, а хочу один!
    from itertools import product
    # создаём новую коллекцию
    new_cell = set()
    # проходим по всем сетке
    for x, y in product(range(0, self.width), range(0, self.height)):
        # если правило выполнилось для xy
        if rule(self.get, x, y):
            # то активируем её
            new_cell.add((x, y))
    # заменяем старую коллекцию на новую
    self.cell = new_cell

def __str__(self):
    result = ''
    # проходимся по всем элементам сетки
    for y in range(0, self.height):
        for x in range(0, self.width):
            # и если ячейка активна, то это '#'
            if self.get(x, y):
                result += '#'
            else:
                # иначе '.'
                result += '.'
        # не забываем про переносы
        if y != self.width - 1:
            result += '\n'
    return result
```

# Результат
Вот и всё, давайте насладимся результатом!
<video class="video media" id="video-cleartightafricanwilddog" alt="cellular automaton GIF" loop autoplay="" playsinline="" preload="auto" poster="https://thumbs.gfycat.com/ClearTightAfricanwilddog-mobile.jpg" style="max-width: 500px; margin: 0px auto; display: block;" tabindex="-1" width="500" height="500">
    <source src="https://thumbs.gfycat.com/ClearTightAfricanwilddog-mobile.mp4" type="video/mp4">
    <source src="https://giant.gfycat.com/ClearTightAfricanwilddog.webm" type="video/webm">
    <source src="https://giant.gfycat.com/ClearTightAfricanwilddog.mp4" type="video/mp4">
    <source src="https://thumbs.gfycat.com/ClearTightAfricanwilddog-mobile.mp4" type="video/mp4">
</video>

# Заключение
А на этом сегодня всё. Исходники на нескольких языках забирать [здесь](https://gist.github.com/FreeCX/d07e5cbf035bac095616de17e9046c8b).

Если у меня в ближайшее время не появиться новая интересная задачка, то увидимся ещё не скоро :)

# Полезные ссылки
1. [Клеточный автомат](https://ru.wikipedia.org/wiki/Клеточный_автомат)
2. [Правило 30](https://ru.wikipedia.org/wiki/Правило_30)
3. [Эволюционирующие клеточные автоматы](https://habr.com/ru/post/455958/)