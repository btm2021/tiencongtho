/* --- Configuration Keys --- */
const STORAGE_KEY = "tinhtiencong.counter.v2"; // Phiên bản v2 lưu chấm công 2 buổi
const THEME_KEY = "tinhtiencong.theme";

// Đơn giá tính theo BUỔI (bằng 1/2 đơn giá ngày)
const RATES = {
  main: 210000,   // Thợ chính: 210.000đ / buổi
  helper: 170000, // Thợ phụ: 170.000đ / buổi
};

/* --- DOM Selection --- */
const body = document.documentElement;
const dateInput = document.querySelector("#workDate");
const prevDateBtn = document.querySelector("#prevDateBtn");
const nextDateBtn = document.querySelector("#nextDateBtn");

// Buổi Sáng Counters
const decMorningMain = document.querySelector("#decMorningMain");
const incMorningMain = document.querySelector("#incMorningMain");
const morningMainDisplay = document.querySelector("#morningMainDisplay");

const decMorningHelper = document.querySelector("#decMorningHelper");
const incMorningHelper = document.querySelector("#incMorningHelper");
const morningHelperDisplay = document.querySelector("#morningHelperDisplay");

// Buổi Chiều Counters
const decAfternoonMain = document.querySelector("#decAfternoonMain");
const incAfternoonMain = document.querySelector("#incAfternoonMain");
const afternoonMainDisplay = document.querySelector("#afternoonMainDisplay");

const decAfternoonHelper = document.querySelector("#decAfternoonHelper");
const incAfternoonHelper = document.querySelector("#incAfternoonHelper");
const afternoonHelperDisplay = document.querySelector("#afternoonHelperDisplay");

// Day Totals & Action Buttons
const dayTotal = document.querySelector("#dayTotal");
const saveDayBtn = document.querySelector("#saveDayBtn");
const clearDayBtn = document.querySelector("#clearDayBtn");

// Global Summary Elements
const navTotalSalary = document.querySelector("#navTotalSalary"); // On sticky Nav
const globalTotalSalary = document.querySelector("#globalTotalSalary"); // In Sidebar card
const globalTotalMain = document.querySelector("#globalTotalMain"); // In Sidebar
const globalTotalHelper = document.querySelector("#globalTotalHelper"); // In Sidebar

