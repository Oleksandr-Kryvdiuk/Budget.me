# Budget.me

A pixel-style personal tracker that runs right in the browser — no server, nothing to install.

**Live:** https://oleksandr-kryvdiuk.github.io/Budget.me/

## Features

**Budget**
- add income and expenses: pick a category, then just type what you bought and the price —
  `bananas 60 buckwheat 67` turns into separate chips: `bananas ₴60` `buckwheat ₴67`;
- the total is calculated automatically;
- current balance for all time;
- monthly view (switch months with the arrows): income, expenses, net, and spending by category
  with chips of what exactly was bought (`bananas ×3 ₴180`);
- history of the month grouped by day, each entry can be deleted.

**Habits & Plans** — coming soon: habit tracker, plans, deadlines and reminders.

Currency: Ukrainian hryvnia (₴). Data is stored in the browser's `localStorage`, so it lives only on the device and in the browser where it was entered.

## How the quick text input works

Words are collected into an item name until a number appears — that number becomes the item's price.

| You type | You get |
|----------|---------|
| `bananas 60 buckwheat 67` | `bananas ₴60` `buckwheat ₴67` |
| `bananas60, buckwheat 67,5` | `bananas ₴60` `buckwheat ₴67.50` |
| `green tea 80 uah` | `green tea ₴80` |
| `45` | `₴45` (no name) |

Currency words (`грн`, `uah`, `₴`) are ignored. Press **Enter** to add the entry, **Shift + Enter** for a new line.

## Files

| File | What's inside |
|------|---------------|
| `index.html` | page structure |
| `style.css` | pixel / neo-brutalist styles, light and dark theme |
| `icons.js` | pixel icons drawn with `#` and `.` |
| `app.js` | tabs and shared helpers |
| `budget.js` | budget logic: text parsing, totals, history |

## How to run

Open `index.html` in a browser (double-click the file). Fonts load from Google Fonts, so without internet the page uses fallback fonts.
