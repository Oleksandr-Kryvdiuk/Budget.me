// =========================================================
// Budget.me — budget section
// Adding and deleting entries, turning free text into item
// chips, monthly totals, and saving everything in the browser.
// =========================================================


// ---------- 1. Settings ----------

// The name under which the data is saved in the browser's localStorage
const STORAGE_KEY = "budget-records";

// Categories.
//   id   — saved with each entry (never change it, or old entries lose their category)
//   name — what you see on screen (safe to rename)
//   icon — a picture from icons.js
const CATEGORIES = {
  expense: [
    { id: "food", name: "Food", icon: "food" },
    { id: "cafe", name: "Cafe", icon: "cafe" },
    { id: "transport", name: "Transport", icon: "transport" },
    { id: "home", name: "Home", icon: "home" },
    { id: "phone", name: "Phone", icon: "phone" },
    { id: "health", name: "Health", icon: "health" },
    { id: "clothes", name: "Clothes", icon: "clothes" },
    { id: "fun", name: "Fun", icon: "fun" },
    { id: "gifts", name: "Gifts", icon: "gift" },
    { id: "other", name: "Other", icon: "other" },
  ],
  income: [
    { id: "salary", name: "Salary", icon: "coin" },
    { id: "side-job", name: "Side job", icon: "laptop" },
    { id: "gift", name: "Gift", icon: "gift" },
    { id: "cashback", name: "Cashback", icon: "percent" },
    { id: "other", name: "Other", icon: "other" },
  ],
};

// Hint text inside the "What & how much" box
const PLACEHOLDERS = {
  expense: "bananas 60, buckwheat 67",
  income: "salary 15000",
};

// Words that mean "hryvnia" — the text parser skips them ("bananas 60 uah")
const CURRENCY_WORDS = ["грн", "uah", "hrn"];


// ---------- 2. Find the elements we need on the page ----------

const form = document.getElementById("entry-form");
const categoryGrid = document.getElementById("category-grid");
const itemsInput = document.getElementById("items-input");
const preview = document.getElementById("preview");
const formError = document.getElementById("form-error");
const dateInput = document.getElementById("date");

const balanceEl = document.getElementById("balance");
const balanceNoteEl = document.getElementById("balance-note");

const monthLabel = document.getElementById("month-label");
const prevMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");
const monthIncomeEl = document.getElementById("month-income");
const monthExpenseEl = document.getElementById("month-expense");
const monthNetEl = document.getElementById("month-net");
const categoryList = document.getElementById("category-list");

const historyNote = document.getElementById("history-note");
const historyList = document.getElementById("history-list");


// ---------- 3. Data ----------
// records is an array (a list) of all entries. One entry looks like this:
// {
//   id: "lx3k9a1b2",               — a unique id, so we know which entry to delete
//   type: "expense",               — "expense" or "income"
//   category: "food",              — a category id from CATEGORIES
//   date: "2026-10-15",            — year-month-day
//   items: [                       — what exactly was bought, each with a price
//     { name: "bananas", price: 60 },
//     { name: "buckwheat", price: 67 }
//   ],
//   amount: 127                    — the total of all items
// }

let records = loadRecords();

// Which month the summary and history show, e.g. "2026-10"
let selectedMonth = currentMonth();

// Reads entries from localStorage. If it's empty or broken, returns an empty list.
function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.map(upgradeRecord) : [];
  } catch (error) {
    console.error("Could not read data:", error);
    return [];
  }
}

// Entries from the first version had one amount and a comment instead of items.
// This turns them into the new shape, so old data keeps working.
function upgradeRecord(record) {
  if (Array.isArray(record.items)) {
    return record;
  }
  // "...record" copies all the old fields, then we add "items"
  return { ...record, items: [{ name: record.comment || "", price: record.amount }] };
}

// Saves all entries to localStorage (after turning the array into text)
function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Could not save data:", error);
    alert("Could not save data. The browser may be in private mode, or the storage is full.");
  }
}


// ---------- 4. Turning free text into items ----------

