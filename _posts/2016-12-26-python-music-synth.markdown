---
title: Пишем простой синтезатор на Python
layout: post
---

В [предыдущем посте]({% post_url 2016-09-07-sound-generator-for-morse %}) я писал про генерацию звука на Rust`е для азбуки Морзе. 

Сегод*няш*няя статья будет короткой, но в ней мы рассмотрим написание упрощенной версии программного синтезатора. 

Ну что же, __поехали__!

# Генерация звука
Не будем изобретать что-то новое, а возьмём функцию генерации звука [из прошлой статьи]({% post_url 2016-09-07-sound-generator-for-morse %}) и адаптируем её под python:

```python
import numpy as np

# частота дискретизации
SAMPLE_RATE = 44100
# 16-ти битный звук (2 ** 16 -- максимальное значение для int16)
S_16BIT = 2 ** 16

def generate_sample(freq, duration, volume):
    # амплитуда
    amplitude = np.round(S_16BIT * volume)
    # длительность генерируемого звука в сэмплах
    total_samples = np.round(SAMPLE_RATE * duration)
    # частоте дискретизации (пересчитанная)
    w = 2.0 * np.pi * freq / SAMPLE_RATE
    # массив сэмплов
    k = np.arange(0, total_samples)
    # массив значений функции (с округлением)
    return np.round(amplitude * np.sin(k * w))
```

Теперь, когда у нас есть функция генерации звука любой частоты, длительности и громкости, остаётся сгененрировать ноты из [первой октавы](https://ru.wikipedia.org/wiki/Октавная_система#.D0.9F.D0.B5.D1.80.D0.B2.D0.B0.D1.8F_.D0.BE.D0.BA.D1.82.D0.B0.D0.B2.D0.B0) и подать их на устройство воспроизведения.

# Генерация звука нот

Запишем частоты нот первой октавы в массив и напишем функцию, которая будет их генерировать

```python
#                      до      ре      ми     фа       соль    ля      си
freq_array = np.array([261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88])

def generate_tones(duration):
    tones = []
    for freq in freq_array:
        # np.array нужен для преобразования данных под формат 16 бит (dtype=np.int16)
        tone = np.array(generate_sample(freq, duration, 1.0), dtype=np.int16)
        tones.append(tone)
    return tones
```

Остаётся последнее -- вывести звук.

# Вывод звука
Для вывода звука будем использовать кроссплатформенную библиотеку [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/).

Так же нам понадобится как-то отслеживать нажатия клавиш, чтобы наша программа была похожа на настоящий синтезатор. Поэтому я взял [pygame](http://www.pygame.org/lofi.html), т.к. он прост в работе. Вы же можете использовать то, что вам больше нравится!

Не будем медлить. Начнём!

```python
import pyaudio as pa
import pygame

# ... место для предыдущего кода ...

# наши клавиши
key_names = ['a', 's', 'd', 'f', 'g', 'h', 'j']
# коды клавиш
key_list = list(map(lambda x: ord(x), key_names))
# состояние клавиш (нажато/не нажато)
key_dict = dict([(key, False) for key in key_list])

if __name__ == '__main__':
    # инициализируем
    p = pa.PyAudio()
    # создаём поток для вывода
    stream = p.open(format=p.get_format_from_width(width=2),
                    channels=2, rate=SAMPLE_RATE, output=True)
    # размер окна pygame
    window_size = 320, 240
    # настраиваем экран
    screen = pygame.display.set_mode(window_size)
    pygame.display.flip()
    running = True
    while running:
        # обрабатываем события
        for event in pygame.event.get():
            # событие закрытия окна
            if event.type == pygame.QUIT:
                running = False
            # нажатия клавиш
            if event.type == pygame.KEYDOWN:
                if event.key == ord('q'):
                    running = False
                # обрабатываем нажатые клавиши по списку key_list
                for (index, key) in enumerate(key_list):
                    if event.key == key:
                        # зажимаем клавишу
                        key_dict[key] = True
            # отпускание клавиш
            if event.type == pygame.KEYUP:
                for (index, key) in enumerate(key_list):
                    if event.key == key:
                        # отпускаем клавишу
                        key_dict[key] = False
        # обрабатываем нажатые клавиши
        for (index, key) in enumerate(key_list):
            # если клавиша нажата
            if key_dict[key] == True:
                # то выводим звук на устройство
                stream.write(tones[index])
    # закрываем окно
    pygame.quit()
    # останавливаем устройство
    stream.stop_stream()
    # завершаем работу PyAudio
    stream.close()
    p.terminate()
```

Вот и всё. Наш минимальный синтезатор готов!

# Полезные ссылки
[1] [Предыдущий пост]({% post_url 2016-09-07-sound-generator-for-morse %})

[2] [Исходный код с модификациями](https://gist.github.com/FreeCX/e463229415c87e6aa1e47e6ea67be1de)

[3] Документация по [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/docs/)

[4] Документация по [pygame](http://www.pygame.org/docs/)

[5] [Программный синтез звука на ранних персональных компьютерах #1](https://habrahabr.ru/post/348036/)
