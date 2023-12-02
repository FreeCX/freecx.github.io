---
title: А не написать ли мне сервер?
layout: post
---

Всем привет.

“Недавно” мне пришла в голову довольная странная идея о реализации небольшого http сервера. Не знаю конечно зачем мне это было нужно, но разбираться в технологии, которые мы используем каждый день довольно интересно и познавательно.

Если вам это не очень интересно, то всегда можете сразу перейти [к коду][micro-http].

Вообще эта статья должна была выйти давным-давно, но мне было лень её дописывать.

# Введение
Я бы предложил для начала посмотреть статью [HTTP Server: Everything you need to know to Build a simple HTTP server from scratch][http-server-from-scratch], где неплохо описывается реализация с сервера нуля.

Но вообще, если хотите разобраться в тонкостях работы, то стоит обратиться к вот этому списку RFC, которые описывают реализацию **HTTP/1.1**:
- [RFC 7230][rfc-7230]
- [RFC 7231][rfc-7231]
- [RFC 7232][rfc-7232]
- [RFC 7233][rfc-7233]
- [RFC 7234][rfc-7234]
- [RFC 7235][rfc-7235]

Вообще я не ставил себе цель в полной поддержке RFC, да и вообще пошёл ленивым путём — реализовал только то, что было нужно для работы демо сайта.

Ладно, давайте уже закончим на этом введении и перейдём к написанию кода.

# Hello world
Для самой минимальной рабочей программы нужно несколько вещей:
- открыть порт и слушать его
- обработать входящий коннект
- сформировать ответ

Набросаем базовую часть кода
```rust
use std::net::{TcpListener, TcpStream};

fn handle_connection(stream: TcpStream) {
    todo!()
}

fn main() {
    // забьём на обработку ошибок
    let listener = TcpListener::bind(("127.0.0.1", 8000)).unwrap();
    // про flatten мне clippy подсказал
    for stream in listener.incoming().flatten() {
        handle_connection(stream);
    }
}
```

Базовый код накидали и теперь нужно написать обработчик __handle_connection__ и наш _Hello world_ готов!

Для его реализации нам необходимо произвести несколько действий:
1. считать заголовочную часть запроса
2. распарсить её
3. дочитать контент
4. и ответить по форме

Первую часть для удобства вынесем в отдельную функцию.
```rust
use std::io::Read;

// https://ru.wikipedia.org/wiki/Перевод_строки
// cr - возврат каретки (carriage return)
// lf - перевод строки (line feed)
fn read_until_crlf<R: Read>(r: &mut R) -> Option<String> {
    let mut buf = Vec::new();

    // будем читать входной поток по одному байту
    // это не эффективно, но без заморочек
    for b in r.bytes() {
        buf.push(b.ok()?);
        // и прервём чтение на двойном crlf
        if buf.ends_with(b"\r\n\r\n") {
            break;
        }
    }

    // естественно нам нужна строка для последующего парсинга
    String::from_utf8(buf).ok()
}
```

И теперь осталось только реализовать __handle_connection__
```rust
use std::collections::HashMap;
use std::io::{Write};

fn handle_connection(stream: TcpStream) {
    // читаем заголовок запроса
    let buffer = read_until_crlf(&mut stream).unwrap();

    let mut headers = HashMap::new();
    // парсим заголовок
    // первую строку просто пропускаем
    for line in buffer.split("\r\n").skip(1) {
        // игнорируем пустые строки
        if line.trim().is_empty() {
            continue;
        }
        // а остальные разделяем по шаблону
        let (key, value) = line.split_once(':').unwrap();
        // будем складывать ключи в нижнем регистре - чисто для удобства
        headers.insert(key.trim().to_lowercase(), value[1..].trim());
    }

    // дочитываем контент (если он есть)
    if headers.contains_key("content-length") {
        // узнаём размер контента
        let size: u64 = headers.get("content-length").unwrap().parse().unwrap();
        // заимствуем stream по ссылке
        let r = Read::by_ref(&mut stream);
        // пока читаем контент в никуда
        let _content: Vec<_> = r.take(size).bytes().collect();
    }

    // формируем ответ
    let hello_msg = "Hello World!";
    let hello_size = hello_msg.len();
    let _ = write!(
        stream,
        "HTTP/1.1 OK\r\n\
        host: 127.0.0.1:8000\r\n\
        server: micro-http/0.1\r\n\
        content-type: text/plain\r\n\
        content-length: {hello_size}\r\n\r\n\
        {hello_msg}"
    );
}
```