// Example: "bananas 60, buckwheat 67" →
//   items:    [{ name: "bananas", price: 60 }, { name: "buckwheat", price: 67 }]
//   leftover: ""   (words at the end that had no price after them)
//
// The idea: walk through the words one by one. Ordinary words are collected
// into a name. As soon as we meet a number, it becomes the price of that name.
function parseItems(text) {
  const items = [];
  let words = []; // words collected since the last price

  const tokens = text
    // Split glued words and numbers: "bananas60" → "bananas 60", "60uah" → "60 uah"
    // (\p{L} means "any letter" — Latin, Cyrillic, any alphabet)
    .replace(/(\p{L})(\d)/gu, "$1 $2")
    .replace(/(\d)(\p{L})/gu, "$1 $2")
    // Cut the text into words: by spaces, new lines, ";" and commas.
    // A comma followed by a digit is kept, because "67,5" is a price with kopiykas.
    .split(/[\s;]+|,(?!\d)/);

  for (const token of tokens) {
    // Remove punctuation around a word: "bananas:" → "bananas", "60₴" → "60"
    const word = token.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "");

    // Skip empty pieces and currency words
    if (word === "" || CURRENCY_WORDS.includes(word.toLowerCase())) {
      continue;
    }

    // Is it a price? Digits, optionally with up to 2 digits after "." or ","
    if (/^\d+([.,]\d{1,2})?$/.test(word)) {
      const price = Number(word.replace(",", "."));
      if (price > 0) {
        items.push({ name: words.join(" "), price: price });
      }
      words = [];
    } else {
      words.push(word);
    }
  }

  return { items: items, leftover: words.join(" ") };
}

// Adds up the prices of all items (rounded to kopiykas)
function sumItems(items) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return Math.round(total * 100) / 100;
}


// ---------- 5. Helper functions ----------

// Money format: 1234.5 → "₴1,234.50"
const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "UAH",
  currencyDisplay: "narrowSymbol", // show "₴" instead of "UAH"
});

function formatMoney(amount) {
  // Round to kopiykas. "|| 0" removes the odd "minus zero" (-0)
  // that calculations sometimes produce, which would show as "-₴0.00"
  const rounded = Math.round(amount * 100) / 100 || 0;
  return moneyFormat.format(rounded);
}

// Date formats: "October 2026" and "Thu, Oct 15"
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

// Turns a date into text like "2026-10-15"
function toDateString(date) {
  const year = date.getFullYear();
  // getMonth() counts months from zero (January = 0), so we add 1.
  // padStart(2, "0") adds a leading zero: "5" → "05"
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function todayString() {
  return toDateString(new Date());
}

// The current month, e.g. "2026-10" (the first 7 characters of today's date)
function currentMonth() {
  return todayString().slice(0, 7);
}

// Moves a month forward or back: ("2026-10", 1) → "2026-11", ("2026-01", -1) → "2025-12"
function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  // JavaScript fixes overflow by itself: month 13 becomes January of the next year
  return toDateString(new Date(year, monthNumber - 1 + delta, 1)).slice(0, 7);
}

// "2026-10" → "October 2026"
function formatMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthFormat.format(new Date(year, monthNumber - 1, 1));
}

// "2026-10-15" → "Today", "Yesterday" or "Thu, Oct 15"
function formatDay(dateString) {
  if (dateString === todayString()) {
    return "Today";
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === toDateString(yesterday)) {
    return "Yesterday";
  }
  const [year, month, day] = dateString.split("-").map(Number);
  return dayFormat.format(new Date(year, month - 1, day));
}

// Creates a unique id from the current time and some random characters
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Creates an HTML element with a class and text.
// We use textContent (not innerHTML) because it's safe:
// if someone types something like <b>, it is shown as plain text.
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

// Finds a category by its id. Entries from older versions may have
// a category we don't know any more — then we just show its saved name.
function findCategory(type, id) {
  const found = (CATEGORIES[type] || []).find((category) => category.id === id);
  return found || { id: id, name: id, icon: "other" };
}

// A colored square with a pixel icon (pink for expenses, lime for income)
function makeIconTile(iconName, type) {
  const tile = makeElement("span", "icon-tile icon-tile--" + type);
  tile.appendChild(pixelIcon(iconName));
  return tile;
}

// One chip: "bananas ₴60". In monthly totals with a count: "bananas ×3 ₴180"
function makeChip(name, price, count) {
  const chip = makeElement("span", "chip");
  let label = name;
  if (count > 1) {
    label = (name ? name + " " : "") + "×" + count;
  }
  if (label) {
    chip.appendChild(makeElement("span", "chip-name", label));
  }
  chip.appendChild(makeElement("span", "chip-price", formatMoney(price)));
  return chip;
}

// "Nothing here yet" block with an icon
function makeEmpty(text) {
  const empty = makeElement("li", "empty");
  empty.appendChild(pixelIcon("other"));
  empty.appendChild(makeElement("p", "", text));
  return empty;
}

// Which type is selected in the switch right now: "expense" or "income"
function getSelectedType() {
  return form.querySelector('input[name="type"]:checked').value;
}


// ---------- 6. The "New entry" form ----------

