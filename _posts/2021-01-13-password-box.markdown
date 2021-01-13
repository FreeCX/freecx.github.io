---
title: Коробка для паролей
layout: post
---

Всем привет.

Сегодня я немного расскажу про интересном способе хранения паролей.

Сразу внесу ясность:
> я не специалист и этот метод скорее всего не очень хорош по сравнению с [KeePass][1] или аналогичными программам

Так что это просто *proof of concept*, я вас предупредил

Погнали!

# Идея
Идея о методе хранения паролей мне пришла довольно недавно и составит в следующем:
> а что если сгенерировать некий файл со псевдослучайными символами в нём, а потом по некоторому алгоритму заменить символы на парольные

Сразу возникают вопросы:
1. Какой алфавит выбрать для создания файла?
2. Каким методом заполнять файл чтобы данные были в нём довольно случайными?
3. По какому алгоритму записывать пароль в этот файл, чтобы не в открытую он там был?

По первому пункту можно сразу легко всё решить - для большей стойкости используй весь диапазон [0, 255], но а я для упрощения возьму только печатные символы.

По второму пункту не будем сильно мучиться и используем стандартную библиотеку [secrets][2], а конкретнее нам понадобится функция [choice][3].

На третьем пункте остановимся по подробнее.

# Третий пункт
У нас есть некоторый файл с ограниченной длиной и нам нужно в нём спрятать пароль.

Как же это сделать, чтобы пароль не лежал в открытую?

Самое простое решение - записать в случайные места в файле!

Но чтобы считать этот пароль обратно нам нужно как-то повторить это действие в обратную и получить обратно эти символы!

На помощь нам приходит такая классная штука как *seed*.

Из-за того что истинно случайные числа не так просто получить, то были придуманы алгоритмы которые дают последовательно псевдослучайных числе с большим периодом после которого эта последовательность начинает повторяться. В нашем случае пароли будут не очень большими и поэтому можно вообще про эту особенность.

А при чём тут *seed* тогда?

Для того чтобы последовательность была каждый раз разная и задают *seed*, т.е. отправное значение в алгоритме генерации.

Раньше часто использовали текущее время в системе, чтобы задать значение *seed*, но сейчас лучше вообще использовать более криптостойкие методы, т.к. стандартный random почти в любом языке годен только для простых вещей.

Но нам для реализации вполне хватит стандартной библиотеки [random][4].

# Реализация
Сразу в код без лишней болтовни