Всё, _Hello world_ готов к запуску. Можете смело проверять работу в браузере!

Увы, но обычным _Hello world_ сейчас уже никого не удивишь. Поэтому мы пойдём чуть дальше и реализуем небольшой интерактивный сайт.

И начнём со фронтенда.

# Фронтенд
Я не стал с ним сильно запариваться и сделал ультра бюджетную вёрстку. Особых подробностей тут от меня не ждите — всё-таки я не очень большой мастер фронта.

Так что просто смотрите вёрстку/код

### site/index.html
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- вся статика будет отдаваться бэком -->
  <link rel="stylesheet" type="text/css" href="/static/style.css"/>
  <link rel="shortcut icon" href="/static/favicon.ico" type="image/x-icon"/>
  <script src="/static/script.js"></script>
  <title>ГПСЧ</title>
</head>
<body>
  <div class="center">
    <h1>Генератор псевдослучайных чисел</h1>
    <div class="item">
      <!-- сюда будем выводить сгенерированное число -->
      <span class="current">&mdash;</span>
    </div>
    <div class="item">
      <label>от</label>
      <input id="min" type="number" value="1">
      <label>до</label>
      <input id="max" type="number" value="10">
    </div>
    <div class="item">
      <button onclick="process()">Сгенерировать</button>
    </div>
  </div>
</body>
</html>
```

### site/static/style.css
```css
div.center {
    display: block;
    margin: auto;
    width: 50%;
    text-align: center;
}

div.item {
    margin: 2em auto 2em auto;
}

span.current {
    font-size: 100px;
    font-weight: bold;
}

label {
    font-size: 16px;
}

h1 {
    font-size: 24px;
    font-weight: normal;
}

input {
    font-size: 16px;
    max-width: 100px;
    text-align: center;
}

button {
    font-size: large;
    min-width: 200px;
    min-height: 50px;
}

```

### site/static/script.js
```js
function process() {
  fetch("/api/", {
    method: "POST",
    body: JSON.stringify({
      // будем указывать в каком диапазоне генерировать новое число
      min: document.querySelector("input[id=min]").value,
      max: document.querySelector("input[id=max]").value
    }),
    headers: {
      "Content-Type": "application/json"
    }
  })
  .then((response) => response.json())
  .then((json) => {
    // и забьём на обработку ошибок
    document.querySelector("span[class=current]").textContent = json.result;
  });
}
```

Как вы уже наверное поняли я выбрал в качестве демки генератор псевдослучайных чисел с генерацией на бэке.

На этом с фронтовой частью закончили.
Теперь переходим к __*мясу*__!

# Бэкенд
Реализованный __Hello world__ конечно нам поможет, но тут стоит очень сильно переработать весь интерфейс.

Код будем разделять на модули. Как и ранее пойдём от логики нашего приложения и постепенно будем заполнять пустоты.

### src/main.rs
```rust
// это наша библиотека
extern crate micro_http;

// с большим числом вспомогательных элементов
use micro_http::app::App;
use micro_http::file;
use micro_http::http::{Data, Method};
use micro_http::json::{self, SimpleJson};
use micro_http::random::Random;
use micro_http::status::StatusCode;

// наша апишечка
fn api(request: Data) -> Data {
    fn process(request: Data) -> Option<Data> {
        // если пришёл json
        let data = request.content.and_then(|c| json::deserialize(&c))?;
        // то получаем из него необходимые поля
        let minv = data.get("min").cloned().and_then(|d| d.parse().ok())?;
        let maxv = data.get("max").cloned().and_then(|d| d.parse().ok())?;

        // сгенерируем псевдослучайное число
        let result = Random::new().in_range(minv, maxv);

        // упакуем ответ в HashMap
        let mut data = SimpleJson::new();
        data.insert("result".to_string(), result.to_string());

        // сериализуем и отдаём
        Some(json::serialize(data))
    }

    match process(request) {
        Some(r) => r,
        // если есть любой косяк, то это Bad Request
        None => Data::from_status(StatusCode::BadRequest),
    }
}

