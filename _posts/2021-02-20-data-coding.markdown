---
title: Немного про кодирование данных
layout: post
---

Всем привет.

Сегодня я хочу немного рассказать про человекочитаемое кодирование данных.

Это не полноценная статья, да и метод не тянет на новый или выдающийся, но он довольно прост в реализации.

# Идея
Алгоритм кодирования данных можно описать в три пункта:
1. Проход по всем входным данных и преобразование каждого символа в 8 бит данных
2. Добавление паддинга в конец данных
3. Проход по всем данным и выбор по 6 бит с преобразованием по алфавиту

Всё выглядит очень просто, что так и есть!

С декодированием обстоит всё так же просто. Оно реализуется обращением шагов 1-3:
1. Проход по всем данным и преобразование символа в 6 бит данных
2. Удаление паддинга
3. Проход по всем данным и выбор по 8 бит с преобразованием по алфавиту

Ничего же сложного?

# Алфавит
Главное требование к алфавиту — фиксированная длина в *2^N* символов, где *N* равен *6*.

В реализации [сохранения состояния игры][2] я использовал следующий алфавит:
```text
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+~
```

Но в данном примере мы его изменим на вот такой:
```text
0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#@
```

В своей же реализации можете выбрать любой какой вам больше нравится.

# Реализация
Давайте в этот раз реализуем алгоритм на менее привычном языке, например на Haskell.

Я не мастер писать на нём, так что сильно не пинайте!

Определим скелет нашей программы
```haskell
module Main where

import Text.Printf (printf)

-- функция заглушка для кодирования сообщения
encode :: String -> String
encode x = x

-- функция заглушка для декодирования сообщения
decode :: String -> String
decode x = x

main = do
    input <- getLine
    let encoded = encode input
    let decoded = decode encoded
    printf " input: `%s`\nencode: `%s`\ndecode: `%s`\n" input encoded decoded
```

Тут мы просто организуем чтение строки из *stdin* и вызов функций кодирования и декодирования.

Для реализации основного функционала нам нужны некоторые вспомогательные функции, такие как:
- добавление паддинга
- удаление паддинга
- группировка элементов
- число в массив бит
- массив бит в число

Давайте определим их
```haskell
import Data.List (elemIndex)
import Data.Char (ord, chr)
import Data.Bits (shiftL)

-- добавление паддинга до размера size
sizePadding :: ([a] -> [a] -> [a]) -> Int -> a -> [a] -> [a]
sizePadding func size value array
    -- если текущий массив больше по размеру, то это ошибка
    | curr > size = error $ "Current size > " ++ (show size)
    -- добиваем паддинги
    | curr < size = func array padding
    -- или возвращаем исходный
    | otherwise = array
    where
        -- размер входных данных
        curr = length array
        -- размер паддинга
        padsize = size - curr
        -- сам паддинг
        padding = take padsize . repeat $ value

-- добавление паддинга до кратного modBy
modPadding :: ([a] -> [a] -> [a]) -> Int -> a -> [a] -> [a]
modPadding func modBy value array = func array padding
    where
        -- размер входных данных
        modv = (length array) `mod` modBy
        -- размер паддинга
        padsize = if modv == 0 then 0 else modBy - modv
        -- паддинг
        padding = take padsize . repeat $ value

-- удаление паддинга с конца массива
removePadding :: Int -> [Int] -> [Int]
removePadding size arr = take wop arr
    where
        -- длина входного массива
        len = length arr 
        -- количество возвращаемых элементов
        wop = len - (len `mod` size)

-- группировка данных по n элементов
group :: Int -> [Int] -> [[Int]]
group _ [] = []
group n l
    | n > 0 = (take n l) : (group n $ drop n l)
    -- ноль или отрицательное число элементов недопустимо
    | otherwise = error "Negative or zero n"

-- преобразование массива битов в число
asInt :: [Int] -> Int
asInt = foldl (\a b -> (a `shiftL` 1) + b) 0

-- преобразование int в бинарное представление
binary :: Int -> [Int]
binary = convert []
    where
        -- готово
        convert arr 0 = arr
        -- в процессе преобразования
        convert arr val = convert ((: arr) . (`mod` 2) $ val) (val `div` 2)

-- вспомогательная функция преобразование строки в массив int`ов
toIntMap :: (Char -> [Int]) -> String -> [Int]
toIntMap func = foldr (++) [] . map func
```

Теперь можно перейти к самому главному
```haskell
import Data.Maybe (fromJust)

-- наш алфавит
alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#@"

-- кодирование текста
encode :: String -> String
encode = asAlphabet . group 6 . modTail6 . toIntMap asArray8
    where
        -- преобразование индекса в символ алфавита
        asAlphabet = map ((alphabet !!) . asInt)
        -- добавление паддинга в начало
        headPad8 = sizePadding (\a b -> b ++ a) 8 0
        -- добавление паддинга в конце
        modTail6 = modPadding (++) 6 0
        -- строка в набор бит
        asArray8 = headPad8 . binary . ord

-- декодирование
decode :: String -> String
decode = asAlphabet . group 8 . removePadding 8 . toIntMap asArray6
    where
        -- преобразование индекса в символ
        asAlphabet = map (chr . asInt)
        -- добавление паддинга в начало
        headPad6 = sizePadding (\a b -> b ++ a) 6 0
        -- строка в набор бит
        asArray6 = headPad6 . binary . fromJust . (`elemIndex` alphabet)
```

# Как это работает?
Для тех кто не знаком с Haskell это наверное выглядит очень странно.

Поэтому давайте рассмотрим последовательно что делает функция **encode** на примере строки из одного символа **"h"**.

1. **asArray8** (**toIntMap** проходит по всей строке и собирает все эти биты в один массив)
```text
#   ord     binary              headPad8
"h" --> 104 --> [1,1,0,1,0,0,0] --> [0,1,1,0,1,0,0,0]
```

2. **modTail6** (добиваем паддингом для кратности 6)
```text
[0,1,1,0,1,0,0,0] --> [0,1,1,0,1,0,0,0,0,0,0,0]
```

3. **group 6** (группируем по 6)
```text
[0,1,1,0,1,0,0,0,0,0,0,0] --> [[0,1,1,0,1,0],[0,0,0,0,0,0]]
```

4. **asAlphabet** (преобразуем в символы)
```text
#           asInt    alphabet !!
[0,1,1,0,1,0] --> 26 --> 'q'
[0,0,0,0,0,0] --> 0  --> '0'
```

Так как **String** это синоним **[Char]**, то на выходе мы автоматически получим строку **"q0"**.

Возможны сейчас стало понятно почему я цифры в алфавите поставил в самое начало :)

# Заключение
Полный исходный код данной программы можно забрать [здесь][0].

Данный метод я использовал в [rs-1010][1] для [сохранения состояния игры][2]. 

Данную реализацию ещё можно сильно улучшить убрав создание массива из битов, но это уже будет по сути реализация 
алгоритма [base64][3] просто с модифицированным алфавитом.

На это закончим на сегодня.

# Что почитать
1. [base64][3]
2. [Как работает алгоритм генерации паролей Castlevania III][4]
3. [Генерирование паролей для Super Castlevania IV и Rock n' Roll Racing][5]

[0]: <https://gist.github.com/FreeCX/e91d7b739a1bde033037f7ff153045e9>
[1]: <https://github.com/FreeCX/rs-1010>
[2]: <https://github.com/FreeCX/rs-1010/blob/master/src/save.rs>
[3]: <https://en.wikipedia.org/wiki/Base64>
[4]: <https://habr.com/ru/post/537776/>
[5]: <https://habr.com/ru/post/304160/>