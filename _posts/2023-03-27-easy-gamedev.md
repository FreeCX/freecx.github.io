---
title: Геймдев? Легко!
layout: post
---

Всем привет.

Я, как обычно, успешно забил на написание статей для блога. Ещё бы чуть-чуть и статья бы ровно вышла через год от предыдущей.

Но не будем впустую разглагольствовать и перейдём непосредственно к самой статье.

# Введение
Сегодня я хочу приоткрыть форточку в геймдев и сделаю это через реализацию простой демки на [Godot][godot].

С каждым годом вкатиться в геймдев становиться всё проще и проще… нужно всего-то поступить на курс геймдев разра… блин, не тот текст. Но вообще вход в игровую разработку и правда стал довольно простым делом.

Если вы думаете что в этой статье будет много картинок и я буду в интерфейсе перетаскивать ноды, то для вас у меня плохая новость — будем делать всё кодом!

Я бы не был собой, если бы начал пихать кучу картинок в статью о программировании, если это конечно не статья про генерацию картинок. 

Поэтому в статье будет не совсем классический подход к разработке на Godot, а точнее на [GDScript][gdscript].

Погнали!

# Идея
Надеюсь вы немного уже почитали про [сам движок][godot] и заглянули в [документацию][docs] к нему, но если нет, то можете посмотреть [вот это видео][creeps]. Больше информации о разработке на движке можете найти на [вот этой странице][community].

Вообще я бы посоветовал бы почитать [best practices][best], перед началом разработки своей игры, но в нашем случае мы обойдёмся только информацией по [API движка][api].

Демка у нас будет простая — соберём стену из кубиков и будем в неё стрелять другим кубиком. 

Давайте сначала обрисуем общий план, а потом пойдём писать код.

План на демку у нас следующий:
1. создать границы игрового мира
2. расставить кубы
3. расставить свет
4. поставить камеру
5. добавить интерактив
6. ...
7. PROFIT?

# Реализация
Итак проект создан и мы имеем базовую 3d сцену с головной нодой. Нужно только прикрепить скрипт к головной ноде и можно начинать.

И нас тут же встречает базовый код
```gdscript
# наследуемся от базовой ноды для 3D
extends Node3D

# начальная инициализация
func _ready():
	pass

# обработка логики зависящей от времени
func _process(delta):
	pass
```

Сначала опишем наше верхнеуровневое представление, а далее будем постепенно реализовывать недостающие куски кода.
```gdscript
func _ready():
	# очистка сцены от текущих объектов
	for n in get_children():
		remove_child(n)
		n.queue_free()
	# добавляем пол
	add_floor()
	# добавляем стену из кубов
	add_box_wall()
	# добавляем камеру
	add_camera()
	# добавляем свет
	add_light()
```

Цикл, в начале кода используется для очистки сцены от уже созданных нод.

Чуть позже мы сможем его вызывать по нажатию клавиши и он будет использован для перезапуска демки.

