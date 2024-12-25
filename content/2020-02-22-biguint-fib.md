---
title: Считаем числа Фибоначчи с помощью больших чисел
layout: post
---

Никто не ждал, а я вернулся!

Наверное уж подумали что только через пару лет что-нибудь напишу, но я же не [этот товарищ](https://citrux.github.io/).

Не будем тянуть кота за хвост и начнём!

# Постановка задачи
Задача проста как *'2' + 2 = 22*. Нужно всего-то посчитать *100_000* число последовательности Фибоначчи, делов-то!

Если кто-то забыл, то вот основная формула для расчёта

![Fibonachi Sequence](https://latex.codecogs.com/gif.download?F_n%20%3D%20F_%7Bn-1%7D%20+%20F_%7Bn-2%7D)

Мы как всегда будем хитрить и писать с некоторыми оптимизациями.

```
－ А почему?
－ А почему бы и нет?

(c) Кто-то
```

Но начнём сначала с написания функционала для расчёта больших чисел. Как-никак это самое главное!

Писать как всегда будем на *rust*, т.к. я давно что-то его не использовал, да и нравиться мне этот язык!

# Реализация больших чисел
Давайте сначала подумаем как мы будем представлять числа в памяти... Подумали? Молодцы!

Для простоты реализации числа будем укладывать в вектор в обратном порядке. Далее вы поймёте почему именно в обратном.

Т.е. число *852_493_284_923_849_834_982* в векторе будет выглядеть как-то так:
```rust
let a = vec![2, 8, 9, 4, 3, 8, 9, 4, 8, 3, 2, 9, 4, 8, 2, 3, 9, 4, 2, 5, 8];
```

Для этого нам нужна некоторая структура + реализуем макрос с помощью которого будет легко задавать числа.
```rust
#[derive(Clone)]
struct BigUInt {
    digit: Vec<u8>,
}

macro_rules! big_vec {
    ($($x:tt)*) => {
        {
            // соберём все термы в другой макрос
            let mut value = vec![$($x)*];
            // перевернём массив
            value.reverse();
            // и инициализируем наше большое число
            BigUInt::from_vec(value)
        }
    }
}
```

Вы наверное заметили *BigUInt::from_vec*, которая у нас не определена. Давайте исправим эту оплошность!
```rust
impl BigUInt {
    fn from_vec<T: Into<Vec<u8>>>(digit: T) -> BigUInt {
        // ничего сложного, просто наш T должен реализовывать трейт Into преобразующий digit в вектор
        BigUInt {
            digit: digit.into(),
        }
    }
}
```

Теперь перейдём к самому интересному и напишем реализацию оператора сложения.

Всё достаточно просто реализуется в два шага:
- выравнить два числа, чтобы количество элементов было одинаково
- пройтись по всем элементам и сложить с учётом переноса

Сначала напишем функцию для выравнивания наших больших чисел.
```rust
fn align(&mut self, n: usize) {
    // получаем длину нашего вектора
    let curr_size = self.digit.len();
    // если меньше необходимой длины, то
    if curr_size < n {
        // инициализируем вектор с нулями длины `n - curr_size`
        let mut tmp = vec![0; n - curr_size];
        // и добавляем в конец нашего вектора
        self.digit.append(&mut tmp);
    }
}
```

Не забываем что этот метод находится в блоке *impl BigUInt*.

Теперь перейдём к оператору сложения
```rust
use std::ops::Add;

impl Add for BigUInt {
    type Output = Self;

    // не забываем про mut, т.к. функция align изменяет наши значения
    fn add(mut self, mut other: Self) -> Self {
        // результирующий вектор
        let mut value: Vec<u8> = Vec::new();
        // значение переноса
        let mut carry = 0;

        // выравниваем вектора по большему
        let m_len = self.digit.len().max(other.digit.len());
        self.align(m_len);
        other.align(m_len);

        // складываем значения с помощью упаковки двух итераторов
        for (a, b) in self.digit.iter().zip(other.digit.iter()) {
            // сумма двух цифр + перенос
            carry += a + b;
            // добавляем в вектор только остаток от деления
            value.push(carry % 10);
            // а перенос идёт дальше
            carry /= 10;
        }
        // добавляем значение переноса, если он не ноль
        if carry != 0 {
            value.push(carry);
        }

        // Ура, готово!
        BigUInt::from_vec(value)
    }
}
```

Я знаю что это не лучший вариант, но он прост в реализации и понятен.

Вроде всё готово! Так давайте сложим два больших числа!
```rust
fn main() {
    let a = big_vec![4, 5, 9, 4, 5, 7, 3, 9, 5, 3, 9, 5, 9, 4, 5, 2, 4, 4, 9, 3, 7, 4, 9];
    let b = big_vec![2, 3, 1, 2, 4, 4, 0, 7, 3, 5, 0, 9, 0, 5, 5, 1];
    println!("a = {}", a);
    println!("b = {}", b);
    let c = a + b;
    println!("c = {}", c);
}
```

А теперь скомпилируем и запустим
```rust
$ rustc demo.rs
error[E0277]: `BigUInt` doesn't implement `std::fmt::Display`
  --> demo.rs:79:24
   |
79 |     println!("a = {}", a);
   |                        ^ `BigUInt` cannot be formatted with the default formatter
   |
   = help: the trait `std::fmt::Display` is not implemented for `BigUInt`
   = note: in format strings you may be able to use `{:?}` (or {:#?} for pretty-print) instead
   = note: required by `std::fmt::Display::fmt`

error[E0277]: `BigUInt` doesn't implement `std::fmt::Display`
  --> demo.rs:80:24
   |
80 |     println!("b = {}", b);
   |                        ^ `BigUInt` cannot be formatted with the default formatter
   |
   = help: the trait `std::fmt::Display` is not implemented for `BigUInt`
   = note: in format strings you may be able to use `{:?}` (or {:#?} for pretty-print) instead
   = note: required by `std::fmt::Display::fmt`

error[E0277]: `BigUInt` doesn't implement `std::fmt::Display`
  --> demo.rs:82:24
   |
82 |     println!("c = {}", c);
   |                        ^ `BigUInt` cannot be formatted with the default formatter
   |
   = help: the trait `std::fmt::Display` is not implemented for `BigUInt`
   = note: in format strings you may be able to use `{:?}` (or {:#?} for pretty-print) instead
   = note: required by `std::fmt::Display::fmt`

error: aborting due to 3 previous errors

For more information about this error, try `rustc --explain E0277`.
```

[Ой-ёй](https://coub.com/view/shv6v), кто-то забыл реализовать трейт *Display* для нашего типа.
```rust
use std::fmt;

impl fmt::Display for BigUInt {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            self.digit
                .iter()
                // числа лежат в обратном порядке
                .rev()
                // простое преобразование из u8 в char для цифр
                .map(|&x| (x + 0x30) as char)
                .collect::<String>()
        )
    }
}
```

Ну, а теперь соберём и проверим с помощью *python*
```bash
$ rustc demo.rs
$ ./demo
a = 45945739539594524493749
b = 2312440735090551
c = 45945741852035259584300
$ python
Python 3.8.1 (default, Jan 22 2020, 06:38:00)
[GCC 9.2.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> a = 45945739539594524493749
>>> b = 2312440735090551
>>> c = 45945741852035259584300
>>> a + b == c
True
```

Вроде всё хорошо. Давайте перейдём к основной задаче.

# Функция расчёт чисел Фибоначчи
Напишем наивную реализацию, а потом сделаем небольшие улучшения.

```rust
fn fib(n: usize) -> BigUInt {
    let mut f0 = big_vec![0];
    let mut f1 = big_vec![1];
    for _ in 0..n {
        let f2 = f0.clone() + f1.clone();
        f0 = f1.clone();
        f1 = f2.clone();
    }
    f0
}
```

В наивной реализации сразу бросается в глаза множество *.clone()*, что не есть хорошо.
Также когда мы создаём *f0* и *f1*, то мы делаем несколько ненужных операций *.reverse()*, что для *0* и *1* вообще не нужно.

Так давайте оптимизировать!

```rust
// добавим вспомогательные функции в BigUInt, чтобы не использовать big_vec!
impl BigUInt {
    fn zero() -> BigUInt {
        BigUInt { digit: vec![0] }
    }

    fn one() -> BigUInt {
        BigUInt { digit: vec![1] }
    }
}

fn fib(n: usize) -> BigUInt {
    let mut f0 = BigUInt::zero();
    let mut f1 = BigUInt::one();
    for _ in 0..n {
        // f0 нам не нужна, т.к. дальше мы её всё равно переопределяем
        let f2 = f0 + f1.clone();
        // спасибо за наводку из документации num-bigint
        // читай в доках, для лучшего понимания (`rustup doc --std std::mem::replace`)
        f0 = replace(&mut f1, f2);
    }
    f0
}
```

Уже лучше! На этом наша реализация готова, но давайте используем сторонний крейт, где работа с большими числами сделана более оптимально.

# Используем сторонний крейт
Не будем заострять внимание на отдельных частях, а сразу "нырнём" в код, который представлен [в документации крейта num-bigint](https://docs.rs/num-bigint/0.2.6/num_bigint/)
```rust
extern crate num_bigint;
extern crate num_traits;

use num_bigint::BigUint;
use num_traits::{One, Zero};
use std::mem::replace;

fn fib(n: usize) -> BigUint {
    // наш 0
    let mut f0: BigUint = Zero::zero();
    // и 1
    let mut f1: BigUint = One::one();
    // аналогичный цикл
    for _ in 0..n {
        let f2 = f0 + &f1;
        f0 = replace(&mut f1, f2);
    }
    f0
}
``` 

Не забудь добавить зависимости в **Cargo.toml**
```toml
[dependencies]
num-bigint = "*"
num-traits = "*"
```

Вот и всё, теперь можно перейти к тестам!

# Тесты
Все приложения были собраны с флагом *-C opt-level=3*, что соответствует 3-му уровню оптимизации кода.

На моей машине с процессором i5-8265U приложения выполняются за следующее время:
- неоптимальная реализация: **4.155387149s**
- реализация с небольшой оптимизацией: **3.987596324s**
- оптимизация *inplace*: **2.180896853s** (см. файл [my_biguint_inplace.rs](https://gist.github.com/FreeCX/34c6c7d63afbfe1aa4ab82f3470b4b35#file-my_biguint_inplace-rs)) 
- реализация через крейт *num-bigint*: **176.255462ms**

Информация для тех, кто захочет повторить:
- stable-x86_64-unknown-linux-gnu
- rustc 1.41.0 (5e1a79984 2020-01-27)
- cargo 1.41.0 (626f0f40e 2019-12-03)
- autocfg 1.0.0
- num-bigint 0.2.6
- num-integer 0.1.42
- num-traits 0.2.11

Для более точного замера предлагаю сделать не менее 10 тестов и посчитать всякие умные метрики.

Мы же ограничились выбором минимального времени из 10 тестов для каждого из примеров. 

Выводы думаю сделаете сами.

# Заключение
Вот так просто и незатейливо... А, это уже я писал. Короче вроде ничего сложного, а у нас уже есть простая реализация больших чисел.

Весь исходный код доступен по [ссылке](https://gist.github.com/FreeCX/34c6c7d63afbfe1aa4ab82f3470b4b35).
Если мне будет скучно, то я добавлю реализацию ещё на паре языков или оптимизирую текущий код.

На этом сегодня всё! Не страдайте фигнёй и надеюсь скоро увидимся... услышимся... учитаемся... Короче пока!

# Полезные ссылки
Сегодня их не будет, т.к. я ничего не читал для реализации, а хотя...

1. [num-bigint](https://docs.rs/num-bigint/0.2.6/num_bigint/)