fn main() {
    // инициализируем нашку апку
    let mut app = App::new("127.0.0.1", 8000);
    // забиндим index и будем отдавать по нему index.html
    app.bind("/", Method::GET, |_| file::response("./site/index.html"));
    // выделим роут для статики (css, js, ico)
    app.bind("/static/", Method::GET, |r| file::response(&format!("./site{}", r.url)));
    // роут для апишечки
    app.bind("/api/", Method::POST, api);
    // запускаем сервер
    app.run();
}
```

Теперь когда основа заложена, то стоит переходить к отдельным частям.

Давайте сразу их и обозначим:
- Роутинг запросов
- Многопоточная реализация
- Сериализация/десериализация json
- Обработка ошибок
- Генерация псевдослучайных чисел

Вообще для удобства сразу определим наши модули.

### src/lib.rs
```rust
pub mod app;
pub mod error;
pub mod file;
pub mod http;
pub mod json;
pub mod random;
pub mod read; // тут у нас until_crlf, ранее read_until_crlf
pub mod status;
```

Ну а теперь далее к реализации!

### src/error.rs
```rust
// вообще хорошим тоном будет определить модуль с ошибками
// хотя всегда есть такие крейты как anyhow и thiserror, которые упрощают обработку ошибок

use std::error;
use std::fmt;
use std::io;
use std::string;

// мы же тут определим всё вручную
#[derive(Debug)]
pub enum FrameworkError {
    // для операций с файлами
    Io(io::Error),
    // для парсинга строк
    Utf(string::FromUtf8Error),
    // Косяки парсинга заголовка
    HeaderParse,
    HeaderData,
}

// реализуем проброс ошибок необходимый при размотке, так как вложенность может быть любой
impl error::Error for FrameworkError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        match self {
            // эти вложенные
            FrameworkError::Io(e) => Some(e),
            FrameworkError::Utf(e) => Some(e),
            // а эти нет
            FrameworkError::HeaderParse => None,
            FrameworkError::HeaderData => None,
        }
    }
}

// человеко-читаемые ошибки
impl fmt::Display for FrameworkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FrameworkError::Io(e) => write!(f, "IO Error: {}", e),
            FrameworkError::Utf(e) => write!(f, "UTF8 Error: {}", e),
            FrameworkError::HeaderParse => write!(f, "Parse header error"),
            FrameworkError::HeaderData => write!(f, "Get data from header error"),
        }
    }
}

// и поддержка From (+ Into на халяву)
impl From<io::Error> for FrameworkError {
    fn from(e: io::Error) -> Self {
        Self::Io(e)
    }
}

impl From<string::FromUtf8Error> for FrameworkError {
    fn from(e: string::FromUtf8Error) -> Self {
        Self::Utf(e)
    }
}
```

### src/status.rs
```rust
use std::fmt;

// будем поддерживать только необходимые нам статусы
#[derive(Debug, Copy, Clone, PartialEq, Eq, Default)]
pub enum StatusCode {
    #[default]
    Ok = 200,
    BadRequest = 400,
    NotFound = 404,
    MethodNotAllowed = 405,
    ServerError = 500,
}

// и преобразование статуса в строку
impl fmt::Display for StatusCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use StatusCode::*;
        write!(
            f,
            "{} {}",
            *self as u16,
            match self {
                Ok => "OK",
                BadRequest => "Bad Request",
                NotFound => "Not Found",
                MethodNotAllowed => "Method Not Allowed",
                ServerError => "Internal Server Error",
            }
        )
    }
}
```

### src/http.rs
```rust
use std::fmt;
use std::{collections::HashMap, io::Read, net::SocketAddr};

use crate::error::FrameworkError;
use crate::read;
use crate::status::StatusCode;

// вообще методы могут быть любые, так как стандарт это разрешает
// но мы ограничимся только эти набором
#[derive(Eq, PartialEq, Copy, Clone, Debug, Default)]
pub enum Method {
    CONNECT,
    DELETE,
    GET,
    HEAD,
    OPTIONS,
    PATCH,
    POST,
    PUT,
    TRACE,
    // любые другие методы
    #[default]
    UNKNOWN,
}

#[derive(Default)]
pub struct Data {
    // тут вообще multi map должен быть, но как-то пофиг
    pub headers: HashMap<String, String>,
    pub content: Option<Vec<u8>>,
    pub addr: Option<SocketAddr>,
    pub url: String,
    pub method: Method,
    pub status_code: StatusCode,
}

