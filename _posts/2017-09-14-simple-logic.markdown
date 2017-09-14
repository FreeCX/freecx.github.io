---
title: Пишем эмулятор простых логических схем
layout: post
---

Сегодня мы реализуем программу для симуляции логических схем. 

Конечно с помощью неё нельзя будет реализовать такие схемы как:

* триггер
* ячейка памяти
* и многие другие (все те, что имеют обратную связь)

но для написания простого сумматора - самое то!

# Базовые составляющие
Для простоты реализации писать будем на Python. Забегу вперёд и скажу, что наша базовая реализация займёт не больше 100 строчек кода. Можно и меньше, но мы за этим не будем гнаться.

Давайте определим что нам будет нужно чтобы эмулировать работу самого простого элемента?

1. Он должен иметь входы/выходы
2. Иметь возможность получать сигнал на вход и отдавать на выходе
3. Выполнять некое преобразование между входным и выходным сигналом

Для определенность возьмём элемент `NAND`. В привычных для многих функциях он будет выглядеть так:

```
X NAND Y = NOT (X AND Y)
```

Это базовый элемент, который используется в электронике и он послужит нам отправной базой в нашей программе.

Напишем каркас для нашего элемента.

# Пишем базовый элемент
```python
class ElementNAND:
    def __init__(self):
        # у NAND два входа
        self.input = [0, 0]
        # и один выход
        self.output = [0]

    def execute(self):
        # X NAND Y = NOT (X AND Y) = (NOT X) or (NOT Y)
        # см. правило ДеМоргана
        self.output[0] = (not self.input[0]) % 2 or (not self.input[1]) % 2
        # и выбирай любое из условий :)
        # self.output[0] = (not (self.input[0] and self.input[1])) % 2
        """
        для удобства отображения input и output содержат числа, а не булевый тип
        и поэтому нужно брать остаток от деления!
        """
```

Теперь мы можем проверить работоспособность нашего элемента. Напишем для него небольшую программу, которая пройдёт по таблице истинности и выведет результаты.

```python
from itertools import product

""" ... место для класса ElementNAND ... """

a = ElementNAND()
for signal in product(range(2), repeat=2):
    a.input = list(signal)
    a.execute()
    print('{} NAND {} = {}'.format(*a.input, a.output[0]))
```

Запустим и посмотрим на результат

```bash
0 NAND 0 = 1
0 NAND 1 = 1
1 NAND 0 = 1
1 NAND 1 = 0
```

Отлично, результат соответствует таблице истинности!

# Усложняем элемент
Теперь обобщим наши действия, т.е. введём ещё пару правил:

* пусть элемент может содержать в себе произвольное количество других элементов
* элементы внутри другого элемента можно соединять проводами

Что же это значит для нас?

Только то, что нужно будет:

* задавать при инициализации количество входов и выходов
* определять элементы и провода
* добавить пару функций отвечающие за работу с проводами и новыми элементами
* переделать функцию `execute`

Начнём по порядку

```python
class Element:
    """
        input_w  -- количество входных проводов
        output_w -- количество выходных проводов
        type     -- тип элемента ('составной' или 'NAND')
    """
    def __init__(self, input_w, output_w, type='составной'):
        # инициализируем нулями массивы входов и выходов
        self.input = [0] * input_w
        self.output = [0] * output_w
        # указываем тип элемента
        self.type = type
        # создаём список для внутренних элементов
        self.elements = []
        # создаём список соединяющих проводов
        self.wires = []
```

Наверное нужно остановится на списках `elements` и `wires`.

`elements` будет содержать объекты `Element` к которым можно будет обращаться по индексу, а `wires` будет содержать все связи входных и выходных проводов между элементами.

Пойдём дальше и добавим функции для работы с элементами и проводами

```python
def push_element(self, element):
    # проталкиваем элемент в список
    self.elements.append(element)
    # и возвращаем его номер в списке
    return len(self.elements) - 1

def connect_wire(self, wire_a, wire_b):
    # добавляем провод в список
    self.wires.append((wire_a, wire_b))
```

Вроде всё просто! Да?

А теперь самое главное, функция `execute`. 

