---
title: Имитируем git репозиторий
layout: post
---

Давайте сегодня сделаем кое-что интересно, а именно фейковый git репозиторий на python.

Сначала нужно разобрать немного теории, чтобы понять как работает git, хоть и в упрощенном виде.

На истину в последней инстанции не претендую. Лучше обратитесь к правильному описанию работы в книжке Pro Git или исходниках.

Погнали!

# Начинаем ковырять работу git
Если вы читали мою прошлую [статью](https://freecx.github.io/blog/2020/09/04/simple-git-server) и проверяли работу, то могли увидеть какие запросы делает git, чтобы получить репозиторий.

Но если не читали или не делали, то вот вам оно
```bash
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/info/refs?service=git-upload-pack HTTP/1.1" 200 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/HEAD HTTP/1.1" 200 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] code 404, message File not found
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/e2/9a0f6430889930005e6d3494e905aee019d4b5 HTTP/1.1" 404 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] code 404, message File not found
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/4f/2682ed22e139c2ccebe11705ccd49bf0b90c0b HTTP/1.1" 404 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] code 404, message File not found
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] code 404, message File not found
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/9b/7de41f6a27f7a3c7d3539ba4bc1fbb2e852f4a HTTP/1.1" 404 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/5d/2ef7493690f6248a55c5657a23e5c25514240c HTTP/1.1" 404 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] code 404, message File not found
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/info/http-alternates HTTP/1.1" 404 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] code 404, message File not found
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/info/alternates HTTP/1.1" 404 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/info/packs HTTP/1.1" 200 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/pack/pack-34100ba6403aebd2e96fa73c67bce942b18a6264.idx HTTP/1.1" 200 -
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/objects/pack/pack-34100ba6403aebd2e96fa73c67bce942b18a6264.pack HTTP/1.1" 200 -
```

Давайте же рассмотрим всё по порядку что здесь и как.

```bash
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/info/refs?service=git-upload-pack HTTP/1.1" 200 -
```

Здесь git запрашивает инфу по репозиторию, а именно коммиты указывающие на ветки в репозитории.

В данном же примере этот файл содержит следующее:
```
5d2ef7493690f6248a55c5657a23e5c25514240c    refs/heads/gh-pages
e29a0f6430889930005e6d3494e905aee019d4b5    refs/heads/master
4f2682ed22e139c2ccebe11705ccd49bf0b90c0b    refs/heads/release-update
9b7de41f6a27f7a3c7d3539ba4bc1fbb2e852f4a    refs/tags/v0.1.1
5054987a06ee024f3d9ddd15d3cde1a3e9da7a10    refs/tags/v0.1.1^{}
```

Далее git хочет узнать какая ветка является главной и делает запрос к `HEAD`
```bash
127.0.0.1 - - [XX/Yyy/ZZZZ AA:BB:CC] "GET /tini.git/HEAD HTTP/1.1" 200 -
```

Файл `HEAD` же содержит только ссылку на master ветку
```
ref: refs/heads/master
```

Дальше git начинает выкачивать объекты по хешам. Здесь можно заметить что таких объектов нет, т.к. у всех 404 ошибка.
Скорее всего из-за того что это bare репозиторий.

Можем немного схитрить и положить эти объекты в bare репозиторий, взяв их из основного. Просто скопируйте все папки (кроме `info` и `pack`) из репозитория в bare и обращение с клонированием репозитория сразу измениться.
```bash
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/info/refs?service=git-upload-pack HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/HEAD HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/e2/9a0f6430889930005e6d3494e905aee019d4b5 HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] code 404, message File not found
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/5d/2ef7493690f6248a55c5657a23e5c25514240c HTTP/1.1" 404 -
127.0.0.1 - - [05/Sep/2020 22:19:07] code 404, message File not found
127.0.0.1 - - [05/Sep/2020 22:19:07] code 404, message File not found
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/4f/2682ed22e139c2ccebe11705ccd49bf0b90c0b HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/info/http-alternates HTTP/1.1" 404 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/9b/7de41f6a27f7a3c7d3539ba4bc1fbb2e852f4a HTTP/1.1" 404 -
127.0.0.1 - - [05/Sep/2020 22:19:07] code 404, message File not found
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/info/alternates HTTP/1.1" 404 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/6a/3a45cbb1646758e8a0b5538633b3ee11cdca1b HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/dd/ec125ea25e4c9a556efd229d8efcaca8acd951 HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/info/packs HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/pack/pack-34100ba6403aebd2e96fa73c67bce942b18a6264.idx HTTP/1.1" 200 -
127.0.0.1 - - [05/Sep/2020 22:19:07] "GET /tini.git/objects/pack/pack-34100ba6403aebd2e96fa73c67bce942b18a6264.pack HTTP/1.1" 200 -
```

Но git всё равно обращается к объектам в директории `pack`, т.к. похоже не все объекты лежат так просто.

Для нашей реализации должно хватить эмуляции объектов по хешам.

Теперь с тем куда обращается git должно быть более-менее понятно, но встаёт вопрос: а что находиться в файлах с длинными именами (хэшами)?

Ну, вот например файл `/tini.git/objects/e2/9a0f6430889930005e6d3494e905aee019d4b5`
```bash
00000000  78 01 9d 8e 4d 6a c3 30  10 85 b3 d6 29 66 1f 08  |x...Mj.0....)f..|
00000010  92 e5 51 64 08 21 59 f5  10 a5 8b d1 cc b8 09 48  |..Qd.!Y........H|
00000020  91 71 e4 e2 de be 3a 43  e1 bd cd 07 ef 87 6b 29  |.q....:C......k)|
00000030  cf 06 03 9e 0f 6d 55 05  11 65 37 a0 52 f7 c8 13  |.....mU..e7.R...|
00000040  21 06 9d 65 18 26 89 3a  33 31 45 62 99 d0 99 85  |!..e.&.:31Eb....|
00000050  56 7d 35 08 e4 69 44 4e  c9 85 31 9c 31 6a 24 9b  |V}5..iDN..1.1j$.|
00000060  10 7d 0c de 27 af ea 1c  0b 93 4b 86 b6 f6 a8 2b  |.}..'.....K....+|
00000070  dc b3 ee fa 0b 1f 35 6f  49 7f e0 22 eb 69 ee bb  |......5oI..".i..|
00000080  bc df be 0b 3d f3 89 6b  b9 82 43 17 ac ed 1a e1  |....=..k..C.....|
00000090  68 bd b5 a6 d3 fe b2 e9  7f f3 e6 73 5b e4 0b 48  |h..........s[..H|
000000a0  04 74 a7 b2 64 7d c3 5c  b3 f4 c2 56 3b e2 bc 89  |.t..d}.\...V;...|
000000b0  9a 3f b1 aa 54 12                                 |.?..T.|
000000b6
```

Просто какие-то бинарные данные могли вы подумать и всгрустнуть.
Но не всё так плохо, данные просто пожаты.

Давайте же используем магию питона и получим реальную информацию!
```python
import zlib

c_data = open('~/tini.git/objects/e2/9a0f6430889930005e6d3494e905aee019d4b5', 'rb').read()
d_data = zlib.decompress(c_data)
print(d_data)
```

И получаем следующее
```
b'commit 257\x00tree ddec125ea25e4c9a556efd229d8efcaca8acd951\nparent 6a3a45cbb1646758e8a0b5538633b3ee11cdca1b\nauthor Alexey Golubev <email> 1516006004 +0300\ncommitter Alexey Golubev <email> 1516006004 +0300\n\n[upd] add examples folder to exclude\n'
```

Это уже интереснее, давайте я переформатирую вывод и расскажу что здесь что
```
(1) commit 257\x00
(2) tree ddec125ea25e4c9a556efd229d8efcaca8acd951\n
(3) parent 6a3a45cbb1646758e8a0b5538633b3ee11cdca1b\n
(4) author Alexey Golubev <email> 1516006004 +0300\n
(5) committer Alexey Golubev <email> 1516006004 +0300\n\n
(6) [upd] add examples folder to exclude\n
```

1. говорит нам что это объект типа `commit` с длинной сообщения в 257 символов (2-6)
2. указывает на коммит с деревом объектов репозитория
3. ссылка на родительский коммит (можно проигнорировать, если это первый коммит)
4. авто коммита и время коммита в timestamp формате + временная зона
5. тот, кто залил этот коммит + также время
6. сообщение коммита

Давайте теперь тогда перейдём к объекту `ddec125ea25e4c9a556efd229d8efcaca8acd951` и посмотрим что там (я сразу отформатирую вывод)
```
(1) tree 286\x00
(2) 100644 .gitignore\x00\xa9\xd3|V\x0cj\xb8\xd4\xaf\xbfG\xed\xa6C\xe8\xc4.\x85w\x16
100644 .travis.yml\x00\xf0\xa0\xee!\x8d\x18>\x85CrY{I\xe9\x1al\xb0\x8cx3
100644 Cargo.toml\x00\xc1%\x1b\x1d\xe3\xb4\x81\xab\xda\xe6v\x18\x87\x86\t?e\xe5\xfcw
100644 LICENSE\x00J\xf4\xb0R\xe8\x9c4=\x8c\x86\\\xd2\xbd\x14}U=v\xe9\xb2
100644 README.md\x00<\xfe\xac\xbe$\xc0\xf9C\x95[$\xeb\xd5T\xfb\xb3\x0e1l\x19
(3) 40000 examples\x00\xc5#\xa5\xb6 ~"\xff\x83\x8a\xea\xfe\x89\x13\xa2\x93W\xa7\x8e\x13
40000 scripts\x00\x8d\x8ac3\xaa\x15\xa7P?KN\x1f\xd1\xf3\xed\x19\xbd\xd1\x07\x15
40000 src\x00#\xe2vA\xb1(M\xe2\xf2\x00\x8c.\xb8\xaej\x8a\xe6\x19\x0f\xef
```

1. объект типа `tree` с данными на 286 символов
2. сначала права на файл, потом имя файла, а потом какие-то бинарные данные
3. аналогично, но это похоже на папку

Встаёт вопрос, что за бинарные данные. Давайте представим в более читаемом виде (hex)
```
a9d37c560c6ab8d4afbf47eda643e8c42e857716
```

О, а это уже похоже на хэш (коммит). Значит можно поискать этот файл в папке с объектами и посмотреть что там внутри.

Но быстро обламываемся, т.к. в репозитории нет такого файла `~/tini.git/objects/a9/d37c560c6ab8d4afbf47eda643e8c42e857716`.

Не беда, давайте возьмём другой файл, например `.travis.yml` и попытаем счастье с ним.
```
blob 351\x00
language: rust\n
rust:\n
... далее вывод опущен ...
```

Получаем новый тип данных - `blob`.

На этом моменте можно остановиться, т.к. для нашей задачи хватит этих объектов.

Но стоит обсудить ещё одну вешь - откуда берётся хэш объекта?
Всё просто - это sha1 от данных!

# Пилим фейк
Для реализации веб-сервера я будет достаточно `Flask` и пары стандартных библиотек.

Представлю сразу код с комментариями.
```python
# время нужно для коммита
from datetime import datetime as dt
# git использует sha1 для расчёта хэшей
from hashlib import sha1
# zlib для упаковки данных
import zlib

# и Flask для сервера
from flask import Flask, Response


app = Flask(__name__)

# вспомогательная функция для расчёта хэша
def hash(data):
    x = sha1(data)
    return x.digest(), x.hexdigest()


def generate_commit(tree, author, committer, msg):
    """функция для генерации коммита
        tree - хэш на tree объект
        author и commiter - очевидно
        msg - текст коммита
    """
    # получаем дату в нужном формате
    curr_date = f'{int(dt.now().timestamp())} +0000'
    # формируем сообщение
    data = f'tree {tree}\nauthor {author} {curr_date}\ncommitter {committer} {curr_date}\n\n{msg}\n'
    # всё сообщение с длинной + бинарный вид
    commit = f'commit {len(data)}\x00{data}'.encode()
    # нам нужен хэш от этого сообщения, чтобы на него можно было сделать ссылку
    _, h = hash(commit)
    return h, commit


# данная функция генерирует дерево из одного файла
def generate_tree(name, permission, file):
    """функция для генерации tree объекта
        name - имя файла
        permission - его права
        file - хэш указывающий на blob
    """
    # формируем данные по шаблону
    data = f'{permission} {name}\x00'.encode() + file
    tree = f'tree {len(data)}\x00'.encode() + data
    # получаем хэш
    _, h = hash(tree)
    return h, tree



def generate_blob(data):
    """функция для генерации blob`а
        data -- содержимое файла
    """
    blob = f'blob {len(data)}\x00{data}'.encode()
    # тут нам нужен хэш в двух видах
    d, h = hash(blob)
    return d, h, blob


# ссылка на мастер
head_ref = 'refs/heads/master'
# blob
blob_d, blob_hash, blob_data = generate_blob('Oh, Hi Mark!')
# tree ^
tree_hash, tree_data = generate_tree('README.md', '100644', blob_d)
# commit ^
commit_hash, commit_data = generate_commit(tree_hash, 'Your Dog <good-boi>', 'Your Cat <good-cat>', 'Hello there!')
# и собираем в словарь для удобства
data_by_hash = {
    blob_hash: blob_data,
    tree_hash: tree_data,
    commit_hash: commit_data
}

# фейк файла <repo-name>//info/refs?service=git-upload-pack
@app.route('/<path:repo>/<path:folder>/<path:file>', methods=['GET'])
def refs(repo, folder, file):
    if folder == 'info' and file.startswith('refs'):
        # возвращаем хэш коммита с указанием на то, что он master
        return f'{commit_hash}\t{head_ref}\n', 200
    else:
        return '', 400

# обработка HEAD файла
@app.route('/<path:repo>/HEAD', methods=['GET'])
def head(repo):
    # ссылка на master
    return f'ref: {head_ref}\n', 200

# обработка объектов
@app.route('/<path:repo>/<path:folder>/<path:f1>/<path:f2>', methods=['GET'])
def objects(repo, folder, f1, f2):
    # получаем объект по хэшу
    data = data_by_hash.get(f1 + f2)
    if data:
        # возвращаем сжатые данные
        return Response(zlib.compress(data), content_type='application/octet-stream')
    else:
        return '', 400
```

И этого хватит чтобы обдурить git. 

[Ссылка на исходник в gist](https://gist.github.com/FreeCX/bd672d3ddada072dcc79d426e95c3909)

# Результат
Теперь только остаётся только запустить наш фейковый сервер и успешно склонировать репозиторий
```bash
$ git clone http://localhost:5000/fake.git
```

# Что почитать
1. Я ничего не использовал, так что не будет ссылок
2. Иди нормальные книжки лучше почитай!