// Sidebar Calendar Grid Elements
const sidebarMenu = document.querySelector("#sidebarMenu");
const calendarMonthTitle = document.querySelector("#calendarMonthTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const sidebarTodayShortcut = document.querySelector("#sidebarTodayShortcut");
const sidebarClearAllShortcut = document.querySelector("#sidebarClearAllShortcut");
const sidebarWeeklyBtn = document.querySelector("#sidebarWeeklyBtn");

// Weekly Calculation Modal Elements
const weeklyModalList = document.querySelector("#weeklyModalList");
const weeklyTotalMain = document.querySelector("#weeklyTotalMain");
const weeklyTotalHelper = document.querySelector("#weeklyTotalHelper");
const weeklyGrandTotal = document.querySelector("#weeklyGrandTotal");

/* --- State Variables --- */
let activeDate = todayString();
let store = loadStore();

// Trạng thái ngày hiện tại
let morningMain = 0;
let morningHelper = 0;
let afternoonMain = 0;
let afternoonHelper = 0;

/* --- Date Helpers --- */
function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function getYesterdayString() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function changeDateByOffset(offset) {
  const current = new Date(dateInput.value);
  current.setDate(current.getDate() + offset);
  const tzOffset = current.getTimezoneOffset() * 60000;
  activeDate = new Date(current.getTime() - tzOffset).toISOString().slice(0, 10);
  dateInput.value = activeDate;
  handleDateChange();
}

/* --- Theme Handling (Locked to Dark mode) --- */
function initTheme() {
  // Luôn khóa Dark Mode
  body.setAttribute("data-theme", "dark");
}

/* --- Local Storage Core Engine --- */
function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/* --- Pay Calculations & Formatting --- */
function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function calculatePay(mMain, mHelper, aMain, aHelper) {
  return ((mMain + aMain) * RATES.main) + ((mHelper + aHelper) * RATES.helper);
}

/* --- State Loading & Updates --- */
function loadActiveDateData() {
  const activeRecord = store[activeDate];
  if (activeRecord) {
    morningMain = activeRecord.morningMain || 0;
    morningHelper = activeRecord.morningHelper || 0;
    afternoonMain = activeRecord.afternoonMain || 0;
    afternoonHelper = activeRecord.afternoonHelper || 0;
  } else {
    morningMain = 0;
    morningHelper = 0;
    afternoonMain = 0;
    afternoonHelper = 0;
  }
  
  updateActiveDayCalculations();
}

function updateActiveDayCalculations() {
  // Hiển thị số công lên bộ đếm Sáng
  morningMainDisplay.textContent = morningMain.toString();
  morningHelperDisplay.textContent = morningHelper.toString();

  // Hiển thị số công lên bộ đếm Chiều
  afternoonMainDisplay.textContent = afternoonMain.toString();
  afternoonHelperDisplay.textContent = afternoonHelper.toString();

  // Tính tiền
  const totalPay = calculatePay(morningMain, morningHelper, afternoonMain, afternoonHelper);

  // Hiển thị tiền
  dayTotal.textContent = formatMoney(totalPay);
}

function updateGlobalSummaryAndHistory() {
  let totalSalary = 0;
  let totalMainSessions = 0;
  let totalHelperSessions = 0;

  for (const [dateStr, record] of Object.entries(store)) {
    if (!record) continue;
    const mm = record.morningMain || 0;
    const mh = record.morningHelper || 0;
    const am = record.afternoonMain || 0;
    const ah = record.afternoonHelper || 0;
    
    if (mm === 0 && mh === 0 && am === 0 && ah === 0) continue; // Bỏ qua bản ghi rỗng

    const dayPay = calculatePay(mm, mh, am, ah);
    totalSalary += dayPay;
    totalMainSessions += (mm + am);
    totalHelperSessions += (mh + ah);
  }

  // 2 buổi = 1 ngày công tròn
  const totalMainDays = totalMainSessions / 2;
  const totalHelperDays = totalHelperSessions / 2;

  // Cập nhật cả Navbar và Thẻ tổng tích lũy trong Sidebar
  if (navTotalSalary) navTotalSalary.textContent = formatMoney(totalSalary);
  if (globalTotalSalary) globalTotalSalary.textContent = formatMoney(totalSalary);
  
  if (globalTotalMain) globalTotalMain.textContent = `${Number(totalMainDays).toString()} công`;
  if (globalTotalHelper) globalTotalHelper.textContent = `${Number(totalHelperDays).toString()} công`;

  // Vẽ lại Lịch tháng
  renderCalendar();
}

/* --- Dynamic Monthly Calendar Generator --- */
function renderCalendar() {
  if (!calendarGrid || !calendarMonthTitle) return;

  const [yearStr, monthStr, dayStr] = activeDate.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-Indexed

  // Thiết lập tiêu đề tháng
  calendarMonthTitle.textContent = `Tháng ${monthStr} / ${yearStr}`;

  // Lấy tổng số ngày và ngày bắt đầu của tuần
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const cells = [];

  // 1. Thêm các ô trống trước ngày mùng 1
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ type: "empty" });
  }

  // 2. Thêm các ngày của tháng
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = d.toString().padStart(2, "0");
    const cellDateStr = `${yearStr}-${monthStr}-${dStr}`;
    
    const record = store[cellDateStr];
    let totalDays = 0;
    if (record) {
      const mm = record.morningMain || 0;
      const mh = record.morningHelper || 0;
      const am = record.afternoonMain || 0;
      const ah = record.afternoonHelper || 0;
      totalDays = (mm + mh + am + ah) / 2; // Quy đổi buổi sang ngày công
    }

    cells.push({
      type: "day",
      day: d,
      dateStr: cellDateStr,
      totalDays: totalDays
    });
  }

  // 3. Render HTML ra lưới 7 cột
  calendarGrid.innerHTML = cells
    .map((cell) => {
      if (cell.type === "empty") {
        return `<div class="calendar-cell empty"></div>`;
      }

      const isActiveDay = cell.dateStr === activeDate;
      const isLogged = cell.totalDays > 0;

      let classes = "calendar-cell";
      if (isActiveDay) {
        classes += " active-day-cell";
      } else if (isLogged) {
        classes += " logged-day-cell";
      }

      // Nhãn số công nhỏ gọn bên dưới ngày (e.g. 1.5 hoặc 2)
      const badgeHtml = isLogged
        ? `<span class="calendar-cell-badge">${Number(cell.totalDays).toString()}</span>`
        : "";

      return `
        <div class="${classes}" data-date="${cell.dateStr}">
          <span class="calendar-cell-date">${cell.day}</span>
          ${badgeHtml}
        </div>
      `;
    })
    .join("");
}