```python
def execute(self):
    # если элемент NAND, то считаем по формуле
    if self.type == 'NAND':
        """ наш прошлый код """
        # X NAND Y = NOT (X AND Y) = (NOT X) or (NOT Y)
        # см. правило ДеМоргана
        self.output[0] = (not self.input[0]) % 2 or (not self.input[1]) % 2
        # и выбирай любое из условий :)
        # self.output[0] = (not (self.input[0] and self.input[1])) % 2
    # иначе, если элемент составной:
    elif self.type == 'составной':
        """ ... некоторый код ... """
```

Остановимся на данном моменте и подумаем... 

В голову сразу приходит несколько вопросов:

1. Как исполнять код для вложенных элементов?
2. Как идентифицировать входные и выходные провода?
3. Как вообще различить внутренние и внешние провода?

На 2 и 3 вопрос можно ответить сразу:

* ввести `in_self` и `out_self` -- для входов и выходов данного элемента
* и `in` и `out` -- для внутренних элементов 

Плюс будем передавать идентификатор элемента и номер входа/выхода, т.е. когда мы будем соединять элементы, то будем использовать следующий код

```python
element.connect_wire(('in_self', 0), ('in', e_id, 0))
```

где `element` -- имя самого элемента, `('in_self', 0)` -- нулевой вход у этого элемента, 
а `('in', e_id, 0)` -- вход у внутреннего элемента `e_id` на нулевом проводе

Для ответа на первый вопрос нам нужно либо реализовать _хитрый_ алгоритм, который будет обходить все элементы в определенном порядке, либо _схалтурить_ и просто последовательно идти по проводам и выполнять код на элементе только в определенный момент (когда выставлены все сигналы на входе). В данном случае нам только придётся последовательно указывать провода, а то логика вычисления может быть нарушена и мы получим неверный результат.

Я думаю вы уже поняли каким путём мы пойдём :)

```python
elif self.type == 'составной':
    """
    идём по всем проводам, где
        from_e -- начало провода
          to_e -- конец провода
    """
    for from_e, to_e in self.wires:
        # если from_e -- вход у элемента
        if from_e[0] == 'in_self':
            wire = from_e[1]
            # запоминаем установленных вход во временную переменную
            result = self.input[wire]
        # если from_e -- выход у внутреннего элемента
        elif from_e[0] == 'out':
            # вытаскиваем номер элемента и провод из from_e
            idN, wire = from_e[1:]
            # и запоминаем установленных выход во временную переменную
            result = self.elements[idN].output[wire]
        # если to_e -- вход внутреннего элемента
        if to_e[0] == 'in':
            # вытаскиваем номер элемента и провод
            idN, wire = to_e[1:]
            # устанавливаем значение сигнала на проводе используя ту самую переменную
            self.elements[idN].input[wire] = result
            # и выполняем код внутри элемента
            self.elements[idN].execute()
        # если to_e -- выход у самого элемента
        elif to_e[0] == 'out_self':
            wire = to_e[1]
            # то просто записываем результат на его выход
            self.output[wire] = result
```

Вот и всё! Конечно код не супер идеальный и скорее всего с ошибкой в логике исполнения, но он работает :) 
И для миниатюрного симулятора логики этого будет достаточно!

Полный листинг кода

