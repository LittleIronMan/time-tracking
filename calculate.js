// На выходе должно быть: задача, дата начала, время выполнения

// Находим будние дни за этот промежуток времени. Включительно
const interval = {start: '1.07.2022', end: '31.07.2022'};

// Исключаем праздники
const holidays = [
	// первомай
	'01.05.2022',
	'02.05.2022',
	'03.05.2022',
	// 9 мая
	'07.05.2022',
	'08.05.2022',
	'09.05.2022',
	'10.05.2022',

	// Бессонница
	'13.07.2022',
	'14.07.2022',
	'15.07.2022',
	'16.07.2022',
	'17.07.2022',
	'18.07.2022',
	'19.07.2022',
];

// Распределяем время задачам исходя из их сложности. Сложность указывается в степени двойки
// Думаю что проще будет посмотреть по истории коммитов. Уверен что в gitlab'е так можно
const tasks_may = {
	// NSUUIWEB-249 Лимиты в числовых input'ах в формах Survey FlightElement'ов
	// NSUUIWEB-249 wip попытка устранить "моргание" величины в полях ввода
	// NSUUIWEB-249 убрал throttle'ы
	'NSUUIWEB-249': 3,
	// NSUUIWEB-304 Правки, связанные с конфликтами i18n, починил переключение языков
	// Исправил загрузку выбранной локали
	// Перенес ReduxProvider из index.tsx в App.tsx
	// Добавил префикс "saga_" к саговым экшенам/редьюсерам, чтобы проще было в отладке
	'NSUUIWEB-304': 2, // NSUUIWEB-304 Починил кнопку "сохранить" в настройках
	// NSUUIWEB-335 wip
	// NSUUIWEB-335 Написал первый тест, который фейлится
	'NSUUIWEB-335': 4,
	'NSUUIWEB-338': 1, // NSUUIWEB-338 Хотфикс, в cesium модуле добавил дополнительную проверку в метод flyTo2dCameraPosition
	// NSUUIWEB-340 Сделать <Select> компонент подконтрольным пропсами
	// Мелкие фиксы, по задачам NSUUIWEB-340, 344, 345. Плюс поправил прокси, от... 
	'NSUUIWEB-340': 3,
	// Убрался в скриптах в package.json
	'NSUUIWEB-344': 1, // NSUUIWEB-344 Фикс критического бага с невозможностью редактировать ПЭ после... 
	'NSUUIWEB-345': 1, // NSUUIWEB-345 Починил переключение количества коптеров
	'NSUUIWEB-346': 1, // NSUUIWEB-346 Избавиться от прокси dev-сервера
};

const tasks = {
	'NSUUIWEB-389': 2, // Оффлайн сервер тайлов
	'NSUUIWEB-375': 1, // Переключение показометров
	'NSUUIWEB-409': 1, // Обновить api-шку
	'NSUUIWEB-367': 1, // Очистка буфера видео
	'NSUUIWEB-413': 3, // Управление gir-головой
	'NSUUIWEB-423': 3, // Перенести api в submodule
	'NSUUIWEB-424': 3, // WASM декодер
	'NSUUIWEB-425': 3, // Предполетка
	'NSUUIWEB-427': 1, // ревьюхи, мелкие правки
}

function convertToDate(str) {
	//  Convert a "DD.MM.YYYY" string into a Date object
	let chunks = str.split(".");
	let dat = new Date(chunks[2] + '/' + chunks[1] + '/' + chunks[0]);
	return dat;     
}

function main() {
	// Формируем массив рабочих дней:
	const workingDays = [];
	let currentDay = interval.start;
	let _finiteCounter = 0;

	while(true) {
		const curDate = convertToDate(currentDay);

		let working = false;
		do {
			if ([6/*суббота*/, 0/*воскресенье*/].includes(curDate.getDay())) {
				break;
			}

			if (holidays.includes(currentDay)) {
				break;
			}

			working = true;
		} while (false);

		if (working) {
			workingDays.push(currentDay);
		}

		_finiteCounter++;
		if (currentDay === interval.end || _finiteCounter > 365) {
			break;
		}

		let nextDay = new Date(curDate.getTime() + 24 * 60 * 60 * 1000).toLocaleString().split(',')[0];
		currentDay = nextDay;
	}

	const totalRealHours = workingDays.length * 8;
	console.log(`В промежутке между ${interval.start} и ${interval.end} найдено ${workingDays.length} рабочих дней, ${totalRealHours} часов`);
	console.log(workingDays);

	if (workingDays.length == 0) {
		return;
	}

	let totalVirtualHours = 0;
	for (const taskId in tasks) {
		const hours = Math.pow(2, tasks[taskId]);
		tasks[taskId] = hours;
		totalVirtualHours += hours;
	}

	const coef = totalRealHours / totalVirtualHours;

	let dirty_totalVirtualHours = 0;
	for (const taskId in tasks) {
		tasks[taskId] = Math.round(tasks[taskId] * coef);
		dirty_totalVirtualHours += tasks[taskId];
	}

	if (true/* Округление до 4-х, можно выключить */) {
		let err = dirty_totalVirtualHours - totalRealHours;

		for (const taskId in tasks) {
			// Количество затраченных часов чтобы было кратно 4-м часам
			const rounded4 = Math.max(1, Math.round(tasks[taskId] / 4)) * 4;
			err += rounded4 - tasks[taskId];
			tasks[taskId] = rounded4;
		}

		// Избавляемся от лишних/недостающих часов путем их вычета/добавления к самым большим задачам
		while (Math.abs(err) > 2) {
			const sign = Math.sign(err);

			let taskIds = Object.keys(tasks);
			taskIds = taskIds.filter(id => (tasks[id] % 8) && (tasks[id] > 8)); // Находим задачи, которые не кратны 8 часам. Назовем их "грязными"

			if (taskIds.length == 0) {
				taskIds = Object.keys(tasks);
			}

			taskIds = taskIds.sort((a, b) => tasks[b] - tasks[a]); // Сортируем "грязные" задачи по убыванию времени (т.е. находим самые большие)
			const bigTaskId = taskIds[0];

			const step = sign * 4/*(Math.abs(err) >= 8 ? 8 : 4)*/;
			tasks[bigTaskId] -= step;
			err -= step;
		}

		dirty_totalVirtualHours = totalRealHours + err;
	}

	console.log(`С учетом округления времени задач - суммарно "грязных" часов = ${dirty_totalVirtualHours}, для сравнения "чистых" = ${totalRealHours}`);

	{
		let curDayId = 0;
		let hoursLeftInCurDay = 8;

		for (const taskId in tasks) {
			tasks[taskId] = {begin: workingDays[curDayId], duration: tasks[taskId]};
			let workLeft = tasks[taskId].duration;

			while (workLeft > 0) {
				if (workLeft > hoursLeftInCurDay) {
					workLeft -= hoursLeftInCurDay;
					hoursLeftInCurDay = 8;
					curDayId++;
				} else {
					hoursLeftInCurDay -= workLeft;
					workLeft = 0;
				}
			}
		}

		function formatDuration(dur) {
			const rest = dur % 8;
			let result = '';
			for (let i = 0; i < Math.floor(dur/8); i++) {
				result += '8 ';
			}

			if (rest > 0) {
				result += rest;
			}

			return result.trim();
		}

		for (const taskId in tasks) {
			console.log(`${taskId}, begin: ${tasks[taskId].begin}, duration: ${formatDuration(tasks[taskId].duration)}`);
		}
	}
}
main();