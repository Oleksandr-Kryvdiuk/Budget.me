// =========================================================
// Budget tracker
// All the logic lives here: adding and deleting entries,
// calculations, and saving data in the browser.
// =========================================================


// ---------- 1. Settings ----------

// The name under which the data is saved in the browser's localStorage
const STORAGE_KEY = "budget-records";

// Categories. To add your own, just add it to the right list.
const CATEGORIES = {
  expense: [
    "Groceries",
    "Cafes & restaurants",
    "Transport",
    "Housing & utilities",
    "Phone & internet",
    "Health",
    "Clothing",
    "Entertainment",
    "Gifts",
    "Other",
  ],
  income: [
    "Salary",
    "Side job",
    "Gift",
    "Cashback & interest",
    "Other",
  ],
};


// ---------- 2. Find the elements we need on the page ----------
// document.getElementById("...") finds the element with that id in index.html

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


// ---------- 3. Data ----------
// records is an array (a list) of all entries. One entry looks like this:
// {
//   id: "lx3k9a1b2",        — a unique id, so we know which entry to delete
//   type: "expense",        — "expense" or "income"
//   amount: 150.5,          — amount in hryvnias
//   category: "Groceries",
//   date: "2026-10-15",     — date in year-month-day format
//   comment: "Supermarket"
// }

let records = loadRecords();

// Reads entries from localStorage. If it's empty or broken, returns an empty list.
function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }
    // localStorage can only store text, so we turn the text back into an array
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not read data:", error);
    return [];
  }
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


// ---------- 4. Helper functions ----------

// Money format: 1234.5 → "₴1,234.50"
const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "UAH",
  currencyDisplay: "narrowSymbol", // show "₴" instead of "UAH"
});

// Turns a number into money text: 1234.5 → "₴1,234.50"
function formatMoney(amount) {
  // Round to kopiykas (cents). "|| 0" removes the odd "minus zero" (-0)
  // that calculations sometimes produce, which would show as "-₴0.00"
  const rounded = Math.round(amount * 100) / 100 || 0;
  return moneyFormat.format(rounded);
}

// Date format: "Oct 15, 2026"
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Turns the date "2026-10-15" into "Oct 15, 2026"
function formatDate(dateString) {
  // split("-") cuts the text into parts, map(Number) turns each part into a number
  const [year, month, day] = dateString.split("-").map(Number);
  // In JavaScript, months start from zero (January = 0), so we subtract 1
  return dateFormat.format(new Date(year, month - 1, day));
}

// Returns today's date in the "2026-10-15" format
function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  // getMonth() counts months from zero (January = 0), so we add 1.
  // padStart(2, "0") adds a leading zero: "5" → "05"
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// The current month in the "2026-10" format (the first 7 characters of the date)
function currentMonth() {
  return todayString().slice(0, 7);
}

// Creates a unique id from the current time and some random characters
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Creates an HTML element with a class and text.
// We use textContent (not innerHTML) because it's safe:
// if a comment contains something like <b>, it is shown as plain text.
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

// Which type is selected in the switch right now: "expense" or "income"
function getSelectedType() {
  return form.querySelector('input[name="type"]:checked').value;
}

// Fills the category dropdown for the selected type
function fillCategories(type) {
  categorySelect.innerHTML = ""; // first remove the old options
  for (const name of CATEGORIES[type]) {
    const option = makeElement("option", "", name);
    option.value = name;
    categorySelect.appendChild(option);
  }
}


// ---------- 5. User actions ----------

// When we switch "Expense / Income", change the category list
for (const radio of form.querySelectorAll('input[name="type"]')) {
  radio.addEventListener("change", () => {
    fillCategories(getSelectedType());
  });
}

// When we click "Add"
form.addEventListener("submit", (event) => {
  // By default a form reloads the page — we stop that
  event.preventDefault();

  // Turn the typed text into a number and round it to kopiykas
  const amount = Math.round(Number(amountInput.value) * 100) / 100;
  if (!(amount > 0)) {
    alert("Enter an amount greater than zero.");
    return;
  }

  const record = {
    id: createId(),
    type: getSelectedType(),
    amount: amount,
    category: categorySelect.value,
    date: dateInput.value,
    comment: commentInput.value.trim(), // trim() removes extra spaces at the edges
  };

  records.push(record); // add to the end of the list
  saveRecords();

  // Clear only the amount and comment. Keep the type, category and date —
  // that makes it easier to add several similar entries in a row.
  amountInput.value = "";
  commentInput.value = "";
  amountInput.focus();

  // Show the summary for the month we just added an entry to
  monthInput.value = record.date.slice(0, 7);

  render();
});