Пойдём по порядку и будем реализовывать недостающие части и первый из них — пол
```gdscript
# функция создания текстуры checker (гугли что за текстура такая)
func create_checker_texture() -> ImageTexture:
	# создаём наш холст
	var image = Image.create(512, 512, false, Image.FORMAT_RGBA8)
	# заливаем его в чёрный цвет
	image.fill(Color.BLACK)
	# закрашиваем два квадрата белым цветом
	image.fill_rect(Rect2i(0, 0, 256, 256), Color.WHITE)
	image.fill_rect(Rect2i(256, 256, 256, 256), Color.WHITE)
	# генерим из картинки текстуру
	return ImageTexture.create_from_image(image)


func add_floor():
	# создадим материал для нашего пола
	var floor_material = StandardMaterial3D.new()
	# альбедо - основной цвет
	floor_material.albedo_texture = create_checker_texture()
	# и увеличим число повторений текстуры
	floor_material.uv1_scale = 20 * Vector3(1, 1, 0)
	
	# создадим меш нашего пола в виде плоскости
	var floor_mesh = PlaneMesh.new()
	# добавим к нему ранее созданный материал
	floor_mesh.material = floor_material
	
	# и завернём наш меш в MeshInstance
	var floor_mesh_inst = MeshInstance3D.new()
	# сюда масштаб меша запишем
	floor_mesh_inst.scale = Vector3(3, 3, 3)
	# и сам меш
	floor_mesh_inst.mesh = floor_mesh
	
	# создадим ноду определения коллизии
	var floor_collision = CollisionShape3D.new()
	# и выставим форму коллизии в виде бесконечной плоскости
	floor_collision.shape = WorldBoundaryShape3D.new()
	
	# теперь же остаётся создать статический объект
	var floor_obj = StaticBody3D.new()
	# добавить в него ноду коллизии
	floor_obj.add_child(floor_collision)
	# меш
	floor_obj.add_child(floor_mesh_inst)
	
	# и можно добавлять на сцену
	add_child(floor_obj)
```

Если на данном этапе попробовать запустить демку, то мы ничего не увидим, а всё из-за того что у нас отсутствует виртуальная камера.

Добавим же её
```gdscript
func add_camera():
	# создаём ноду самой камеры
	var cam = Camera3D.new()
	# делаем камеру главной
	cam.make_current()
	# добавляем на сцену
	add_child(cam)
```

Теперь же можно даже запустить и посмотреть что у нас получилось, если конечно не забыть закомментировать отсутствующие функции.

Конечно на вид так себе, но уже что-то работающее.

Внесём немного света в эту мрачную атмосферу добавив пару источников
```gdscript
func add_light():
	# обойдёмся несколькими неподвижными источниками света
	add_child(create_light(Vector3(-1.5, 1, 2)))
	add_child(create_light(Vector3(1.5, 1, 2)))

# вспомогательная функцию для определения одного источника света
func create_light(pos: Vector3) -> Light3D:
	# создаём источник света
	var object = OmniLight3D.new()
	# выставляем позицию
	object.position = pos
	# включаем поддержку теней
	object.shadow_enabled = true
	return object
```

Не забудьте раскомментировать вызывающий код чтобы увидеть изменения.

Остаётся определить функцию ответственную за создание стены из кубов и демка готова.
```gdscript
func add_box_wall():
	# немного констант для определения параметров стены
	const x_count: int = 42
	const y_count: int = 10
	const start: Vector3 = Vector3(-2, 0, 0)
	const shift: Vector3 = Vector3(0.1, 0.1, 0.1)
	const color: Color = Color.BURLYWOOD
	
	var p = Vector3.ZERO
	# будем создавать коробки рядами
	for y in range(y_count):
		# выставим начально положение коробки по x
		p.x = start.x + (shift.x * 0.1)
		for x in range(x_count):
			# добавим созданную коробку сразу на сцену
			add_child(create_box(p, shift, color))
			# увеличим позицию по x
			p.x = start.x + shift.x * x
		# а после окончания цикла - по y
		p.y += shift.y * 1.01

# вспомогательная функция создания одно куба
func create_box(pos: Vector3, size: Vector3, color: Color):
	# создадим стандартный материал
	var box_material = StandardMaterial3D.new()
	# и зададим только цвет
	box_material.albedo_color = color
	
	# создадим меш коробки
	var box_mesh = BoxMesh.new()
	# и присвоим ему ранее созданный материал
	box_mesh.material = box_material
	
	# создадим MeshInstance
	var box_mesh_inst = MeshInstance3D.new()
	# поместим в него меш коробки
	box_mesh_inst.mesh = box_mesh
	# и зададим масштаб
	box_mesh_inst.scale = size
	
	# создадим ноду определения коллизии
	var box_collision = CollisionShape3D.new()
	# и выставим для него форму коробки
	box_collision.shape = BoxShape3D.new()
	# и также зададим масштаб
	box_collision.scale = size
	
	# остаётся только создать твёрдое тело
	var box_obj = RigidBody3D.new()
	# выставим ему позицию на сцене
	box_obj.position = pos
	# добавить коллизию
	box_obj.add_child(box_collision)
	# и меш
	box_obj.add_child(box_mesh_inst)
	
	# и можно возращать готовый объект
	return box_obj
```

