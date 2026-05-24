const STORAGE_KEY = "tinhtiencong.daily-counts.v4";
const LEGACY_STORAGE_KEY = "tinhtiencong.daily-counts.v3";
const RATES = {
  main: 420000,
  helper: 340000,
};

const monthInput = document.querySelector("#workMonth");
const sheetBody = document.querySelector("#sheetBody");
const sheetFoot = document.querySelector("#sheetFoot");
const grandTotal = document.querySelector("#grandTotal");
const workTotal = document.querySelector("#workTotal");
const mainTotal = document.querySelector("#mainTotal");
const helperTotal = document.querySelector("#helperTotal");
const clearMonthBtn = document.querySelector("#clearMonthBtn");
const quickEntryForm = document.querySelector("#quickEntryForm");
const entryDate = document.querySelector("#entryDate");
const morningMain = document.querySelector("#morningMain");
const morningHelper = document.querySelector("#morningHelper");
const afternoonMain = document.querySelector("#afternoonMain");
const afternoonHelper = document.querySelector("#afternoonHelper");
const appSidebar = document.querySelector("#appSidebar");
const sidebarBackdrop = document.querySelector("#sidebarBackdrop");
const openSidebarBtn = document.querySelector("#openSidebarBtn");
const closeSidebarBtn = document.querySelector("#closeSidebarBtn");

let store = loadStore();
let selectedDate = "";

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function currentMonthString() {
  return todayString().slice(0, 7);
}

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return saved;
    }
  } catch {
    return {};
  }

  try {
    return JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
}

