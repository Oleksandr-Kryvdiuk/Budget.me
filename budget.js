// =========================================================
// Трекер бюджету
// Тут уся логіка: додавання й видалення записів, підрахунки,
// збереження даних у браузері.
//
// Рядки беремо в подвійні лапки "…", бо в українських словах
// буває апостроф (Зв'язок), і одинарні лапки з ним конфліктували б.
// =========================================================


// ---------- 1. Налаштування ----------

// Назва, під якою дані зберігаються в localStorage браузера
const STORAGE_KEY = "budget-records";

// Категорії. Щоб додати свою, просто допиши її в потрібний список.
const CATEGORIES = {
  expense: [
    "Продукти",
    "Кафе та ресторани",
    "Транспорт",
    "Житло та комуналка",
    "Зв'язок та інтернет",
    "Здоров'я",
    "Одяг",
    "Розваги",
    "Подарунки",
    "Інше",
  ],
  income: [
    "Зарплата",
    "Підробіток",
    "Подарунок",
    "Кешбек і відсотки",
    "Інше",
  ],
};


// ---------- 2. Знаходимо потрібні елементи на сторінці ----------
// document.getElementById("...") шукає елемент з таким id в index.html

const form = document.getElementById("record-form");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const commentInput = document.getElementById("comment");
const monthInput = document.getElementById("month");

const balanceEl = document.getElementById("balance");
const monthIncomeEl = document.getElementById("month-income");
const monthExpenseEl = document.getElementById("month-expense");
const categoryList = document.getElementById("category-list");
const recordList = document.getElementById("record-list");


// ---------- 3. Дані ----------
// records — це масив (список) усіх записів. Один запис виглядає так:
// {
//   id: "lx3k9a1b2",        — унікальний номер, щоб знати, що видаляти
//   type: "expense",        — "expense" (витрата) або "income" (дохід)
//   amount: 150.5,          — сума в гривнях
//   category: "Продукти",
//   date: "2026-10-15",     — дата у форматі рік-місяць-день
//   comment: "АТБ"
// }

let records = loadRecords();

// Читає записи з localStorage. Якщо там порожньо або щось зламане — повертає порожній список.
function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }
    // localStorage зберігає лише текст, тому перетворюємо текст назад у масив
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Не вдалося прочитати дані:", error);
    return [];
  }
}

// Записує всі записи в localStorage (перетворивши масив у текст)
function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Не вдалося зберегти дані:", error);
    alert("Не вдалося зберегти дані. Можливо, браузер у приватному режимі або сховище заповнене.");
  }
}


// ---------- 4. Допоміжні функції ----------

// Формат чисел для України: 1234.5 → "1 234,50"
const numberFormat = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Перетворює число на гроші: 1234.5 → "1 234,50 ₴"
function formatMoney(amount) {
  // Округлюємо до копійок. «|| 0» прибирає дивний «мінус нуль» (-0),
  // який іноді виникає під час обчислень і показувався б як "-0,00"
  const rounded = Math.round(amount * 100) / 100 || 0;
  return numberFormat.format(rounded) + " ₴";
}

// Перетворює дату "2026-10-15" на звичний вигляд "15.10.2026"
function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return day + "." + month + "." + year;
}

// Повертає сьогоднішню дату у форматі "2026-10-15"
function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  // getMonth() рахує місяці з нуля (січень = 0), тому додаємо 1.
  // padStart(2, "0") додає нуль спереду: "5" → "05"
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Поточний місяць у форматі "2026-10" (перші 7 символів дати)
function currentMonth() {
  return todayString().slice(0, 7);
}

// Створює унікальний id з поточного часу та випадкових символів
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Створює HTML-елемент із класом і текстом.
// Використовуємо textContent (а не innerHTML) — це безпечно:
// якщо в коментарі будуть символи на кшталт <b>, вони покажуться як звичайний текст.
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// Який тип зараз вибрано в перемикачі: "expense" або "income"
function getSelectedType() {
  return form.querySelector('input[name="type"]:checked').value;
}

// Заповнює випадаючий список категорій для вибраного типу
function fillCategories(type) {
  categorySelect.innerHTML = ""; // спершу очищаємо старі варіанти
  for (const name of CATEGORIES[type]) {
    const option = makeElement("option", "", name);
    option.value = name;
    categorySelect.appendChild(option);
  }
}


// ---------- 5. Дії користувача ----------

// Коли перемикаємо «Витрата / Дохід» — міняємо список категорій
for (const radio of form.querySelectorAll('input[name="type"]')) {
  radio.addEventListener("change", () => {
    fillCategories(getSelectedType());
  });
}

// Коли натискаємо «Додати»
form.addEventListener("submit", (event) => {
  // За замовчуванням форма перезавантажує сторінку — забороняємо це
  event.preventDefault();

  // Перетворюємо введений текст на число і округлюємо до копійок
  const amount = Math.round(Number(amountInput.value) * 100) / 100;
  if (!(amount > 0)) {
    alert("Введи суму, більшу за нуль.");
    return;
  }

  const record = {
    id: createId(),
    type: getSelectedType(),
    amount: amount,
    category: categorySelect.value,
    date: dateInput.value,
    comment: commentInput.value.trim(), // trim() прибирає зайві пробіли по краях
  };

  records.push(record); // додаємо в кінець списку
  saveRecords();

  // Очищаємо лише суму й коментар. Тип, категорію й дату лишаємо —
  // так зручніше вносити кілька схожих записів поспіль.
  amountInput.value = "";
  commentInput.value = "";
  amountInput.focus();

  // Показуємо підсумки за місяць, у який щойно додали запис
  monthInput.value = record.date.slice(0, 7);

  render();
});