```python
class Element:
    """
        input_w  -- количество входных проводов
        output_w -- количество выходных проводов
        type     -- тип элемента ('составной' или 'NAND')
    """
    def __init__(self, input_w, output_w, type='составной'):
        # инициализируем нулями массивы входов и выходов
        self.input = [0] * input_w
        self.output = [0] * output_w
        # указываем тип элемента
        self.type = type
        # создаём список для внутренних элементов
        self.elements = []
        # создаём список соединяющих проводов
        self.wires = []

    def push_element(self, element):
        # проталкиваем элемент в список
        self.elements.append(element)
        # и возвращаем его номер в списке
        return len(self.elements) - 1

    def connect_wire(self, wire_a, wire_b):
        # добавляем провод в список
        self.wires.append((wire_a, wire_b))

    def execute(self):
        # если элемент NAND, то считаем по формуле
        if self.type == 'NAND':
            # X NAND Y = NOT (X AND Y) = (NOT X) or (NOT Y)
            # см. правило ДеМоргана
            self.output[0] = (not self.input[0]) % 2 or (not self.input[1]) % 2
            # и выбирай любое из условий :)
            # self.output[0] = (not (self.input[0] and self.input[1])) % 2
        # иначе, если элемент составной:
        elif self.type == 'составной':
            """
            идём по всем проводам, где
                from_e -- начало провода
                  to_e -- конец провода
            """
            for from_e, to_e in self.wires:
                # если from_e -- вход у элемента
                if from_e[0] == 'in_self':
                    wire = from_e[1]
                    # запоминаем установленных вход во временную переменную
                    result = self.input[wire]
                # если from_e -- выход у внутреннего элемента
                elif from_e[0] == 'out':
                    # вытаскиваем номер элемента и провод из from_e
                    idN, wire = from_e[1:]
                    # и запоминаем установленных выход во временную переменную
                    result = self.elements[idN].output[wire]
                # если to_e -- вход внутреннего элемента
                if to_e[0] == 'in':
                    # вытаскиваем номер элемента и провод
                    idN, wire = to_e[1:]
                    # устанавливаем значение сигнала на проводе используя ту самую переменную
                    self.elements[idN].input[wire] = result
                    # и выполняем код внутри элемента
                    self.elements[idN].execute()
                # если to_e -- выход у самого элемента
                elif to_e[0] == 'out_self':
                    wire = to_e[1]
                    # то просто записываем результат на его выход
                    self.output[wire] = result
```

# Реализация сумматора
Если мы честно хотим реализовать сумматор используя класс `Element`, то для начала нам нужно создать ещё несколько логических элементов.

Реализовывать мы его будем через два полусумматора, а также нам будут нужны ещё и следующие элементы:

* `NOT`
* `AND`
* `OR`
* `XOR`

## Элемент NOT
Элемент `NOT` достаточно легко будет реализовать, нужно всего лишь подать один и тот же сигнал на обе ноги `NAND`.

```
NOT X = X NAND X = NOT (X AND X) = NOT X
```

Реализуем в коде

```python
# нам нужен новый объект, а не ссылка
from copy import deepcopy

""" ... код ... """

# создадим элемент NAND (два входа и один выход)
nand_e = Element(2, 1, type='NAND')
# создадим элемент NOT (вход и выход)
not_e = Element(1, 1)
# добавим элемент внутрь и получим его id
nand_id = not_e.push_element(deepcopy(nand_e))

# соединяем нулевой вход элемента NOT и нулевой вход у NAND
not_e.connect_wire(('in_self', 0), ('in', nand_id, 0))
# соединяем нулевой вход элемента NOT и первый вход у NAND
not_e.connect_wire(('in_self', 0), ('in', nand_id, 1))
# соединяем выходы
not_e.connect_wire(('out', nand_id, 0), ('out_self', 0))

# + можно сделать проверку на корректность результатов
not_e.input[0] = 0
not_e.execute()
assert(not_e.output[0] == 1)
not_e.input[0] = 1
not_e.execute()
assert(not_e.output[0] == 0)
```

## Элемент AND
Элемент `AND` реализуем через только что написанный `NOT` и опять же `NAND`.

```
X AND Y = NOT (X NAND Y) = X AND Y
```

Пишем код

```python
from itertools import product

""" ... код ... """

# создадим элемент AND (два входа и один выход)
and_e = Element(2, 1)
# добавим NOT и NAND
not_id_1 = and_e.push_element(deepcopy(not_e))
nand_id_1 = and_e.push_element(deepcopy(nand_e))

# теперь соединяем провода
# B = X NAND Y
and_e.connect_wire(('in_self', 0), ('in', nand_id_1, 0))
and_e.connect_wire(('in_self', 1), ('in', nand_id_1, 1))
# A = NOT B
and_e.connect_wire(('out', nand_id_1, 0), ('in', not_id_1, 0))
# result = A
and_e.connect_wire(('out', not_id_1, 0), ('out_self', 0))

# и делаем проверку
for signal in product(range(2), repeat=2):
    and_e.input = list(signal)
    and_e.execute()
    prof = signal[0] and signal[1]
    assert(and_e.output[0] == prof)
```