impl Data {
    // немного вспомогательных методов
    pub fn new() -> Data {
        Data::default()
    }

    pub fn from_status(status: StatusCode) -> Data {
        Data { status_code: status, ..Default::default() }
    }

    pub fn from_content<M: Into<String>, C: Into<Vec<u8>>>(mime_type: M, content: C) -> Data {
        let mut data = Data::new();
        let content = content.into();
        data.add_header("content-type", mime_type.into());
        data.add_header("content-length", content.len());
        data.content = Some(content);
        data
    }

    // парсинг теперь идёт в два этапа
    pub fn parse<R: Read>(&mut self, r: &mut R) -> Result<(), FrameworkError> {
        self.parse_header(r)?;
        self.parse_content(r)?;
        Ok(())
    }

    pub fn add_header<K, V>(&mut self, key: K, value: V)
    where
        K: fmt::Display,
        V: fmt::Display,
    {
        // все ключи будут в нижнем регистре
        self.headers.insert(key.to_string().to_lowercase(), value.to_string());
    }

    // парсинг заголовка, который ранее уже описывал
    // тут только добавилась обработка ошибок
    fn parse_header<R: Read>(&mut self, r: &mut R) -> Result<(), FrameworkError> {
        let buffer = read::until_crlf(r)?;
        let mut iterator = buffer.split("\r\n");

        let header: Vec<_> = iterator.next().ok_or(FrameworkError::HeaderParse)?.split(' ').collect();
        self.method = Method::from(header[0]);
        self.url = header[1].to_string();

        for line in iterator {
            if line.trim().is_empty() {
                continue;
            }
            let (key, value) = line.split_once(':').ok_or(FrameworkError::HeaderParse)?;
            self.add_header(key.trim(), value[1..].trim());
        }

        Ok(())
    }

    // и парсинг контента, если нужно
    fn parse_content<R: Read>(&mut self, r: &mut R) -> Result<(), FrameworkError> {
        if self.headers.contains_key("content-length") {
            let size: u64 = self
                .headers
                .get("content-length")
                .ok_or(FrameworkError::HeaderData)?
                .parse()
                .map_err(|_| FrameworkError::HeaderData)?;
            let mut content = String::with_capacity(size as usize);
            let r = Read::by_ref(r);
            let _ = r.take(size).read_to_string(&mut content);
            self.content = Some(content.into());
        }
        Ok(())
    }

    // также не забываем про сериализацию заголовка для ответа
    pub fn render_headers(&self) -> String {
        let mut buf = String::new();
        for (k, v) in &self.headers {
            buf.push_str(&format!("{k}: {v}\r\n"));
        }
        buf
    }
}

// парсинг метода, лодку мне!
impl From<&str> for Method {
    fn from(value: &str) -> Self {
        use Method::*;
        match value {
            "CONNECT" => CONNECT,
            "DELETE" => DELETE,
            "GET" => GET,
            "HEAD" => HEAD,
            "OPTIONS" => OPTIONS,
            "PATCH" => PATCH,
            "POST" => POST,
            "PUT" => PUT,
            "TRACE" => TRACE,
            _ => UNKNOWN,
        }
    }
}
```

### src/app.rs
```rust
use std::io::Write;
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::{Duration, SystemTime};

use crate::error::FrameworkError;
use crate::http::{Data, Method};
use crate::status::StatusCode;

// чуток упрощаем себе жизнь определяя псевдоним
type RouteFunc = fn(Data) -> Data;

// структура для хранения наших роутов
#[derive(Clone)]
struct Route {
    url: String,
    method: Method,
    func: RouteFunc,
}

// и самого приложения
#[derive(Clone)]
pub struct App {
    host: String,
    port: u16,
    routes: Vec<Route>,
}

impl App {
    pub fn new(host: &str, port: u16) -> App {
        App { routes: Vec::new(), host: host.to_string(), port }
    }

    // просто собираем роуты в список
    pub fn bind(&mut self, url: &str, method: Method, func: RouteFunc) {
        self.routes.push(Route { url: url.to_string(), method, func })
    }