```python
from pathlib import Path
import argparse
import secrets
import random
import string


def generate(args):
    """Функция генерации данных для 'коробки'.

    Входные параметры:
    args.alphabet   -- используемый алфавит
    args.length     -- длина файла в символах
    args.box        -- выходной файл
    """
    with args.box.open('w') as f:
        # генерируем последовательность по заданному алфавиту длиной args.length
        box = [secrets.choice(args.alphabet) for _ in range(args.length)]
        # и пишем в коробку
        f.write(''.join(box))
        print(f'> Box `{args.box.name}` created')


def read(args):
    """Функция чтения пароля из 'коробки'.

    Входные параметры:
    args.box    -- входной файл
    args.seed   -- зерно для функции random.seed
    args.length -- длина пароля
    """
    # считаем всю коробку в переменную
    alphabet = args.box.open().read()
    # установим начальное значение для генератора
    random.seed(args.seed)
    # вытащим последовательность символов из коробки
    print(''.join(random.choices(alphabet, k=args.length)))


def insert(args):
    """Функия добавления пароля в 'коробку'.

    Входные параметры:
    args.box        -- входной файл
    args.seed       -- зерно для функции random.seed
    args.password   -- пароль для записи
    args.reseed     -- автоматическая генерация нового seed
    args.max_seed   -- максимальное число для генерации seed
    """
    # функция записи пароля в коробку
    def rewrite_box(file, box, key, positions):
        # просто пишем по сгенерированным индексам
        for key, index in zip(key, positions):
            box[index] = key
        # и запись в файл
        with file.open('w') as f:
            f.write(''.join(box))
            print(f'> Box `{args.box.name}` updated')

    # функция генерации индексов по входным значениям
    def pos(seed, box_size, key_size):
        random.seed(seed)
        # индексы всех элементов коробки
        box_iter = range(box_size)
        # по сути длина ключа
        key_iter = range(key_size)
        # выбираем K псевдослучайных индексов из коробки
        return [random.choices(box_iter)[0] for _ in key_iter]

    # нам нужны уникальные индексы без самопересечений
    def unique(data):
        return len(data) == len(set(data))

    # считаем все элементы коробки в переменную
    box = list(args.box.open().read())
    if len(box) == 0:
        print('> Box is empty')
        return

    # сгенерируем индексы
    positions = pos(args.seed, len(box), len(args.password))

    # и проверим на самопересечение
    if unique(positions):
        rewrite_box(args.box, box, args.password, positions)
    elif args.reseed:
        # если включено автоматическая генерация нового seed
        nseed_counter = 0
        # то будем перебирать
        while not unique(positions):
            new_seed = secrets.randbelow(args.max_seed)
            positions = pos(new_seed, len(box), len(args.password))
            nseed_counter += 1
            if nseed_counter > args.max_seed:
                print('> The number of attempts to generate new seed has been exceeded, please select a higher value max_seed')
                return
        print('> New seed: {new_seed}')
        # а потом запишем в файл
        rewrite_box(args.box, box, args.password, positions)
    else:
        print('> An intersection has occurred, please choose new seed value or use -r')


def analyze(args):
    """Функция построения графика энтропии файла.

    Входные параметры:
    args.box    -- входной файл для анализа
    args.save   -- выходное файл для сохранения графика
    """
    from collections import Counter
    import matplotlib.pyplot as plt

    # просто строим распределение символов в файле
    data = args.box.open().read()
    box = dict(Counter(data))
    xs = list(range(256))
    total = len(data)
    ys = [box.get(chr(i), 0) / total for i in xs]

    plt.bar(xs, ys)
    plt.title('File entropy')
    plt.xlabel('Alphabet, [0, 255]')
    plt.ylabel('Percent count, %')
    plt.grid(alpha=0.5)
    if args.save:
        plt.savefig(args.save, bbox_inches='tight', pad_inches=0.1, dpi=300)
        print(f'> Plot `{args.save}` saved')
    else:
        plt.show()


if __name__ == '__main__':
    # задаём наш алфавит
    alphabet = string.ascii_letters + string.digits + string.punctuation

    # парсинг входных аргументов (читай доки по argparse)
    parser = argparse.ArgumentParser(description='get your password from the box')
    subparser = parser.add_subparsers()

    p_read = subparser.add_parser('read', help='read password from the box', aliases=['r'])
    p_read.add_argument('-b', dest='box', type=Path, required=True, help='input box file')
    p_read.add_argument('-s', dest='seed', metavar='seed', type=int, required=True, help='initial seed value')
    p_read.add_argument('-l', dest='length', metavar='length', type=int, default=16, help='password length')
    p_read.set_defaults(func=read)

    p_create = subparser.add_parser('generate', help='generate password box', aliases=['g', 'gen'])
    p_create.add_argument('-b', dest='box', metavar='box', type=Path, required=True, help='input box file')
    p_create.add_argument('-l', dest='length', metavar='length', type=int, required=True, help='box length')
    p_create.add_argument('-a', dest='alphabet', metavar='alphabet', type=str, default=alphabet,
                          help='using alphabet')
    p_create.set_defaults(func=generate)

    p_insert = subparser.add_parser('insert', help='insert password to the box', aliases=['i', 'in'])
    p_insert.add_argument('-b', dest='box', metavar='box', type=Path, required=True, help='input box file')
    p_insert.add_argument('-s', dest='seed', metavar='seed', type=int, required=True, help='seed value')
    p_insert.add_argument('-p', dest='password', metavar='password', type=str, required=True, help='password to insert')
    p_insert.add_argument('-r', dest='reseed', metavar='reseed', type=bool, default=False, help='autogenerate new seed')
    p_insert.add_argument('-m', dest='max_seed', metavar='max_seed', type=int, default=1024, help='max seed value in reseed')
    p_insert.set_defaults(func=insert)

    p_analyze = subparser.add_parser('analyze', help='analyze file entropy', aliases=['a'])
    p_analyze.add_argument('-b', dest='box', metavar='box', type=Path, required=True, help='input box file')
    p_analyze.add_argument('-s', dest='save', metavar='save', type=Path, default=None, help='output plot file')
    p_analyze.set_defaults(func=analyze)

    args = parser.parse_args()
    if hasattr(args, 'func'):
        try:
            args.func(args)
        except FileNotFoundError:
            print(f'> File `{args.box}` not found')
    else:
        parser.print_help()
```

# Заключение
Как вы могли понять из кода - важно помнить *seed* который вы используете для восстановления пароля.

Исходники утилиты можно найти [по ссылке][5].

А на этом сегодня всё, всем пока!

# Что почитать
1. Я ничего не использовал, так что не будет ссылок

[1]: <https://keepassxc.org/>
[2]: <https://docs.python.org/3/library/secrets.html>
[3]: <https://docs.python.org/3/library/secrets.html#secrets.choice>
[4]: <https://docs.python.org/3/library/random.html?highlight=random#module-random>
[5]: <https://github.com/FreeCX/bunch-of-code/blob/master/python/passwordbox.py>