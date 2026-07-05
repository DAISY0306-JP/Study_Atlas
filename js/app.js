const key = "koreanStudyLogs.v1";

let logs = JSON.parse(localStorage.getItem(key) || "[]");
let materialChart;
let skillChart;

const $ = (id) => document.getElementById(id);

if ($("date")) {
  $("date").valueAsDate = new Date();
}

/* Utilities */

function save() {
  localStorage.setItem(key, JSON.stringify(logs));
  render();
}

function fmt(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function weekStart() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;

  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);

  return d;
}

function sum(arr) {
  return arr.reduce((total, log) => total + Number(log.minutes || 0), 0);
}

function groupBy(field, sourceLogs = logs) {
  return sourceLogs.reduce((acc, log) => {
    const key = log[field] || "未設定";
    acc[key] = (acc[key] || 0) + Number(log.minutes || 0);
    return acc;
  }, {});
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function understandingLabel(value) {
  const labels = {
    5: "🌟 定着した",
    4: "🙂 だいたいOK",
    3: "🔁 復習したい",
    2: "🌀 まだ曖昧",
    1: "🌱 未理解"
  };

  return labels[value] || "未設定";
}

function getUnderstandingValue() {
  return Number(
    document.querySelector('input[name="understanding"]:checked')?.value || 5
  );
}

function resetUnderstanding() {
  const defaultChoice = document.querySelector(
    'input[name="understanding"][value="5"]'
  );

  if (defaultChoice) {
    defaultChoice.checked = true;
  }
}

function getThisMonthLogs() {
  return logs.filter((log) => new Date(log.date) >= monthStart());
}

function getThisWeekLogs() {
  return logs.filter((log) => new Date(log.date) >= weekStart());
}

/* Form */

$("logForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const newLog = {
    id: createId(),
    date: $("date").value,
    minutes: Number($("minutes").value),
    material: $("material").value,
    skill: $("skill").value,
    understanding: getUnderstandingValue(),
    review: $("review").checked,
    content: $("content").value.trim(),
    memo: $("memo").value.trim(),
    createdAt: new Date().toISOString()
  };

  logs.unshift(newLog);

  event.target.reset();
  $("date").valueAsDate = new Date();
  resetUnderstanding();

  save();
});

/* Sample data */

$("sampleBtn").addEventListener("click", () => {
  const today = new Date();

  const samples = [
    ["Duolingo", "単語", 15, 4, "Unit復習・例文音読"],
    ["TOPIK文法", "文法", 35, 3, "지만 / 그런데 / 아무래도"],
    ["ドラマ", "リスニング", 40, 4, "聞き取れた表現メモ"],
    ["TOPIK単語", "単語", 25, 3, "中級単語30個"],
    ["ChatGPT", "文化・表現", 20, 5, "SNS表現のニュアンス確認"]
  ];

  const sampleLogs = samples.map((sample, index) => {
    const d = new Date(today);
    d.setDate(d.getDate() - index);

    return {
      id: createId(),
      date: fmt(d),
      material: sample[0],
      skill: sample[1],
      minutes: sample[2],
      understanding: sample[3],
      content: sample[4],
      memo: "",
      review: sample[3] <= 3,
      createdAt: new Date().toISOString()
    };
  });

  logs = sampleLogs.concat(logs);
  save();
});

/* Quick chips */