function parseCount(value) {
  const count = Number(String(value || "").replace(",", "."));
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function getDaysInMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const totalDays = new Date(year, month, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const date = `${monthValue}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(year, month - 1, day).toLocaleDateString("vi-VN", {
      weekday: "short",
    });

    return { day, date, month, weekday };
  });
}

function emptyDay() {
  return {
    morning: { main: 0, helper: 0 },
    afternoon: { main: 0, helper: 0 },
  };
}

function getDayValue(date) {
  return store[date] || emptyDay();
}

function getCount(date, session, type) {
  return Number(getDayValue(date)[session]?.[type] || 0);
}

function setDayValue(date, day) {
  const cleaned = emptyDay();
  cleaned.morning.main = parseCount(day.morning.main);
  cleaned.morning.helper = parseCount(day.morning.helper);
  cleaned.afternoon.main = parseCount(day.afternoon.main);
  cleaned.afternoon.helper = parseCount(day.afternoon.helper);

  const hasAnyCount =
    cleaned.morning.main || cleaned.morning.helper || cleaned.afternoon.main || cleaned.afternoon.helper;
  if (hasAnyCount) {
    store[date] = cleaned;
  } else {
    delete store[date];
  }
}

function calculateDay(date) {
  const mainSessions = getCount(date, "morning", "main") + getCount(date, "afternoon", "main");
  const helperSessions = getCount(date, "morning", "helper") + getCount(date, "afternoon", "helper");
  const mainPay = (mainSessions * RATES.main) / 2;
  const helperPay = (helperSessions * RATES.helper) / 2;

  return {
    work: (mainSessions + helperSessions) / 2,
    mainPay,
    helperPay,
    totalPay: mainPay + helperPay,
  };
}

function calculateMonth(days) {
  return days.reduce(
    (totals, day) => {
      const dayTotal = calculateDay(day.date);
      totals.work += dayTotal.work;
      totals.mainPay += dayTotal.mainPay;
      totals.helperPay += dayTotal.helperPay;
      totals.totalPay += dayTotal.totalPay;
      return totals;
    },
    { work: 0, mainPay: 0, helperPay: 0, totalPay: 0 }
  );
}

function render() {
  const days = getDaysInMonth(monthInput.value);
  const totals = calculateMonth(days);

  sheetBody.innerHTML = days.map(renderDayRow).join("");
  sheetFoot.innerHTML = renderFooter(totals);
  grandTotal.textContent = formatMoney(totals.totalPay);
  workTotal.textContent = formatNumber(totals.work);
  mainTotal.textContent = formatMoney(totals.mainPay);
  helperTotal.textContent = formatMoney(totals.helperPay);
}

function renderDayRow(day) {
  const total = calculateDay(day.date);
  const selectedClass = day.date === selectedDate ? " selected-row" : "";

  return `
    <tr class="${selectedClass}" data-row-date="${day.date}">
      <th class="date-col" scope="row">${day.day}/${day.month} - ${day.weekday}</th>
      ${renderCountCell(day.date, "morning", "main")}
      ${renderCountCell(day.date, "morning", "helper")}
      ${renderCountCell(day.date, "afternoon", "main")}
      ${renderCountCell(day.date, "afternoon", "helper")}
      <td class="total-col">${formatNumber(total.work)}</td>
      <td class="money-col">${formatMoney(total.totalPay)}</td>
    </tr>
  `;
}

function renderCountCell(date, session, type) {
  const value = getCount(date, session, type);

  return `
    <td class="input-cell">
      <input
        class="sheet-input"
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        value="${value || ""}"
        data-date="${date}"
        data-session="${session}"
        data-type="${type}"
      />
    </td>
  `;
}

function renderFooter(totals) {
  return `
    <tr>
      <th scope="row">Tổng tháng</th>
      <td colspan="4"></td>
      <td class="total-col">${formatNumber(totals.work)}</td>
      <td class="money-col">${formatMoney(totals.totalPay)}</td>
    </tr>
  `;
}

function fillQuickEntryFromDate() {
  selectedDate = entryDate.value;
  const day = getDayValue(entryDate.value);
  morningMain.value = day.morning.main || "";
  morningHelper.value = day.morning.helper || "";
  afternoonMain.value = day.afternoon.main || "";
  afternoonHelper.value = day.afternoon.helper || "";
  render();
}

sheetBody.addEventListener("input", (event) => {
  const input = event.target.closest("[data-date]");
  if (!input) return;

  const date = input.dataset.date;
  const current = getDayValue(date);
  setDayValue(date, {
    morning: {
      main: input.dataset.session === "morning" && input.dataset.type === "main" ? input.value : current.morning.main,
      helper:
        input.dataset.session === "morning" && input.dataset.type === "helper" ? input.value : current.morning.helper,
    },
    afternoon: {
      main:
        input.dataset.session === "afternoon" && input.dataset.type === "main"
          ? input.value
          : current.afternoon.main,
      helper:
        input.dataset.session === "afternoon" && input.dataset.type === "helper"
          ? input.value
          : current.afternoon.helper,
    },
  });

  saveStore();
  render();

  const updatedInput = sheetBody.querySelector(
    `[data-date="${date}"][data-session="${input.dataset.session}"][data-type="${input.dataset.type}"]`
  );
  if (updatedInput) {
    updatedInput.focus();
  }

  if (entryDate.value === date) {
    fillQuickEntryFromDate();
  }
});

sheetBody.addEventListener("click", (event) => {
  if (event.target.closest("input")) return;

  const row = event.target.closest("[data-row-date]");
  if (!row) return;

  selectedDate = row.dataset.rowDate;
  entryDate.value = selectedDate;
  const day = getDayValue(selectedDate);
  morningMain.value = day.morning.main || "";
  morningHelper.value = day.morning.helper || "";
  afternoonMain.value = day.afternoon.main || "";
  afternoonHelper.value = day.afternoon.helper || "";
  render();
});

monthInput.addEventListener("change", render);
entryDate.addEventListener("change", fillQuickEntryFromDate);

quickEntryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedDate = entryDate.value;
  if (!selectedDate) return;
  if (!confirm(`Cập nhật công cho ngày ${formatDateForConfirm(selectedDate)}?`)) return;

  setDayValue(selectedDate, {
    morning: {
      main: morningMain.value,
      helper: morningHelper.value,
    },
    afternoon: {
      main: afternoonMain.value,
      helper: afternoonHelper.value,
    },
  });

  monthInput.value = selectedDate.slice(0, 7);
  saveStore();
  render();
  fillQuickEntryFromDate();
});

clearMonthBtn.addEventListener("click", () => {
  const days = getDaysInMonth(monthInput.value);
  const hasData = days.some((day) => store[day.date]);
  if (!hasData) return;
  if (!confirm("Xóa toàn bộ số công đã nhập trong tháng này?")) return;

  days.forEach((day) => {
    delete store[day.date];
  });

  saveStore();
  render();
  fillQuickEntryFromDate();
  closeSidebar();
});

function openSidebar() {
  appSidebar.classList.add("is-open");
  appSidebar.setAttribute("aria-hidden", "false");
  sidebarBackdrop.hidden = false;
}

function closeSidebar() {
  appSidebar.classList.remove("is-open");
  appSidebar.setAttribute("aria-hidden", "true");
  sidebarBackdrop.hidden = true;
}

openSidebarBtn.addEventListener("click", openSidebar);
closeSidebarBtn.addEventListener("click", closeSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && appSidebar.classList.contains("is-open")) {
    closeSidebar();
  }
});

monthInput.value = currentMonthString();
entryDate.value = todayString();
selectedDate = entryDate.value;
fillQuickEntryFromDate();

function formatDateForConfirm(date) {
  const [, month, day] = date.split("-").map(Number);
  return `${day}/${month}`;
}