function closeSidebar() {
  const bsOffcanvas = bootstrap.Offcanvas.getInstance(sidebarMenu);
  if (bsOffcanvas) {
    bsOffcanvas.hide();
  }
}

/* --- Event Handlers & Event Listeners --- */
function handleDateChange() {
  activeDate = dateInput.value;
  loadActiveDateData();
  // Vẽ lại lịch tháng mỗi khi ngày (hoặc tháng) đổi
  renderCalendar();
}

dateInput.addEventListener("change", handleDateChange);

// Điều hướng Ngày nhanh
prevDateBtn.addEventListener("click", () => changeDateByOffset(-1));
nextDateBtn.addEventListener("click", () => changeDateByOffset(1));

/* --- BUỔI SÁNG COUNTER ACTIONS --- */
// Sáng: Thợ chính
decMorningMain.addEventListener("click", () => {
  if (morningMain > 0) {
    morningMain -= 1;
    updateActiveDayCalculations();
  }
});
incMorningMain.addEventListener("click", () => {
  morningMain += 1;
  updateActiveDayCalculations();
});

// Sáng: Thợ phụ
decMorningHelper.addEventListener("click", () => {
  if (morningHelper > 0) {
    morningHelper -= 1;
    updateActiveDayCalculations();
  }
});
incMorningHelper.addEventListener("click", () => {
  morningHelper += 1;
  updateActiveDayCalculations();
});

/* --- BUỔI CHIỀU COUNTER ACTIONS --- */
// Chiều: Thợ chính
decAfternoonMain.addEventListener("click", () => {
  if (afternoonMain > 0) {
    afternoonMain -= 1;
    updateActiveDayCalculations();
  }
});
incAfternoonMain.addEventListener("click", () => {
  afternoonMain += 1;
  updateActiveDayCalculations();
});

// Chiều: Thợ phụ
decAfternoonHelper.addEventListener("click", () => {
  if (afternoonHelper > 0) {
    afternoonHelper -= 1;
    updateActiveDayCalculations();
  }
});
incAfternoonHelper.addEventListener("click", () => {
  afternoonHelper += 1;
  updateActiveDayCalculations();
});

/* --- SAVE & CLEAR DAY ACTIONS --- */
// Lưu công ngày này
saveDayBtn.addEventListener("click", () => {
  if (morningMain === 0 && morningHelper === 0 && afternoonMain === 0 && afternoonHelper === 0) {
    // Nếu tất cả bằng 0, xóa ngày đó khỏi lịch sử
    delete store[activeDate];
  } else {
    store[activeDate] = {
      morningMain,
      morningHelper,
      afternoonMain,
      afternoonHelper
    };
  }

  saveStore();
  updateGlobalSummaryAndHistory();

  // Hiệu ứng lưu thành công xúc giác cho nút
  saveDayBtn.classList.add("save-success");
  setTimeout(() => {
    saveDayBtn.classList.remove("save-success");
  }, 400);
});

// Xóa ngày này
clearDayBtn.addEventListener("click", () => {
  if (morningMain === 0 && morningHelper === 0 && afternoonMain === 0 && afternoonHelper === 0) return;
  
  if (confirm(`Bạn có muốn xóa toàn bộ công thợ đã lưu của ngày ${formatDateDMY(activeDate)}?`)) {
    delete store[activeDate];
    saveStore();
    
    morningMain = 0;
    morningHelper = 0;
    afternoonMain = 0;
    afternoonHelper = 0;
    
    updateActiveDayCalculations();
    updateGlobalSummaryAndHistory();
  }
});

// Ủy quyền sự kiện Lịch tháng (Calendar Cells Clicks)
calendarGrid.addEventListener("click", (event) => {
  const cell = event.target.closest(".calendar-cell:not(.empty)");
  if (!cell) return;

  const targetDate = cell.dataset.date;
  if (targetDate) {
    activeDate = targetDate;
    dateInput.value = targetDate;
    loadActiveDateData();
    renderCalendar();
    
    // Đóng Sidebar trượt
    closeSidebar();
  }
});

// Sidebar Shortcuts Handlers
sidebarTodayShortcut.addEventListener("click", () => {
  activeDate = todayString();
  dateInput.value = activeDate;
  handleDateChange();
  // Đóng Sidebar trượt thông qua data-bs-dismiss="offcanvas" trong HTML
});