Почти всё готово, осталось только добавить выстрел кубом в сгенерированную стену.
```gdscript
# функция обработки пользовательского ввода
func _input(event):
	# будем обрабатывать только события от клавиатуры
	if event is InputEventKey:
		# не забудь забиндить действие shoot в Input Map на кнопку
		# Project -> Project Settings... -> Input Map
		if event.is_action_pressed("shoot"):
			# выстрел кубом
			bang()
		# и тут, кстати, можно добавить пересоздание сцены
		if event.is_action_released("reset"):
			_ready()

# вспомогательная функцию инициализация куба для стрельбы
func bang():
	# позиция куба будет в этих границах
	var xr = randf_range(-2, 2)
	# а размер куба будет в этих
	var size = randf_range(0.1, 0.4)
	# создаём наш куб
	var box = create_box(Vector3(xr, 0.8, -3), Vector3(size, size, size), Color.CRIMSON)
	# выставляем случайный угол поворота
	box.rotation_degrees = Vector3(randi_range(0, 360), randi_range(0, 360), randi_range(0, 360))
	# выставляем массу
	box.mass = 10
	# добавляем импульс к созданному кубу
	box.apply_impulse(Vector3(0, 0, 15))
	# добавляем на сцену
	add_child(box)
```

В принципе на этом можно было и закончить создание демки, так как по сути реализовали всё что задумывали, но мне кажется что как-то мало интерактива в нашей демке.

Давайте же добавим управление камерой, чтобы можно было наблюдать физику кубов с почти любого ракурса.

Для этого необходимо создать новый скрипт, я назвал его `rotator`, где определим вот это
```gdscript
extends Node3D
class_name Rotator


# наши любимые глобальные переменные
var _shift_angle: float = PI / 2
var _angle: float = 0
var _radius: float = 0


# конструктор
func _init(angle: int, radius: float, height: float):
	_radius = radius
	_angle = deg_to_rad(angle)
	position.y = height


# начальная инициализация
func _ready():
	rotate_xz(0)


# функция поворота камеры
func rotate_xz(delta: float):
	# увеличиваем наш угол (fmod - тоже самое что и %, но для float)
	_angle = fmod(_angle + delta, 2 * PI)
	# позиция камеры в зависимости от угла
	position.x = _radius * cos(_angle)
	position.z = _radius * sin(_angle)
	# и угол на который она повёрнута
	rotation.y = _shift_angle - _angle


# функция изменение радиуса
func increment_radius(delta: float):
	_radius += delta
	rotate_xz(0)

```

Этот код отвечает за расположение камеры на заданном расстоянии от центра.
Также он задаёт угол поворота камеры, чтобы она всегда смотрела в центр сцены.
Так сцена всегда будет попадать в объектив виртуальной камеры.

Теперь же остаётся немного изменить код, связанный с камерой
```gdscript
# значение на который будет изменяться угол/положение камеры
const dt: float = 0.1
# глобальный объект управляющий камерой
var camera: Rotator = null

func add_camera():
	# создаём ноду управляющую камерой
	camera = Rotator.new(90, 3, 1)
	# создаём ноду самой камеры
	var cam_obj = Camera3D.new()
	# делаем камеру главной
	cam_obj.make_current()
	# добавляем её к управляющему объекту
	camera.add_child(cam_obj)
	# добавляем на сцену
	add_child(camera)
```