// Draws the category tiles for the selected type
function fillCategories(type) {
  categoryGrid.innerHTML = ""; // first remove the old tiles
  CATEGORIES[type].forEach((category, index) => {
    // Each tile is a hidden radio button + a visible picture with a name
    const tile = makeElement("label", "tile");

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "category";
    radio.value = category.id;
    radio.checked = index === 0; // the first category is selected by default

    const face = makeElement("span", "tile-face");
    face.appendChild(pixelIcon(category.icon));
    face.appendChild(makeElement("span", "tile-name", category.name));

    tile.appendChild(radio);
    tile.appendChild(face);
    categoryGrid.appendChild(tile);
  });
}

// Called when you switch "Expense / Income"
function applyType(type) {
  form.dataset.type = type; // style.css uses this to pick pink or lime
  itemsInput.placeholder = PLACEHOLDERS[type];
  fillCategories(type);
}

// Shows the chips live, while you are typing
function updatePreview() {
  const { items, leftover } = parseItems(itemsInput.value);
  preview.innerHTML = "";

  if (items.length === 0 && !leftover) {
    preview.appendChild(makeElement("p", "preview-hint", "Type what you bought and the price — it turns into chips here."));
    return;
  }

  if (items.length > 0) {
    const chips = makeElement("div", "chips");
    for (const item of items) {
      chips.appendChild(makeChip(item.name, item.price));
    }
    preview.appendChild(chips);
  }
  if (leftover) {
    preview.appendChild(makeElement("p", "preview-warning", "No price for: " + leftover));
  }
  if (items.length > 0) {
    preview.appendChild(makeElement("p", "preview-total", "Total " + formatMoney(sumItems(items))));
  }
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

// Switching "Expense / Income"
for (const radio of form.querySelectorAll('input[name="type"]')) {
  radio.addEventListener("change", () => {
    applyType(getSelectedType());
    updatePreview();
  });
}

// Every time you type, update the chips and hide an old error
itemsInput.addEventListener("input", () => {
  formError.hidden = true;
  updatePreview();
});

// Enter adds the entry; Shift + Enter makes a new line
itemsInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

// When we click "Add entry"
form.addEventListener("submit", (event) => {
  // By default a form reloads the page — we stop that
  event.preventDefault();

  const { items, leftover } = parseItems(itemsInput.value);
  if (items.length === 0) {
    showFormError("Add at least one price, for example: bananas 60");
    return;
  }
  if (leftover) {
    showFormError("Add a price for: " + leftover);
    return;
  }

  const record = {
    id: createId(),
    type: getSelectedType(),
    category: form.querySelector('input[name="category"]:checked').value,
    date: dateInput.value,
    items: items,
    amount: sumItems(items),
  };

  records.push(record); // add to the end of the list
  saveRecords();

  // Clear the text, but keep the type, category and date —
  // that makes it easier to add several similar entries in a row
  itemsInput.value = "";
  updatePreview();
  itemsInput.focus();

  // Show the month we just added an entry to
  selectedMonth = record.date.slice(0, 7);
  render();

  const sign = record.type === "income" ? "+" : "−";
  showToast(sign + formatMoney(record.amount) + " added");
});

// Deletes an entry by its id (after confirmation)
function deleteRecord(id) {
  if (!confirm("Delete this entry?")) {
    return;
  }
  // filter keeps all entries EXCEPT the one with this id
  records = records.filter((record) => record.id !== id);
  saveRecords();
  render();
}

// Month arrows
prevMonthButton.addEventListener("click", () => {
  selectedMonth = shiftMonth(selectedMonth, -1);
  renderMonth();
});
nextMonthButton.addEventListener("click", () => {
  selectedMonth = shiftMonth(selectedMonth, 1);
  renderMonth();
});


// ---------- 7. Rendering (drawing the data on the page) ----------

// Main function: updates every block on the page
function render() {
  renderBalance();
  renderMonth();
}

// Balance = all income minus all expenses (for all time)
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
  const count = records.length;
  balanceNoteEl.textContent = "All time · " + count + (count === 1 ? " entry" : " entries");
}

// Everything that depends on the selected month
function renderMonth() {
  monthLabel.textContent = formatMonth(selectedMonth);
  const monthRecords = records.filter((record) => record.date.startsWith(selectedMonth));
  renderSummary(monthRecords);
  renderHistory(monthRecords);
}