sidebarClearAllShortcut.addEventListener("click", () => {
  const confirm1 = confirm("Bạn có chắc chắn muốn XÓA TOÀN BỘ SỔ CÔNG đã lưu không?\nHành động này sẽ xóa sạch dữ liệu và không thể khôi phục!");
  if (!confirm1) return;
  
  const confirm2 = confirm("Xác nhận lần cuối: Toàn bộ ngày công tích lũy của tất cả các ngày sẽ bị xóa vĩnh viễn khỏi thiết bị này. Xác nhận xóa sạch?");
  if (confirm2) {
    store = {};
    saveStore();
    
    morningMain = 0;
    morningHelper = 0;
    afternoonMain = 0;
    afternoonHelper = 0;
    
    updateActiveDayCalculations();
    updateGlobalSummaryAndHistory();
    
    closeSidebar();
    alert("Đã xóa toàn bộ sổ công thành công!");
  }
});

/* --- Weekly wages calculation logic (T2 - T7) --- */
const VIETNAMESE_DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function getWeekRangeForDate(dateStr) {
  const parts = dateStr.split("-");
  const baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const currentDay = baseDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const mondayDate = new Date(baseDate);
  mondayDate.setDate(baseDate.getDate() + distanceToMonday);
  
  const weekDays = [];
  
  for (let i = 0; i < 6; i++) {
    const day = new Date(mondayDate);
    day.setDate(mondayDate.getDate() + i);
    
    const yyyy = day.getFullYear();
    const mm = (day.getMonth() + 1).toString().padStart(2, "0");
    const dd = day.getDate().toString().padStart(2, "0");
    weekDays.push(`${yyyy}-${mm}-${dd}`);
  }
  
  return weekDays;
}

function calculateWeeklyWages() {
  if (!weeklyModalList) return;

  const todayStr = todayString();
  const weekDays = getWeekRangeForDate(todayStr); // relative to current real system date

  let grandTotal = 0;
  let totalMainSessions = 0;
  let totalHelperSessions = 0;

  let htmlContent = "";

  weekDays.forEach((dateStr, index) => {
    const record = store[dateStr];
    const mm = record ? (record.morningMain || 0) : 0;
    const mh = record ? (record.morningHelper || 0) : 0;
    const am = record ? (record.afternoonMain || 0) : 0;
    const ah = record ? (record.afternoonHelper || 0) : 0;

    const dayPay = calculatePay(mm, mh, am, ah);
    grandTotal += dayPay;
    totalMainSessions += (mm + am);
    totalHelperSessions += (mh + ah);

    const dateParts = dateStr.split("-");
    const displayDate = `${dateParts[2]}/${dateParts[1]}`;
    const dayLabel = `${VIETNAMESE_DAYS[index]} (${displayDate})`;

    const hasWork = (mm + mh + am + ah) > 0;

    if (hasWork) {
      const mainDays = (mm + am) / 2;
      const helperDays = (mh + ah) / 2;
      htmlContent += `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-panel-dark">
          <div class="d-flex flex-column">
            <span class="fw-bold fs-7 text-light">${dayLabel}</span>
            <span class="fs-8 text-secondary">Chính: ${mainDays} công | Phụ: ${helperDays} công</span>
          </div>
          <span class="fw-extrabold fs-7 text-royal">${formatMoney(dayPay)}</span>
        </div>
      `;
    } else {
      htmlContent += `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-panel-dark opacity-50">
          <div class="d-flex flex-column">
            <span class="fw-bold fs-7 text-secondary">${dayLabel}</span>
            <span class="fs-8 text-muted">Không có ngày công</span>
          </div>
          <span class="fw-semibold fs-7 text-secondary">0đ</span>
        </div>
      `;
    }
  });

  weeklyModalList.innerHTML = htmlContent;

  const totalMainDays = totalMainSessions / 2;
  const totalHelperDays = totalHelperSessions / 2;

  weeklyTotalMain.textContent = `${totalMainDays} công`;
  weeklyTotalHelper.textContent = `${totalHelperDays} công`;
  weeklyGrandTotal.textContent = formatMoney(grandTotal);
}

if (sidebarWeeklyBtn) {
  sidebarWeeklyBtn.addEventListener("click", () => {
    calculateWeeklyWages();
    closeSidebar();
  });
}

/* --- Run App --- */
function startApp() {
  initTheme();
  dateInput.value = activeDate;
  loadActiveDateData();
  updateGlobalSummaryAndHistory();
}

startApp();
