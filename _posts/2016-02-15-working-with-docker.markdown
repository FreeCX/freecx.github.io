---
type: post
title: Используем Docker
---

Сегодня мы немного поиграем с виртуализацией на уровне операционной системы с помощью **Docker**.

Для начала немного информации с [википедии](https://ru.wikipedia.org/wiki/Docker) для общего развития

> **Docker** -- программное обеспечение для автоматизации развёртывания и управления приложениями в среде 
> виртуализации на уровне операционной системы, например LXC. Позволяет «упаковать» приложение со всем его 
> окружением и зависимостями в контейнер, который может быть перенесён на любой Linux-системе с поддержкой 
> cgroups в ядре, а также предоставляет среду по управлению контейнерами.
>
> Разрабатывается и поддерживается одноимённой компанией-стартапом, распространяется как свободное 
> программное обеспечение под лицензией Apache 2.0. Написан на языке Go.

А теперь к делу!

### Установка

Для начала проверим версию установленного ядра

```shell
$ uname -r
```

Версия ядра должна быть не ниже 3.10, для того чтобы можно было использовать **Docker**.

В зависимости от используемого дистрибутива установка **Docker** выглядит по разному. Настоятельно рекомендую 
обратится [к официальному гиду](https://docs.docker.com/installation/#installation) по установке.

В моём случае установка под Arch Linux выполняется одной командой:

```shell
$ sudo pacman -S docker
```

Также вы можете установить **Docker** используя *sh* скрипт. Для загрузки скрипта потребуется *wget* или 
*curl*, или также можно использовать браузер.

```shell
$ wget -qO- https://get.docker.com/ > docker_install.sh
```

Теперь запустим установку (не забыв про sudo/su).

```shell
$ sudo sh docker_install.sh
```

После установки *желательно* добавить используемого пользователя в группу *docker*.

```shell
$ sudo gpasswd -a <user> docker
```

или

```shell
$ sudo usermod -aG docker <user>
```

На этом установка закончена. Запустим демон *docker* (в моём случае через *systemd*)

```shell
$ sudo systemctl start docker
```

и проверим работоспособность следующей командой

```shell
$ docker run hello-world
```

Если всё хорошо, то **Docker** скачает и запустит данный контейнер и программа выведет следующее

```shell
Hello from **Docker**.
This message shows that your installation appears to be working correctly.
To generate this message, **Docker** took the following steps:
 1. The **Docker** client contacted the **Docker** daemon.
 2. The **Docker** daemon pulled the "hello-world" image from the **Docker** Hub.
    (Assuming it was not already locally available.)
 3. The **Docker** daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The **Docker** daemon streamed that output to the **Docker** client, which sent it
    to your terminal.
To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash
For more examples and ideas, visit:
 http://docs.docker.com/userguide/
```

### Основные команды

Весь список доступных команд можно получить использую флаг *--help*

Рассмотрим только основные из них

* build -- используется для сборки контейнера (необходим конфигурационный файл Dockerfile)
* commit -- зафиксировать изменения произведённые в контейнере
* images -- возвращает список доступных образов-контейнеров для использования
* ps -- возвращает список контейнеров и их статусы
* pull -- стянуть образ из репозитория
* push -- протолкнуть образ в репозиторий
* restart -- перезапустить контейнер
* rm -- удалить один или более контейнер
* rmi -- удалить один или более образ контейнера
* run -- запустить команду в новом контейнере
* start -- запустить контейнер
* stop -- остановить контейнер

### Использование **Docker** на примерах

#### Запуск bash

Давайте сначала запустим простой контейнер с *bash* интерпретатором в нём и получим доступ к нему. 
Скачаем образ-контейнер *base/archlinux* для экспериментов.

```shell
$ docker pull base/archlinux
```

При вызове команды *images* получим что-то в виде:

```shell
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
base/archlinux      latest              dce0559daa1b        10 months ago       282.9 MB
```

Теперь у нас есть образ для создания контейнеров. Можно перейти непосредственно к запуску *bash* 
внутри контейнера. Делается это следующей командой

```shell
$ docker run -it --entrypoint /bin/bash base/archlinux
```

Используемые флаги

* -i -- включение интерактивного режима (для работы с STDIN)
* -t -- подключение псевдо-TTY (связь терминала контейнера с нашим терминалом)
* --entrypoint -- переопределяет точку входа для контейнера (в нашем случае *bash*)

В случае успеха **Docker** перенаправит нас на созданный tty внутри контейнера

```shell
[root@f64a7c5309f9 /] #
```

Здесь можно выполнять любые действия, а после зафиксировать изменения в контейнере. Но на текущий 
момент просто ограничимся запуском.

Для получения информации по запущенным контейнерам используйте флаг *ps*.

```shell
$ docker ps -a
CONTAINER ID        IMAGE                      COMMAND                CREATED             STATUS                   PORTS               NAMES
f64a7c5309f9        base/archlinux:latest      "/bin/bash"            2 minutes ago       Up 2 minutes                                 sleepy_bell
```

По умолчанию **Docker** сам выдаёт названиям созданным контейнерам. В нашем случае -- *sleepy_bell*, 
но их также можно задавать вручную используя флаг *--name*. Для выхода из контейнера используйте 
команду *exit*.

#### Запуск сайта
Рассмотрим более интересный случай, когда нужно собрать свой контейнер и подключить каталог к нему. 
Будем рассматривать развёртывание простого *flask* приложения на *python*. Все действия будем производить 
в текущем каталоге.

Содержимое файла *app/main.py*

```python
from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello World!"

if __name__ == "__main__":
    app.run(host='0.0.0.0')
```

Для создания своего контейнера создадим файл с конфигурацией -- *Dockerfile*, со следующим содержимым

```text
FROM base/archlinux
MAINTAINER dr.FreeCX <email>
RUN pacman -Sy && pacman -S python-flask python-pip --noconfirm
WORKDIR /app
EXPOSE 5000
VOLUME ["/app"]
CMD ["python", "/app/main.py"]
```

Рассмотрим файл построчно

* _FROM base/archlinux_ -- указывает на каком образе основывать новый образ-контейнер
* _MAINTAINER dr.FreeCX <email>_ -- указывает автора или сопровождающего этого контейнера
* _RUN pacman -Sy && pacman -S python-flask python-pip --noconfirm_ -- запускает в контейнере обновление 
и установку пакетов
* _WORKDIR /app_ -- указывает на рабочую директорию данного контейнера
* _EXPOSE 5000_ -- устанавливаем открываемый порт
* _VOLUME ["/app"]_ -- указывает на подключаемый пользовательский том
* _CMD ["python", "/app/main.py"]_ -- отвечает за запуск команды в контейнере 
(её можно переопределить используя флаг *--entrypoint* при запуске контейнера).

На третьем шаге команды объединены в одну для того чтобы не создавать лишние коммиты в создаваемом 
контейнере.

Теперь необходимо собрать данный контейнер, для этого используем команду *build*

```shell
$ docker build -t site-app .
```

Флаг *-t* отвечает за имя контейнера-образа (ну или tag) и точка в конце команды указывает на поиск 
файла *Dockerfile* в текущей директории.

Если всё прошло удачно, то увидим следующее

```text
Sending build context to Docker daemon 43.01 kB
Sending build context to Docker daemon 
Step 0 : FROM base/archlinux
 ---> dce0559daa1b
Step 1 : MAINTAINER dr.FreeCX <email>
 ---> Using cache
 ---> 64e04e1e920f
Step 2 : RUN pacman -Sy && pacman -S python-flask python-pip --noconfirm
 ---> Using cache
 ---> daa2e8f99de7
Step 3 : WORKDIR /app
 ---> Running in 85dd63b293ee
 ---> 578e66682a73
Removing intermediate container 85dd63b293ee
Step 4 : EXPOSE 5000
 ---> Running in 125baa973662
 ---> 12a28947863a
Removing intermediate container 125baa973662
Step 5 : VOLUME /app
 ---> Running in c54bedebe79f
 ---> c4807322f855
Removing intermediate container c54bedebe79f
Step 6 : CMD python /app/main.py
 ---> Running in fd472c20b3b3
 ---> 8163426a880f
Removing intermediate container fd472c20b3b3
Successfully built 8163426a880f
```

Выполнив команду *images* убедимся, что появился новый образ

```shell
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
site-app            latest              8163426a880f        3 minutes ago       411.5 MB
```

Теперь осталось самое интересное -- запуск нашего контейнера. Давайте же сделаем это

```shell
$ docker run -it -d -p 8080:5000 -v "$PWD/app":/app site-app
$ docker ps -a
CONTAINER ID        IMAGE                      COMMAND                CREATED             STATUS                      PORTS                    NAMES
1d3b134e4095        site-app:latest            "python /app/main.py   4 seconds ago       Up 2 seconds                0.0.0.0:8080->5000/tcp   focused_swartz
```

Используемые флаги

* -d -- запустить контейнер в фоне
* -p -- привязывает порт (на текущей машине 8080 к порту в контейнере 5000)
* -v -- подключает пользовательский том ("$PWD/app" на машине к "/app" в контейнере)

Как результат по адресу 0.0.0.0:8080 становится доступно *flask*-приложение.

Для остановки контейнера воспользуемся командой *stop* указав в качестве параметра имя либо *container id*

```shell
$ docker stop 1d3b134e4095
$ docker stop focused_swartz
```

### Пара слов о Docker compose

> Данный раздел находится в пассивном написани!

Теперь когда мы немного разобрались с docker'ом, давайте рассмотрим более интересную штуку, такую как *Вocker Сompose*!

Как говорит оффициальная документация

> Compose is a tool for defining and running multi-container Docker applications.

то есть это тулза с помощью которой можно собрать систему из нескольких связанных docker-контейнеров, что мы и сделаем!

#### Что будем ваять?
Давайте напишем web-приложение доску, где можно будет оставить комментарий. 

Для этого нам понадобится несколько компонентов:
- flask -- наш микрофреймворк
- postgresql -- наша БД
- nginx -- http-сервер

Конечно можно обойтись без nginx, но почему бы и нет?!

Структура нашего проекта будет следующей:

```shell
.
├── docker-compose.yml
├── .env
├── nginx
│   ├── Dockerfile
│   └── sites-enabled
│       └── flask_project
└── web
    ├── config.py
    ├── create_db.py
    ├── Dockerfile
    ├── main.py
    ├── requirements.txt
    └── templates
        └── index.html
```

Но начнём по порядку!

#### Приложение
Приложение будет реализовывать две функции:
- добавление данных в БД
- и отображение

`main.py`
```python
from flask import Flask, render_template, redirect, request
from werkzeug.contrib.fixers import ProxyFix
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# загрузим конфиг из файла
app.config.from_object('config')

# нужно для корректной работы проброса через gunicorn и nginx
app.wsgi_app = ProxyFix(app.wsgi_app)

# создаём объект БД
db = SQLAlchemy(app)


# наша таблица в БД
# где у нас будет два поля с информацией
class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # пользователь
    user = db.Column(db.String(16), nullable=False)
    # его текстовой пост
    text = db.Column(db.String(256))

    def __init__(self, user, text='<empty post>'):
        self.user = user
        self.text = text


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'GET':
        # получаем все посты
        posts = Post.query.all()
        # рендерим страницу с этими данными
        return render_template('index.html', posts=posts)
    elif request.method == 'POST':
        # получаем данные со страницы
        user, text = request.form['user-name'], request.form['user-text']
        # создаём пост
        new_post = Post(user, text)
        # добавляем в БД
        db.session.add(new_post)
        db.session.commit()
        # редиректим на страницу с GET
        return redirect('/')
    else:
        # не будем поддерживать остальные методы
        return 'Noooooooo!', 402


if __name__ == '__main__':
    app.run()
```

`config.py`
```python
from os import environ

SECRET_KEY = environ['SECRET_KEY']
DEBUG = environ['DEBUG']
DB_NAME = environ['DB_NAME']
DB_USER = environ['DB_USER']
DB_PASS = environ['DB_PASS']
DB_SERVICE = environ['DB_SERVICE']
DB_PORT = environ['DB_PORT']
SQLALCHEMY_DATABASE_URI = 'postgresql://{0}:{1}@{2}:{3}/{4}'.format(
    DB_USER, DB_PASS, DB_SERVICE, DB_PORT, DB_NAME
)
```

`create_db.py`
```python
from main import db


db.create_all()
db.session.commit()
```

`index.html`
```html
<!doctype html>
<title>simply dashboard</title>
<p>send a post</p>
<form name='add-user' method='POST' action='/'>
  <div class='user-name-input'>
    user: <input name='user-name' class='user-name' type='text' size=16>
    <input type='submit' value='send post'>
  </div>
  <div class='user-text-input'>
    text:<br><textarea name='user-text' style='width: 300px; height: 100px;'></textarea>
  </div>
</form>
<hr><p>Posts</p>
<ul>
  {% for post in posts %}
    <li>
      <div class='user' style='font-weight: bold;'>{{ post.user }}</div>
      <div class='post'>{{ post.text }}</div>
    </li>
  {% endfor %}
</ul>
```

`requirements.txt`
```text
flask==0.11.1
flask_sqlalchemy==2.1
gunicorn==19.6.0
psycopg2==2.6.2
```

`Dockerfile`
```text
FROM python:3.4-onbuild
```

#### nginx
`Dockerfile`
```text
FROM tutum/nginx
RUN rm /etc/nginx/sites-enabled/default
ADD sites-enabled/ /etc/nginx/sites-enabled
```

`flask_project`
```text
server {
    listen 5000;
    charset utf-8;

    access_log  /var/log/nginx/access.log;
    error_log  /var/log/nginx/error.log;

    client_max_body_size 32m;

    location / {
        proxy_set_header X-Forward-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        if (!-f $request_filename) {
            proxy_pass http://web:8000;
            break;
        }
    }
}
```

#### Конфиги Docker Compose
`.env`
```text
DEBUG=True
SECRET_KEY=its-my-super-secret-key-please-dont-forget-it
DB_NAME=postgres
DB_USER=postgres
DB_PASS=postgres
DB_SERVICE=postgres
DB_PORT=5432
```

`docker-compose.yml`
```yaml
web:
  restart: always
  build: ./web
  expose:
    - "8000"
  links:
    - postgres:postgres
  env_file: .env
  command: /usr/local/bin/gunicorn -w 2 -b :8000 main:app # --log-file /tmp/gunicorn.log

nginx:
  restart: always
  build: ./nginx/
  ports:
    - "5000:5000"
  volumes:
    - /www/static
  volumes_from:
    - web
  links:
    - web:web

data:
  restart: always
  image: postgres:latest
  volumes:
    - /var/lib/postgresql
  command: "true"

postgres:
  restart: always
  image: postgres:latest
  volumes_from:
    - data
  ports:
    - "5432:5432"
```

#### Финал
Собираем наши контейнеры
```shell
$ docker-compose build
```

Cоздаём таблицу в БД
```shell
$ docker-compose run web /usr/local/bin/python create_demo.py
```

И наконец поднимаем их
```shell
$ docker-compose up -d
```

Теперь можно открыть сам веб-сервис в браузере <http://localhost:5000>.

Для остановки работы контейнеров выполните следующую команду в директории с проектом
```bash
$ docker-compose stop
```

Исходный код всего проекта доступен в [репозитории](https://github.com/FreeCX/docker-compose-demo).

Вот и всё на сегодня.

## Полезные ссылки

[1] [Docker](https://www.docker.com/) -- оффициальный сайт.

[2] [Docker Hub](https://registry.hub.docker.com/) -- хранилище **Docker** контейнеров.

[3] [Docker Compose](https://docs.docker.com/compose/) -- работа с мультиконтейнерами.

[4] [Flask](http://flask.pocoo.org/) -- микрофреймворком для создания вебсайтов на языке Python.

[5] [PostgreSQL](https://www.postgresql.org) -- свободная объектно-реляционная система управления базами данных.