// Income, expenses, and what exactly was bought in each category
function renderSummary(monthRecords) {
  let income = 0;
  let expense = 0;

  // groups will look like this:
  // {
  //   food: {
  //     total: 172,
  //     items: { bananas: { name: "bananas", count: 2, total: 105 }, ... }
  //   },
  //   cafe: { ... }
  // }
  const groups = {};

  for (const record of monthRecords) {
    if (record.type === "income") {
      income += record.amount;
      continue;
    }
    expense += record.amount;

    if (!groups[record.category]) {
      groups[record.category] = { total: 0, items: {} };
    }
    const group = groups[record.category];
    group.total += record.amount;

    // Same name in any letter case counts as the same thing: "Bananas" = "bananas"
    for (const item of record.items) {
      const key = item.name.toLowerCase();
      if (!group.items[key]) {
        group.items[key] = { name: item.name, count: 0, total: 0 };
      }
      group.items[key].count += 1;
      group.items[key].total += item.price;
    }
  }

  monthIncomeEl.textContent = formatMoney(income);
  monthExpenseEl.textContent = formatMoney(expense);
  monthNetEl.textContent = formatMoney(income - expense);

  categoryList.innerHTML = "";
  // Turn the object into a list of [categoryId, group] pairs, biggest spending first
  const sorted = Object.entries(groups).sort((a, b) => b[1].total - a[1].total);

  if (sorted.length === 0) {
    categoryList.appendChild(makeEmpty("No expenses this month"));
    return;
  }

  for (const [categoryId, group] of sorted) {
    const category = findCategory("expense", categoryId);
    // What share (in percent) this category takes of all the month's expenses
    const percent = Math.round((group.total / expense) * 100);

    const row = makeElement("li", "spend-row");
    row.appendChild(makeIconTile(category.icon, "expense"));

    const body = makeElement("div", "spend-body");

    const head = makeElement("div", "spend-head");
    head.appendChild(makeElement("span", "", category.name));
    head.appendChild(makeElement("span", "", formatMoney(group.total)));
    body.appendChild(head);

    // Pixel progress bar: its length shows the share of spending
    const meterRow = makeElement("div", "meter-row");
    const meter = makeElement("div", "meter");
    const fill = makeElement("div", "meter-fill");
    fill.style.width = percent + "%";
    meter.appendChild(fill);
    meterRow.appendChild(meter);
    meterRow.appendChild(makeElement("span", "meter-percent", percent + "%"));
    body.appendChild(meterRow);

    // Chips with what exactly was bought, most expensive first
    const items = Object.values(group.items).sort((a, b) => b.total - a.total);
    const chips = makeElement("div", "chips");
    for (const item of items) {
      chips.appendChild(makeChip(item.name, item.total, item.count));
    }
    body.appendChild(chips);

    row.appendChild(body);
    categoryList.appendChild(row);
  }
}

// List of the month's entries, grouped by day, newest on top
function renderHistory(monthRecords) {
  historyList.innerHTML = "";
  const count = monthRecords.length;
  historyNote.textContent = formatMonth(selectedMonth) + " · " + count + (count === 1 ? " entry" : " entries");

  if (count === 0) {
    historyList.appendChild(makeEmpty("No entries this month. Add your first one above!"));
    return;
  }

  // slice() makes a copy, reverse() puts the most recently added first,
  // and sort() orders by date (newest on top). Entries with the same date
  // keep their order from reverse(), so the one you just added is higher.
  const sorted = monthRecords
    .slice()
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  let currentDay = null;
  let dayList = null;
  for (const record of sorted) {
    // A new date starts a new group with a title
    if (record.date !== currentDay) {
      currentDay = record.date;
      const day = makeElement("li", "day");
      day.appendChild(makeElement("h3", "day-title", formatDay(record.date)));
      dayList = makeElement("ul", "day-entries");
      day.appendChild(dayList);
      historyList.appendChild(day);
    }
    dayList.appendChild(makeEntry(record));
  }
}

// One entry in the history: icon, category, total, delete button, chips
function makeEntry(record) {
  const category = findCategory(record.type, record.category);
  const isIncome = record.type === "income";

  const entry = makeElement("li", "entry");
  entry.appendChild(makeIconTile(category.icon, record.type));
  entry.appendChild(makeElement("p", "entry-name", category.name));

  const sign = isIncome ? "+" : "−";
  entry.appendChild(makeElement("span", "amount amount--" + record.type, sign + formatMoney(record.amount)));

  const deleteButton = makeElement("button", "icon-button icon-button--danger");
  deleteButton.type = "button";
  deleteButton.title = "Delete";
  deleteButton.setAttribute("aria-label", "Delete " + category.name + " " + formatMoney(record.amount));
  deleteButton.appendChild(pixelIcon("cross"));
  deleteButton.addEventListener("click", () => deleteRecord(record.id));
  entry.appendChild(deleteButton);

  // Chips — but not when there is just one item without a name (like "15000")
  const onlyUnnamed = record.items.length === 1 && !record.items[0].name;
  if (!onlyUnnamed) {
    const chips = makeElement("div", "chips entry-chips");
    for (const item of record.items) {
      chips.appendChild(makeChip(item.name, item.price));
    }
    entry.appendChild(chips);
  }

  return entry;
}


// ---------- 8. Start ----------
// This runs once, when the page opens

applyType(getSelectedType());
dateInput.value = todayString();
updatePreview();
render();
