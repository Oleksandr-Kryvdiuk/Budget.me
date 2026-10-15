// =========================================================
// Budget.me — app shell
// Switching between sections (tabs) and small shared helpers.
// Each section has its own file: budget.js now, plans.js later.
// =========================================================


// ---------- Tabs: Budget / Habits & Plans ----------

const tabButtons = document.querySelectorAll("[data-tab]");
const views = document.querySelectorAll("[data-view]");

// Shows one section and hides the others
function showView(name) {
  // If the name is unknown (for example, a typo in the address), open the budget
  const exists = [...views].some((view) => view.dataset.view === name);
  if (!exists) {
    name = "budget";
  }
  for (const view of views) {
    view.hidden = view.dataset.view !== name;
  }
  for (const button of tabButtons) {
    button.setAttribute("aria-selected", String(button.dataset.tab === name));
  }
}

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    showView(button.dataset.tab);
    // Save the section in the address (…/#plans), so a page reload keeps it open
    history.replaceState(null, "", "#" + button.dataset.tab);
  });
}


// ---------- Toast: a short message that hides by itself ----------

const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  // If a previous message is still on screen, restart the timer
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}


// ---------- Start ----------

// Today's date in the top bar, e.g. "Thu, Oct 15"
document.getElementById("today").textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
}).format(new Date());

fillStaticIcons(); // from icons.js
showView(location.hash.slice(1)); // "#plans" → "plans"
