const STORAGE_KEY = "tinhtiencong.days.v1";
const RATES = {
  main: 420000,
  helper: 340000,
};

const TYPE_LABELS = {
  main: "Thợ chính",
  helper: "Thợ phụ",
};

const dateInput = document.querySelector("#workDate");
const workerForm = document.querySelector("#workerForm");
const workerName = document.querySelector("#workerName");
const workerType = document.querySelector("#workerType");
const morning = document.querySelector("#morning");
const afternoon = document.querySelector("#afternoon");
const workerList = document.querySelector("#workerList");
const emptyState = document.querySelector("#emptyState");
const workerCount = document.querySelector("#workerCount");
const grandTotal = document.querySelector("#grandTotal");
const mainTotal = document.querySelector("#mainTotal");
const helperTotal = document.querySelector("#helperTotal");
const clearDayBtn = document.querySelector("#clearDayBtn");

let store = loadStore();

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

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

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function getWorkersForDate(date) {
  return store[date] || [];
}

function sessionCount(worker) {
  return Number(worker.morning) + Number(worker.afternoon);
}

function calculatePay(worker) {
  return (RATES[worker.type] * sessionCount(worker)) / 2;
}

function render() {
  const date = dateInput.value;
  const workers = getWorkersForDate(date);
  const totals = workers.reduce(
    (result, worker) => {
      const pay = calculatePay(worker);
      result.grand += pay;
      result[worker.type] += pay;
      return result;
    },
    { grand: 0, main: 0, helper: 0 }
  );

  grandTotal.textContent = formatMoney(totals.grand);
  mainTotal.textContent = formatMoney(totals.main);
  helperTotal.textContent = formatMoney(totals.helper);
  workerCount.textContent = `${workers.length} thợ`;
  emptyState.hidden = workers.length > 0;

  workerList.innerHTML = workers
    .map((worker) => {
      const sessions = [
        worker.morning ? "Sáng" : null,
        worker.afternoon ? "Chiều" : null,
      ]
        .filter(Boolean)
        .join(" + ");

      return `
        <article class="worker-card">
          <div>
            <p class="worker-name">${escapeHtml(worker.name)}</p>
            <div class="worker-meta">
              <span>${TYPE_LABELS[worker.type]}</span>
              <span>${sessions}</span>
            </div>
          </div>
          <div class="worker-pay">
            <strong>${formatMoney(calculatePay(worker))}</strong>
            <button class="delete-button" type="button" data-id="${worker.id}">Xóa</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}

workerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!morning.checked && !afternoon.checked) {
    alert("Vui lòng chọn ít nhất 1 buổi làm.");
    return;
  }

  const date = dateInput.value;
  const worker = {
    id: crypto.randomUUID(),
    name: workerName.value.trim(),
    type: workerType.value,
    morning: morning.checked,
    afternoon: afternoon.checked,
  };

  store[date] = [...getWorkersForDate(date), worker];
  saveStore();
  workerForm.reset();
  morning.checked = true;
  afternoon.checked = true;
  workerName.focus();
  render();
});

workerList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  const date = dateInput.value;
  store[date] = getWorkersForDate(date).filter((worker) => worker.id !== button.dataset.id);
  if (store[date].length === 0) {
    delete store[date];
  }
  saveStore();
  render();
});

dateInput.addEventListener("change", render);

clearDayBtn.addEventListener("click", () => {
  const date = dateInput.value;
  if (!getWorkersForDate(date).length) return;
  if (!confirm("Xóa toàn bộ công thợ của ngày này?")) return;

  delete store[date];
  saveStore();
  render();
});

dateInput.value = todayString();
render();