    // а вот тут уже идёт сам роутинг
    fn route(&self, url: &str, method: Method) -> Option<&Route> {
        // длина общих частей между двумя строками
        fn sublength(text: &str, subtext: &str) -> usize {
            text.chars().zip(subtext.chars()).take_while(|(a, b)| a == b).count()
        }

        let mut founded = None;
        let mut max_len = 0;

        // ищем подходящий роут, который совпадает с запрашиваемым
        // ориентируемся на максимальную длину общей части
        for route in &self.routes {
            if route.method == method && url.starts_with(&route.url) {
                let curr_len = sublength(&route.url, url);
                if curr_len > max_len {
                    founded = Some(route);
                    max_len = curr_len;
                }
            }
        }

        founded
    }

    // обработчик входящий соединений
    fn handle_client(&self, mut stream: TcpStream) -> Result<(), FrameworkError> {
        // немного логгинга
        if let Ok(addr) = stream.peer_addr() {
            println!(">>> incoming connection from {}:{}", addr.ip(), addr.port());
        }

        // у нас коннект будет жить 5 секунд
        let connection_start = SystemTime::now();
        stream.set_read_timeout(Some(Duration::from_secs(5)))?;
        stream.set_write_timeout(Some(Duration::from_secs(5)))?;

        loop {
            // прошло больше 5 секунд?
            let elapsed = connection_start.elapsed().unwrap_or(Duration::from_secs(5));
            if elapsed >= Duration::from_secs(5) {
                break;
            }

            // парсим запрос
            let mut request = Data::new();
            request.addr = stream.peer_addr().ok();
            request.parse(&mut stream)?;

            // нам нужен флаг Keep-Alive, чтобы в конце решить стоит ли закрывать соединение?
            let keep_alive = request.headers.get("connection").map(|t| t == "keep-alive").unwrap_or(false);

            // ещё немного логгинга
            println!(">>> {:?} {}\n{}", request.method, request.url, request.render_headers());

            let mut response = self
                // ищем роут
                .route(&request.url, request.method)
                // и вызываем обработчик
                .map(|r| (r.func)(request))
                // или ошибка
                .unwrap_or(Data::from_status(StatusCode::NotFound));

            // и далее формируем заголовок ответа
            response.add_header("host", format!("{}:{}", self.host, self.port));
            response.add_header("server", "micro-http/0.1");
            if keep_alive {
                response.add_header("connection", "keep-alive");
            }

            println!("<<< HTTP/1.1 {}\n{}", response.status_code, response.render_headers());
            write!(stream, "HTTP/1.1 {}\r\n{}\r\n", response.status_code, response.render_headers())?;
            // контент пишем, если нужно
            if let Some(content) = response.content {
                stream.write_all(content.as_slice())?;
            }

            // ну тут очевидно
            if !keep_alive {
                break;
            }
        }

        println!("--- end of connection ---");

        Ok(())
    }

    // тут бы ограничение на число потоков :)
    pub fn run(&self) -> Option<()> {
        let addr = format!("{}:{}", self.host, self.port);

        let listener = TcpListener::bind(&addr).ok()?;
        println!(">>> run server @ {addr}");

        for stream in listener.incoming().flatten() {
            // будем создавать на каждый коннект новый поток
            let app_clone = self.clone();
            thread::spawn(move || {
                if let Some(err) = app_clone.handle_client(stream).err() {
                    // если что-то мы не обработали, то увидим это в логе
                    println!("!!! thread was stopped: {err}");
                }
            });
        }

        Some(())
    }
}
```

В идеале, в методе `run`, стоило бы реализовать work-stealing очередь, но для этого нужно использовать библиотеку [crossbeam][crossbeam], или писать свою реализацию очереди.

В данной статье обойдёмся текущей кривой реализацией многопоточности.

### src/json.rs
```rust
use std::collections::HashMap;

use crate::http::Data;

// как это спасает от длинных определений
pub type SimpleJson = HashMap<String, String>;

// easy сериализация json
pub fn serialize(data: SimpleJson) -> Data {
    // просто собери ключи и значения в формате
    //  "key": "value"
    // и заджойни их запятыми
    let mut content = data.into_iter().map(|(k, v)| format!("\"{k}\":\"{v}\"")).collect::<Vec<String>>().join(",");
    // и приправь это скобочками )))
    content.insert(0, '{');
    content.push('}');

    Data::from_content("application/json", content)
}