Стоит уточнить, что `child` объект всегда наследует от родителя положение в пространстве и поворот на угол, что очень удобно в нашем случае.

Не забываем добавить обработку новых действий
```gdscript
func _input(event):
	# будем обрабатывать только события от клавиатуры
	if event is InputEventKey:
		# ... ранее определенный код ...

		# управление камерой
		if event.is_action("ui_left"):
			camera.rotate_xz(dt)
		if event.is_action("ui_right"):
			camera.rotate_xz(-dt)
		if event.is_action("ui_up"):
			camera.increment_radius(-dt)
		if event.is_action("ui_down"):
			camera.increment_radius(dt)
```

Последнее, чтобы я ещё добавил — экран подсказки со списком клавиш.
```gdscript
# глобальный объект для всплывающей подсказки
var splash: Panel = null

func _ready():
	# ... ранее определенный код ...
	# добавляем экран с информацией
	add_splash_screen()

# функция обработки пользовательского ввода
func _input(event):
	# будем обрабатывать только события от клавиатуры
	if event is InputEventKey:
		# ... ранее определенный код ...
		# открыть/закрыть подсказку по клавишам
		if event.is_action_pressed("splash"):
			splash.visible = !splash.visible

func add_splash_screen():
	# добавляем 2D ноду с полупрозрачной панелью
	splash = Panel.new()
	# определенного размера
	splash.set_size(Vector2(300, 200))
	# и располагаем её по центру экрана
	splash.set_anchors_and_offsets_preset(Control.PRESET_CENTER, Control.PRESET_MODE_KEEP_SIZE)
	
	# добавляем текст с подсказой
	var label = RichTextLabel.new()
	# выставляем размер
	label.set_size(Vector2(300, 150))
	# и добавляем сам текст в формате BBCode
	label.append_text(
		"""[p align=center][b]HELP MENU[/b]
[b][color=red]F1[/color][/b] show this help
[b][color=red]R[/color][/b] reset scene
[b][color=red]← →[/color][/b] rotate camera
[b][color=red]↑ ↓[/color][/b] move camera
[b][color=red]SPACE[/color][/b] shoot[/p]""")
	# центрируем текст
	label.set_anchors_and_offsets_preset(Control.PRESET_CENTER, Control.PRESET_MODE_KEEP_SIZE)

	splash.add_child(label)
	add_child(splash)
	
	# запустим таймер автоскрытия
	await get_tree().create_timer(3.0).timeout
	# этот код выполниться после срабатывания таймера
	splash.visible = false
```

Всё, демка готова!

# Заключение
Полный код доступен [в репозитории][godot-project].

Если интересен более классический подход к разработке игры на Godot, то посмотрите на проект [billiard-with-guns][game].
Хоть игра и собрана криво, но вполне себе рабочая.

Ладно, до следующего раза.

Всем пока!

# Полезные ссылки
1. [Godot][godot]
2. [Godot Docs][docs]
3. [GDScript][gdscript]
4. [FPS tutorial][fps]
5. [Create Your First Complete 3D Game with Godot][creeps]
6. [Tutorials and resources][community]
7. [Best practices][best]
8. [Class reference][api]
9. [Project source code][only-code]
10. [Billiard With Guns][game]

[godot]: https://godotengine.org/
[docs]: https://docs.godotengine.org/en/stable/
[gdscript]: https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/index.html
[fps]: https://docs.godotengine.org/en/3.2/tutorials/3d/fps_tutorial/index.html
[game]: https://github.com/FreeCX/billiard-with-guns
[creeps]: https://www.youtube.com/watch?v=YiE9tcoCfhE
[community]: https://docs.godotengine.org/en/stable/community/tutorials.html#doc-community-tutorials
[best]: https://docs.godotengine.org/en/stable/tutorials/best_practices/index.html
[api]: https://docs.godotengine.org/en/stable/classes/index.html
[only-code]: https://github.com/FreeCX/post-godot