## Элемент OR
Элемент `OR` реализуем используя три `NAND`.

```
X OR Y = (X NAND X) NAND (Y NAND Y)
```

Реализуя следующим кодом

```python
# создаём элемент OR (два входа и один выход)
or_e = Element(2, 1)
# добавляем нужные элементы
nand_id_1 = or_e.push_element(deepcopy(nand_e))
nand_id_2 = or_e.push_element(deepcopy(nand_e))
nand_id_3 = or_e.push_element(deepcopy(nand_e))

# и соединяем провода
# A = X NAND X
or_e.connect_wire(('in_self', 0), ('in', nand_id_1, 0))
or_e.connect_wire(('in_self', 0), ('in', nand_id_1, 1))
# B = Y NAND Y
or_e.connect_wire(('in_self', 1), ('in', nand_id_2, 0))
or_e.connect_wire(('in_self', 1), ('in', nand_id_2, 1))
# C = A NAND B
or_e.connect_wire(('out', nand_id_1, 0), ('in', nand_id_3, 0))
or_e.connect_wire(('out', nand_id_2, 0), ('in', nand_id_3, 1))
# result = C
or_e.connect_wire(('out', nand_id_3, 0), ('out_self', 0))

# и делаем проверку
for signal in product(range(2), repeat=2):
    or_e.input = list(signal)
    or_e.execute()
    prof = signal[0] or signal[1]
    assert(or_e.output[0] == prof)
```

## Элемент XOR
Элемент `XOR` реализуем используя `NAND`, `AND` и `OR`.

```
X XOR Y = (X NAND Y) AND (X OR Y)
```

Реализация будет следующая

```python
# создаем элемент XOR (два входа и один выход)
xor_e = Element(2, 1)
# добавляем элементы
nand_id = xor_e.push_element(deepcopy(nand_e))
or_id = xor_e.push_element(deepcopy(or_e))
and_id = xor_e.push_element(deepcopy(and_e))

# и соединяем провода
# A = X NAND Y
xor_e.connect_wire(('in_self', 0), ('in', nand_id, 0))
xor_e.connect_wire(('in_self', 1), ('in', nand_id, 1))
# B = X OR Y
xor_e.connect_wire(('in_self', 0), ('in', or_id, 0))
xor_e.connect_wire(('in_self', 1), ('in', or_id, 1))
# C = A AND B
xor_e.connect_wire(('out', nand_id, 0), ('in', and_id, 0))
xor_e.connect_wire(('out', or_id, 0), ('in', and_id, 1))
# result = C
xor_e.connect_wire(('out', and_id, 0), ('out_self', 0))

# и делаем проверку
for signal in product(range(2), repeat=2):
    xor_e.input = list(signal)
    xor_e.execute()
    prof = signal[0] ^ signal[1]
    assert(xor_e.output[0] == prof)
```

## Полусумматор
Настало время написать полусумматор. Для этого нам понадобятся два элемента: `XOR` и `AND`.

Таблица истинности полусумматора выглядит следующим образом

| X | Y | S | C |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |

где `X` и `Y` -- входы, а `S` и `C` -- сумма и бит переноса, и они определяются следующими выражениями

```
S = X XOR Y
C = X AND Y
```

Напишем его реализацию

```python
# создаём полусумматор (два входа и два выхода)
hadd_e = Element(2, 2)
# добавляем в него XOR и AND
xor_id = hadd_e.push_element(deepcopy(xor_e))
and_id = hadd_e.push_element(deepcopy(and_e))

# и соединяем провода
# S = X XOR Y
hadd_e.connect_wire(('in_self', 0), ('in', xor_id, 0))
hadd_e.connect_wire(('in_self', 1), ('in', xor_id, 1))
# result[0] = S
hadd_e.connect_wire(('out', xor_id, 0), ('out_self', 0))
# C = X AND Y
hadd_e.connect_wire(('in_self', 0), ('in', and_id, 0))
hadd_e.connect_wire(('in_self', 1), ('in', and_id, 1))
# result[1] = C
hadd_e.connect_wire(('out', and_id, 0), ('out_self', 1))

# и делаем проверку
for signal in product(range(2), repeat=2):
    hadd_e.input = list(signal)
    hadd_e.execute()
    prof = [signal[0] ^ signal[1], signal[0] and signal[1]]
    assert(hadd_e.output == prof)
```