document.querySelectorAll(".quick-chip").forEach((button) => {
  button.addEventListener("click", () => {
    $("minutes").value = button.dataset.minutes || "";
    $("material").value = button.dataset.material || "Duolingo";
    $("skill").value = button.dataset.skill || "単語";
    $("content").value = button.dataset.content || "";

    const formCard = document.querySelector(".quick-record-card");
    formCard?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

/* Charts */

function renderChart(canvasId, oldChart, grouped, label) {
  const labels = Object.keys(grouped);
  const data = Object.values(grouped);

  oldChart?.destroy();

  const hasData = labels.length > 0;

  return new Chart($(canvasId), {
    type: "bar",
    data: {
      labels: hasData ? labels : ["No data"],
      datasets: [
        {
          label,
          data: hasData ? data : [0],
          borderWidth: 0,
          borderRadius: 14,
          backgroundColor: "#58CC6C",
          hoverBackgroundColor: "#35A64A"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw}分`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: "#6B7C6B",
            font: {
              weight: "700"
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(213, 239, 217, 0.8)"
          },
          ticks: {
            color: "#6B7C6B",
            callback: (value) => `${value}分`
          }
        }
      }
    }
  });
}

/* Streak */

function calcStreak() {
  const dates = new Set(logs.map((log) => log.date));
  let streak = 0;
  const d = new Date();

  while (dates.has(fmt(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

/* Calendar */

function renderCalendar() {
  const now = new Date();
  const days = [];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    days.push(d);
  }

  const dailyTotals = days.map((day) => {
    return sum(logs.filter((log) => log.date === fmt(day)));
  });

  const maxDay = Math.max(1, ...dailyTotals);

  $("calendar").innerHTML = days
    .map((day, index) => {
      const dateKey = fmt(day);
      const total = dailyTotals[index];
      const isToday = dateKey === fmt(now);
      const percent = Math.min(100, (total / maxDay) * 100);

      return `
        <div class="day ${isToday ? "today" : ""}">
          <small>${weekdays[day.getDay()]} ${day.getMonth() + 1}/${day.getDate()}</small>
          <strong>${total}<span>分</span></strong>
          <div class="bar">
            <i style="width: ${percent}%"></i>
          </div>
        </div>
      `;
    })
    .join("");
}

/* Log cards */

function logCard(log) {
  const needsReview = log.review || Number(log.understanding) <= 3;

  return `
    <article class="log-item ${needsReview ? "needs-review" : ""}">
      <div class="log-item-header">
        <div class="log-date">
          <span class="log-chip">${escapeHtml(log.date)}</span>
          <span class="log-chip">${escapeHtml(log.minutes)}分</span>
        </div>

        <button class="delete-btn" type="button" data-delete-log="${escapeHtml(log.id)}">
          削除
        </button>
      </div>

      <div class="log-main">
        <span class="log-title">
          ${escapeHtml(log.material)}・${escapeHtml(log.skill)}
        </span>

        <span class="level-badge">
          ${understandingLabel(log.understanding)}
        </span>
      </div>

      <div class="log-content">
        ${escapeHtml(log.content || "内容なし")}
      </div>

      ${
        log.memo
          ? `<div class="log-memo">${escapeHtml(log.memo)}</div>`
          : ""
      }
    </article>
  `;
}

function renderLogList() {
  const reviewLogs = logs
    .filter((log) => log.review || Number(log.understanding) <= 3)
    .slice(0, 5);

  $("reviewList").className = `list ${reviewLogs.length ? "" : "empty"}`;
  $("reviewList").innerHTML = reviewLogs.length
    ? reviewLogs.map(logCard).join("")
    : "まだありません";

  $("logList").className = `list ${logs.length ? "" : "empty"}`;
  $("logList").innerHTML = logs.length
    ? logs.slice(0, 20).map(logCard).join("")
    : "まだ記録がありません";
}

/* Delete log */

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-log]");

  if (!button) return;

  const id = button.dataset.deleteLog;
  logs = logs.filter((log) => log.id !== id);

  save();
});

/* Render */

function render() {
  const thisMonthLogs = getThisMonthLogs();
  const thisWeekLogs = getThisWeekLogs();

  $("monthTotal").textContent = `${sum(thisMonthLogs)}分`;
  $("weekTotal").textContent = `${sum(thisWeekLogs)}分`;
  $("streak").textContent = `${calcStreak()}日`;

  materialChart = renderChart(
    "materialChart",
    materialChart,
    groupBy("material", thisMonthLogs),
    "学習時間"
  );

  skillChart = renderChart(
    "skillChart",
    skillChart,
    groupBy("skill", thisMonthLogs),
    "学習時間"
  );

  renderCalendar();
  renderLogList();
}

render();

/* Charts need a resize once the app becomes visible again after login,
   since Chart.js measured a 0-size canvas while .app was hidden. */
document.addEventListener("study-atlas:session-changed", (event) => {
  if (!event.detail) return;

  materialChart?.resize();
  skillChart?.resize();
});