// When the month changes, recalculate the summary
monthInput.addEventListener("change", () => {
  // If the field was cleared, go back to the current month
  if (!monthInput.value) {
    monthInput.value = currentMonth();
  }
  renderMonthSummary();
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


// ---------- 6. Rendering (drawing the data on the page) ----------

// Main function: updates every block on the page
function render() {
  renderBalance();
  renderMonthSummary();
  renderRecordList();
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
  // If the balance is negative, color it red
  balanceEl.classList.toggle("expense", balance < -0.004);
}

// Income, expenses and expenses by category for the selected month
function renderMonthSummary() {
  const month = monthInput.value; // for example "2026-10"

  let income = 0;
  let expense = 0;
  const byCategory = {}; // will look like { "Groceries": 1200, "Transport": 300 }

  for (const record of records) {
    // Skip entries from other months
    if (!record.date.startsWith(month)) {
      continue;
    }
    if (record.type === "income") {
      income += record.amount;
    } else {
      expense += record.amount;
      // If this category isn't there yet, start from 0, then add the amount
      byCategory[record.category] = (byCategory[record.category] || 0) + record.amount;
    }
  }

  monthIncomeEl.textContent = formatMoney(income);
  monthExpenseEl.textContent = formatMoney(expense);

  // Turn the object into a list of [category, amount] pairs and sort it: biggest expenses first
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  categoryList.innerHTML = "";
  if (sorted.length === 0) {
    categoryList.appendChild(makeElement("li", "empty", "No expenses this month"));
    return;
  }

  for (const [category, sum] of sorted) {
    // What share (in percent) this category takes of all the month's expenses
    const percent = Math.round((sum / expense) * 100);

    const item = makeElement("li", "category-item");

    const row = makeElement("div", "category-row");
    row.appendChild(makeElement("span", "", category));
    row.appendChild(makeElement("span", "", formatMoney(sum) + " · " + percent + "%"));

    // A bar whose length equals the percentage
    const bar = makeElement("div", "category-bar");
    const fill = makeElement("div", "category-bar-fill");
    fill.style.width = percent + "%";
    bar.appendChild(fill);

    item.appendChild(row);
    item.appendChild(bar);
    categoryList.appendChild(item);
  }
}

// List of all entries: newest dates on top
function renderRecordList() {
  recordList.innerHTML = "";

  if (records.length === 0) {
    recordList.appendChild(makeElement("li", "empty", "No entries yet. Add your first one!"));
    return;
  }

  // slice() makes a copy, reverse() puts the most recently added first,
  // and sort() orders by date (newest on top). Entries with the same date
  // keep their order from reverse(), so the one you just added is higher.
  const sorted = records
    .slice()
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const record of sorted) {
    const item = makeElement("li", "record-item");

    // Left part: category, date, comment
    const info = makeElement("div", "record-info");
    info.appendChild(makeElement("p", "record-category", record.category));
    let meta = formatDate(record.date);
    if (record.comment) {
      meta += " · " + record.comment;
    }
    info.appendChild(makeElement("p", "record-meta", meta));

    // Amount: green with "+" for income, red with "−" for expenses
    const isIncome = record.type === "income";
    const sign = isIncome ? "+" : "−";
    const amountEl = makeElement(
      "p",
      "record-amount " + (isIncome ? "income" : "expense"),
      sign + formatMoney(record.amount)
    );

    // Delete button
    const deleteButton = makeElement("button", "btn-delete", "×");
    deleteButton.type = "button";
    deleteButton.title = "Delete entry";
    deleteButton.setAttribute("aria-label", "Delete entry");
    deleteButton.addEventListener("click", () => deleteRecord(record.id));

    item.appendChild(info);
    item.appendChild(amountEl);
    item.appendChild(deleteButton);
    recordList.appendChild(item);
  }
}


// ---------- 7. Start ----------
// This runs once, when the page opens

fillCategories(getSelectedType());
dateInput.value = todayString();
monthInput.value = currentMonth();
render();