## Сумматор
Наконец-то мы подошли к самому сумматору! 

Для его реализации нам понадобятся два полусумматора и элемент `OR`.

Таблица истинности следующая

| X | Y | Z | S | C |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 1 | 0 |
| 0 | 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 0 | 1 |
| 0 | 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 | 1 |
| 0 | 1 | 1 | 0 | 1 |
| 1 | 1 | 1 | 1 | 1 |

где `X` и `Y` -- входы, `Z` -- входной бит переноса, `S` -- выходная сумма, `C` -- выходной бит переноса.

Давайте же наконец напишем его

```python
# создаём сумматор (три входа и два выхода)
add_e = Element(3, 2)
# добавляем элементы
ha_id_1 = add_e.push_element(deepcopy(hadd_e))
ha_id_2 = add_e.push_element(deepcopy(hadd_e))
or_id = add_e.push_element(deepcopy(or_e))

# и соединяем провода
# я думаю вы сможете найти схему полного сумматора на двух полусумматорах
# и разобраться в этом коде!
add_e.connect_wire(('in_self', 0), ('in', ha_id_1, 0))
add_e.connect_wire(('in_self', 1), ('in', ha_id_1, 1))
add_e.connect_wire(('in_self', 2), ('in', ha_id_2, 1))
add_e.connect_wire(('out', ha_id_1, 0), ('in', ha_id_2, 0))
add_e.connect_wire(('out', ha_id_1, 1), ('in', or_id, 0))
add_e.connect_wire(('out', ha_id_2, 1), ('in', or_id, 1))
add_e.connect_wire(('out', ha_id_2, 0), ('out_self', 0))
add_e.connect_wire(('out', or_id, 0), ('out_self', 1))

# делаем финальную проверку по таблице истинности
table = [
#    X  Y  Z  S  C
    [0, 0, 0, 0, 0],
    [1, 0, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 1, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1]
]
for x, y, z, s, c in table:
    add_e.input = [x, y, z]
    add_e.execute()
    assert(add_e.output == [s, c])
```

Полная листинг представлен ниже