// Коли змінюємо місяць — перераховуємо підсумки
monthInput.addEventListener("change", () => {
  // Якщо поле очистили — повертаємо поточний місяць
  if (!monthInput.value) {
    monthInput.value = currentMonth();
  }
  renderMonthSummary();
});

// Видаляє запис за його id (після підтвердження)
function deleteRecord(id) {
  if (!confirm("Видалити цей запис?")) {
    return;
  }
  // filter залишає всі записи, КРІМ того, у якого такий id
  records = records.filter((record) => record.id !== id);
  saveRecords();
  render();
}


// ---------- 6. Відображення (малюємо дані на сторінці) ----------

// Головна функція: оновлює всі блоки сторінки
function render() {
  renderBalance();
  renderMonthSummary();
  renderRecordList();
}

// Баланс = усі доходи мінус усі витрати (за весь час)
function renderBalance() {
  let balance = 0;
  for (const record of records) {
    if (record.type === "income") {
      balance += record.amount;
    } else {
      balance -= record.amount;
    }
  }
  balanceEl.textContent = formatMoney(balance);
  // Якщо баланс від'ємний — фарбуємо його в червоний
  balanceEl.classList.toggle("expense", balance < -0.004);
}

// Доходи, витрати та витрати по категоріях за вибраний місяць
function renderMonthSummary() {
  const month = monthInput.value; // наприклад "2026-10"

  let income = 0;
  let expense = 0;
  const byCategory = {}; // тут буде щось на кшталт { "Продукти": 1200, "Транспорт": 300 }

  for (const record of records) {
    // Пропускаємо записи з інших місяців
    if (!record.date.startsWith(month)) {
      continue;
    }
    if (record.type === "income") {
      income += record.amount;
    } else {
      expense += record.amount;
      // Якщо такої категорії ще немає — починаємо з 0, потім додаємо суму
      byCategory[record.category] = (byCategory[record.category] || 0) + record.amount;
    }
  }

  monthIncomeEl.textContent = formatMoney(income);
  monthExpenseEl.textContent = formatMoney(expense);

  // Перетворюємо об'єкт на список пар [категорія, сума] і сортуємо: найбільші витрати зверху
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  categoryList.innerHTML = "";
  if (sorted.length === 0) {
    categoryList.appendChild(makeElement("li", "empty", "Витрат за цей місяць немає"));
    return;
  }

  for (const [category, sum] of sorted) {
    // Яку частку (у відсотках) ця категорія займає від усіх витрат місяця
    const percent = Math.round((sum / expense) * 100);

    const item = makeElement("li", "category-item");

    const row = makeElement("div", "category-row");
    row.appendChild(makeElement("span", "", category));
    row.appendChild(makeElement("span", "", formatMoney(sum) + " · " + percent + "%"));

    // Смужка, довжина якої дорівнює відсотку
    const bar = makeElement("div", "category-bar");
    const fill = makeElement("div", "category-bar-fill");
    fill.style.width = percent + "%";
    bar.appendChild(fill);

    item.appendChild(row);
    item.appendChild(bar);
    categoryList.appendChild(item);
  }
}

// Список усіх записів: нові дати зверху
function renderRecordList() {
  recordList.innerHTML = "";

  if (records.length === 0) {
    recordList.appendChild(makeElement("li", "empty", "Записів поки немає. Додай перший!"));
    return;
  }

  // slice() робить копію, reverse() ставить останні додані першими,
  // а sort() упорядковує за датою (новіші зверху). Записи з однаковою датою
  // зберігають порядок після reverse(), тож щойно доданий буде вище.
  const sorted = records
    .slice()
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const record of sorted) {
    const item = makeElement("li", "record-item");

    // Ліва частина: категорія, дата, коментар
    const info = makeElement("div", "record-info");
    info.appendChild(makeElement("p", "record-category", record.category));
    let meta = formatDate(record.date);
    if (record.comment) {
      meta += " · " + record.comment;
    }
    info.appendChild(makeElement("p", "record-meta", meta));

    // Сума: зелена з «+» для доходу, червона з «−» для витрати
    const isIncome = record.type === "income";
    const sign = isIncome ? "+" : "−";
    const amountEl = makeElement(
      "p",
      "record-amount " + (isIncome ? "income" : "expense"),
      sign + formatMoney(record.amount)
    );

    // Кнопка видалення
    const deleteButton = makeElement("button", "btn-delete", "×");
    deleteButton.type = "button";
    deleteButton.title = "Видалити запис";
    deleteButton.setAttribute("aria-label", "Видалити запис");
    deleteButton.addEventListener("click", () => deleteRecord(record.id));

    item.appendChild(info);
    item.appendChild(amountEl);
    item.appendChild(deleteButton);
    recordList.appendChild(item);
  }
}


// ---------- 7. Запуск ----------
// Це виконується один раз, коли сторінка відкривається

fillCategories(getSelectedType());
dateInput.value = todayString();
monthInput.value = currentMonth();
render();