// а вот десериализация - уже сложнее
pub fn deserialize(data: &[u8]) -> Option<SimpleJson> {
    let mut result = SimpleJson::new();

    // так как контент запроса у нас в байтах, то необходимо его сначала преобразовать в строку
    let data = String::from_utf8(data.to_vec()).ok()?;
    // так как мы не поддерживаем вложенность, то можно поступить следующим образом
    // удаляем скобочки ((( и дальше режем строки по запятым
    for item in data.replace(['{', '}'], " ").split(',') {
        // нужно только разделить ключ и значение
        let (key, value) = item.split_once(':')?;
        // удалить всё лишнее
        let key = key.replace('"', " ").trim().to_string();
        let value = value[1..].replace('"', " ").trim().to_string();
        // и запихнуть в словарь
        result.insert(key, value);
    }

    Some(result)
}
```

### src/random.rs
```rust
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Default, Clone, Copy)]
pub struct Random {
    init: u32,
}

// в качестве ГПСЧ нам хватит простого xorshift
impl Random {
    pub fn new() -> Random {
        // в качестве seed будем использовать текущее время
        let since_epoch = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or(Duration::from_secs(42));
        Random { init: since_epoch.as_secs() as u32 }
    }

    // "магия" xorshift
    pub fn generate(&mut self) -> u32 {
        self.init ^= self.init << 13;
        self.init ^= self.init >> 17;
        self.init ^= self.init << 5;
        self.init
    }

    // генерация псевдослучайного числа в диапазоне
    pub fn in_range(&mut self, min: i32, max: i32) -> i32 {
        let value = self.generate() % (max - min).unsigned_abs();
        value as i32 + min
    }
}
```

### src/file.rs
```rust
use std::fs;

use crate::http::Data;
use crate::status::StatusCode;

fn detect_content_type(filename: &str) -> String {
    // в идеале тут нужно определять mime-type файла по его содержимому, но нам хватит такого варианта
    match filename.rsplit_once('.') {
        Some((_, "css")) => "text/css",
        Some((_, "html")) => "text/html",
        Some((_, "ico")) => "image/x-icon",
        Some((_, "js")) => "text/javascript",
        Some((_, "png")) => "image/x-png",
        // любые другие файлы будут считаться просто потоком байт
        _ => "application/octet-stream",
    }
    .to_string()
}

// формирование response из файла
pub fn response(filename: &str) -> Data {
    match fs::read(filename) {
        Ok(content) => Data::from_content(detect_content_type(filename), content),
        Err(_) => Data::from_status(StatusCode::NotFound),
    }
}

```

И вот теперь можно запускать и наслаждаться нашим небольшим http сервером!

Не забываем что он доступен на [127.0.0.1:8000](http://127.0.0.1:8000/).

# Заключение
Тут должны быть какие-то выводы, но их не будет.

Всем пока!

# Полезные ссылки
- [MicroHttp][micro-http]
- [HTTP Server: Everything you need to know to Build a simple HTTP server from scratch][http-server-from-scratch]
- RFC [7230][rfc-7230], [7231][rfc-7231], [7232][rfc-7232], [7233][rfc-7233], [7234][rfc-7234], [7235][rfc-7235]
- [crossbeam][crossbeam]
- [anyhow][anyhow] и [thiserror][thiserror]
- [Xorshift][xorshift]
- [Xorshift RNGs][xorshift-rng]

[xorshift]: https://en.wikipedia.org/wiki/Xorshift
[xorshift-rng]: https://www.jstatsoft.org/article/view/v008i14
[micro-http]: https://github.com/FreeCX/micro-http
[http-server-from-scratch]: https://medium.com/from-the-scratch/http-server-what-do-you-need-to-know-to-build-a-simple-http-server-from-scratch-d1ef8945e4fa
[rfc-7230]: https://www.rfc-editor.org/info/rfc7230
[rfc-7231]: https://www.rfc-editor.org/info/rfc7231
[rfc-7232]: https://www.rfc-editor.org/info/rfc7232
[rfc-7233]: https://www.rfc-editor.org/info/rfc7233
[rfc-7234]: https://www.rfc-editor.org/info/rfc7234
[rfc-7235]: https://www.rfc-editor.org/info/rfc7235
[crossbeam]: https://crates.io/crates/crossbeam
[anyhow]: https://crates.io/crates/anyhow
[thiserror]: https://crates.io/crates/thiserror