```python
from itertools import product
from copy import deepcopy


class Element:
    """
        input_w  -- количество входных проводов
        output_w -- количество выходных проводов
        type     -- тип элемента ('составной' или 'NAND')
    """
    def __init__(self, input_w, output_w, type='составной'):
        # инициализируем нулями массивы входов и выходов
        self.input = [0] * input_w
        self.output = [0] * output_w
        # указываем тип элемента
        self.type = type
        # создаём список для внутренних элементов
        self.elements = []
        # создаём список соединяющих проводов
        self.wires = []

    def push_element(self, element):
        # проталкиваем элемент в список
        self.elements.append(element)
        # и возвращаем его номер в списке
        return len(self.elements) - 1

    def connect_wire(self, wire_a, wire_b):
        # добавляем провод в список
        self.wires.append((wire_a, wire_b))

    def execute(self):
        # если элемент NAND, то считаем по формуле
        if self.type == 'NAND':
            # X NAND Y = NOT (X AND Y) = (NOT X) or (NOT Y)
            # см. правило ДеМоргана
            self.output[0] = (not self.input[0]) % 2 or (not self.input[1]) % 2
            # и выбирай любое из условий :)
            # self.output[0] = (not (self.input[0] and self.input[1])) % 2
        # иначе, если элемент составной:
        elif self.type == 'составной':
            """
            идём по всем проводам, где
                from_e -- начало провода
                  to_e -- конец провода
            """
            for from_e, to_e in self.wires:
                # если from_e -- вход у элемента
                if from_e[0] == 'in_self':
                    wire = from_e[1]
                    # запоминаем установленных вход во временную переменную
                    result = self.input[wire]
                # если from_e -- выход у внутреннего элемента
                elif from_e[0] == 'out':
                    # вытаскиваем номер элемента и провод из from_e
                    idN, wire = from_e[1:]
                    # и запоминаем установленных выход во временную переменную
                    result = self.elements[idN].output[wire]
                # если to_e -- вход внутреннего элемента
                if to_e[0] == 'in':
                    # вытаскиваем номер элемента и провод
                    idN, wire = to_e[1:]
                    # устанавливаем значение сигнала на проводе используя ту самую переменную
                    self.elements[idN].input[wire] = result
                    # и выполняем код внутри элемента
                    self.elements[idN].execute()
                # если to_e -- выход у самого элемента
                elif to_e[0] == 'out_self':
                    wire = to_e[1]
                    # то просто записываем результат на его выход
                    self.output[wire] = result


""" Реализация NOT """

# создадим элемент NAND (два входа и один выход)
nand_e = Element(2, 1, type='NAND')
# создадим элемент NOT (вход и выход)
not_e = Element(1, 1)
# добавим элемент внутрь и получим его id
nand_id = not_e.push_element(deepcopy(nand_e))

# соединяем нулевой вход элемента NOT и нулевой вход у NAND
not_e.connect_wire(('in_self', 0), ('in', nand_id, 0))
# соединяем нулевой вход элемента NOT и первый вход у NAND
not_e.connect_wire(('in_self', 0), ('in', nand_id, 1))
# соединяем выходы
not_e.connect_wire(('out', nand_id, 0), ('out_self', 0))

# + можно сделать проверку на корректность результатов
not_e.input[0] = 0
not_e.execute()
assert(not_e.output[0] == 1)
not_e.input[0] = 1
not_e.execute()
assert(not_e.output[0] == 0)

""" Реализация AND """

# создадим элемент AND (два входа и один выход)
and_e = Element(2, 1)
# добавим NOT и NAND
not_id = and_e.push_element(deepcopy(not_e))
nand_id = and_e.push_element(deepcopy(nand_e))

# теперь соединяем провода
# B = X NAND Y
and_e.connect_wire(('in_self', 0), ('in', nand_id, 0))
and_e.connect_wire(('in_self', 1), ('in', nand_id, 1))
# A = NOT B
and_e.connect_wire(('out', nand_id, 0), ('in', not_id, 0))
# result = A
and_e.connect_wire(('out', not_id, 0), ('out_self', 0))

# и делаем проверку
for signal in product(range(2), repeat=2):
    and_e.input = list(signal)
    and_e.execute()
    prof = signal[0] and signal[1]
    assert(and_e.output[0] == prof)

""" Реализация OR """

# создаём элемент OR (два входа и один выход)
or_e = Element(2, 1)
# добавляем нужные элементы
nand_id_1 = or_e.push_element(deepcopy(nand_e))
nand_id_2 = or_e.push_element(deepcopy(nand_e))
nand_id_3 = or_e.push_element(deepcopy(nand_e))

# и соединяем провода
# A = X NAND X
or_e.connect_wire(('in_self', 0), ('in', nand_id_1, 0))
or_e.connect_wire(('in_self', 0), ('in', nand_id_1, 1))
# B = Y NAND Y
or_e.connect_wire(('in_self', 1), ('in', nand_id_2, 0))
or_e.connect_wire(('in_self', 1), ('in', nand_id_2, 1))
# C = A NAND B
or_e.connect_wire(('out', nand_id_1, 0), ('in', nand_id_3, 0))
or_e.connect_wire(('out', nand_id_2, 0), ('in', nand_id_3, 1))
# result = C
or_e.connect_wire(('out', nand_id_3, 0), ('out_self', 0))

# и делаем проверку
for signal in product(range(2), repeat=2):
    or_e.input = list(signal)
    or_e.execute()
    prof = signal[0] or signal[1]
    assert(or_e.output[0] == prof)

""" Реализация XOR """
# создаем элемент XOR (два входа и один выход)
xor_e = Element(2, 1)
# добавляем элементы
nand_id = xor_e.push_element(deepcopy(nand_e))
or_id = xor_e.push_element(deepcopy(or_e))
and_id = xor_e.push_element(deepcopy(and_e))

# и соединяем провода
# A = X NAND Y
xor_e.connect_wire(('in_self', 0), ('in', nand_id, 0))
xor_e.connect_wire(('in_self', 1), ('in', nand_id, 1))
# B = X OR Y
xor_e.connect_wire(('in_self', 0), ('in', or_id, 0))
xor_e.connect_wire(('in_self', 1), ('in', or_id, 1))
# C = A AND B
xor_e.connect_wire(('out', nand_id, 0), ('in', and_id, 0))
xor_e.connect_wire(('out', or_id, 0), ('in', and_id, 1))
# result = C
xor_e.connect_wire(('out', and_id, 0), ('out_self', 0))

# и делаем проверку
for signal in product(range(2), repeat=2):
    xor_e.input = list(signal)
    xor_e.execute()
    prof = signal[0] ^ signal[1]
    assert(xor_e.output[0] == prof)

""" Реализация HADD """
# создаём полусумматор (два входа и два выхода)
hadd_e = Element(2, 2)
# добавляем в него XOR и AND
xor_id = hadd_e.push_element(deepcopy(xor_e))
and_id = hadd_e.push_element(deepcopy(and_e))

# и соединяем провода
# S = X XOR Y
hadd_e.connect_wire(('in_self', 0), ('in', xor_id, 0))
hadd_e.connect_wire(('in_self', 1), ('in', xor_id, 1))
# result[0] = S
hadd_e.connect_wire(('out', xor_id, 0), ('out_self', 0))
# C = X AND Y
hadd_e.connect_wire(('in_self', 0), ('in', and_id, 0))
hadd_e.connect_wire(('in_self', 1), ('in', and_id, 1))
# result[1] = C
hadd_e.connect_wire(('out', and_id, 0), ('out_self', 1))

# и делаем проверку
for signal in product(range(2), repeat=2):
    hadd_e.input = list(signal)
    hadd_e.execute()
    prof = [signal[0] ^ signal[1], signal[0] and signal[1]]
    assert(hadd_e.output == prof)

""" Сумматор """
# создаём сумматор (три входа и два выхода)
add_e = Element(3, 2)
# добавляем элементы
ha_id_1 = add_e.push_element(deepcopy(hadd_e))
ha_id_2 = add_e.push_element(deepcopy(hadd_e))
or_id = add_e.push_element(deepcopy(or_e))

# и соединяем провода
# я думаю вы сможете найти схему полного сумматора на двух полусумматорах
# и разобраться в этом коде!
add_e.connect_wire(('in_self', 0), ('in', ha_id_1, 0))
add_e.connect_wire(('in_self', 1), ('in', ha_id_1, 1))
add_e.connect_wire(('in_self', 2), ('in', ha_id_2, 1))
add_e.connect_wire(('out', ha_id_1, 0), ('in', ha_id_2, 0))
add_e.connect_wire(('out', ha_id_1, 1), ('in', or_id, 0))
add_e.connect_wire(('out', ha_id_2, 1), ('in', or_id, 1))
add_e.connect_wire(('out', ha_id_2, 0), ('out_self', 0))
add_e.connect_wire(('out', or_id, 0), ('out_self', 1))

# делаем финальную проверку по таблице истинности
table = [
#    X  Y  Z  S  C
    [0, 0, 0, 0, 0],
    [1, 0, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 1, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1]
]
for x, y, z, s, c in table:
    add_e.input = [x, y, z]
    add_e.execute()
    assert(add_e.output == [s, c])
```

# Послесловие
Что имеем в итоге:

* реализовали простой симулятор логики
* реализовали простые элементы на базе `NAND`:
    * `NOT`
    * `AND`
    * `OR`
    * `XOR`
* реализовали полусумматор и сумматор

На этом сегодня всё!

# Полезные ссылки
1. [Симулятор с примерами на Rust](https://github.com/FreeCX/rs-logic)
2. [Wikipedia](https://ru.wikipedia.org)
2. [Google](https://google.com)