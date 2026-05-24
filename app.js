const STORAGE_KEY = "tinhtiencong.daily-counts.v4";
const LEGACY_STORAGE_KEY = "tinhtiencong.daily-counts.v3";
const RATES = {
  main: 420000,
  helper: 340000,
};

const monthInput = document.querySelector("#workMonth");
const spreadsheetRoot = document.querySelector("#spreadsheet");
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

let spreadsheet = null;
let store = loadStore();

function currentMonthString() {
  return todayString().slice(0, 7);
}

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
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

    return { day, date, weekday };
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

function setDayCounts(date, values) {
  const day = emptyDay();
  day.morning.main = parseCount(values[1]);
  day.morning.helper = parseCount(values[2]);
  day.afternoon.main = parseCount(values[3]);
  day.afternoon.helper = parseCount(values[4]);

  const hasAnyCount = day.morning.main || day.morning.helper || day.afternoon.main || day.afternoon.helper;
  if (hasAnyCount) {
    store[date] = day;
  } else {
    delete store[date];
  }
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

function calculateRow(values) {
  const morningMain = parseCount(values[1]);
  const morningHelper = parseCount(values[2]);
  const afternoonMain = parseCount(values[3]);
  const afternoonHelper = parseCount(values[4]);
  const mainSessions = morningMain + afternoonMain;
  const helperSessions = morningHelper + afternoonHelper;
  const mainPay = (mainSessions * RATES.main) / 2;
  const helperPay = (helperSessions * RATES.helper) / 2;

  return {
    work: (mainSessions + helperSessions) / 2,
    mainPay,
    helperPay,
    totalPay: mainPay + helperPay,
  };
}

function calculateMonthFromStore(days) {
  return days.reduce(
    (totals, day) => {
      const row = [
        day.date,
        getCount(day.date, "morning", "main"),
        getCount(day.date, "morning", "helper"),
        getCount(day.date, "afternoon", "main"),
        getCount(day.date, "afternoon", "helper"),
      ];
      const rowTotal = calculateRow(row);
      totals.work += rowTotal.work;
      totals.mainPay += rowTotal.mainPay;
      totals.helperPay += rowTotal.helperPay;
      totals.totalPay += rowTotal.totalPay;
      return totals;
    },
    { work: 0, mainPay: 0, helperPay: 0, totalPay: 0 }
  );
}

function getSpreadsheetData(days) {
  return days.map((day, index) => {
    const rowNumber = index + 1;
    const mainPayFormula = `(B${rowNumber}+D${rowNumber})*${RATES.main / 2}`;
    const helperPayFormula = `(C${rowNumber}+E${rowNumber})*${RATES.helper / 2}`;
    const [, month] = day.date.split("-").map(Number);

    return [
      `${day.day}/${month} - ${day.weekday}`,
      getCount(day.date, "morning", "main") || "",
      getCount(day.date, "morning", "helper") || "",
      getCount(day.date, "afternoon", "main") || "",
      getCount(day.date, "afternoon", "helper") || "",
      `=(B${rowNumber}+C${rowNumber}+D${rowNumber}+E${rowNumber})/2`,
      `=${mainPayFormula}+${helperPayFormula}`,
    ];
  });
}

function render() {
  if (typeof jspreadsheet !== "function") {
    spreadsheetRoot.textContent = "Không tải được thư viện bảng tính. Vui lòng kiểm tra kết nối mạng.";
    return;
  }

  const days = getDaysInMonth(monthInput.value);
  spreadsheetRoot.innerHTML = "";
  spreadsheet = jspreadsheet(spreadsheetRoot, {
    data: getSpreadsheetData(days),
    columns: [
      { type: "text", title: "Ngày", width: 130, readOnly: true },
      { type: "numeric", title: "Thợ chính", width: 95, mask: "0" },
      { type: "numeric", title: "Thợ phụ", width: 90, mask: "0" },
      { type: "numeric", title: "Thợ chính", width: 95, mask: "0" },
      { type: "numeric", title: "Thợ phụ", width: 90, mask: "0" },
      { type: "numeric", title: "Tổng công", width: 95, readOnly: true, mask: "#.##0,0" },
      { type: "numeric", title: "Thành tiền", width: 130, readOnly: true, mask: "#.##0" },
    ],
    nestedHeaders: [
      [
        { title: "", colspan: "1" },
        { title: "Buổi sáng", colspan: "2" },
        { title: "Buổi chiều", colspan: "2" },
        { title: "Tự tính", colspan: "2" },
      ],
    ],
    tableOverflow: true,
    tableHeight: "calc(100vh - 190px)",
    rowResize: true,
    columnDrag: false,
    allowInsertColumn: false,
    allowDeleteColumn: false,
    allowRenameColumn: false,
    allowInsertRow: false,
    allowDeleteRow: false,
    freezeColumns: 1,
    onchange: handleSpreadsheetChange,
  });

  syncFromSpreadsheet(days);
  updateSummary(days);
}

function handleSpreadsheetChange() {
  const days = getDaysInMonth(monthInput.value);
  syncFromSpreadsheet(days);
  updateSummary(days);
}

function syncFromSpreadsheet(days) {
  if (!spreadsheet || typeof spreadsheet.getData !== "function") return;

  const rows = spreadsheet.getData();
  rows.forEach((row, index) => {
    const day = days[index];
    if (!day) return;
    setDayCounts(day.date, row);
  });
  saveStore();
}

function updateSummary(days) {
  const totals = calculateMonthFromStore(days);
  grandTotal.textContent = formatMoney(totals.totalPay);
  workTotal.textContent = formatNumber(totals.work);
  mainTotal.textContent = formatMoney(totals.mainPay);
  helperTotal.textContent = formatMoney(totals.helperPay);
}

function fillQuickEntryFromDate() {
  const day = getDayValue(entryDate.value);
  morningMain.value = day.morning.main || "";
  morningHelper.value = day.morning.helper || "";
  afternoonMain.value = day.afternoon.main || "";
  afternoonHelper.value = day.afternoon.helper || "";
}

monthInput.addEventListener("change", render);

entryDate.addEventListener("change", fillQuickEntryFromDate);

quickEntryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedDate = entryDate.value;
  if (!selectedDate) return;

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
});

monthInput.value = currentMonthString();
entryDate.value = todayString();
fillQuickEntryFromDate();
render();
