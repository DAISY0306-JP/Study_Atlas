const apiBaseUrl = window.STUDY_ATLAS_CONFIG.API_BASE_URL;

let logs = [];
let materialChart;
let skillChart;

const $ = (id) => document.getElementById(id);

if ($("date")) {
  $("date").valueAsDate = new Date();
}

/* Utilities */

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${window.getAccessToken()}`
  };
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

/* API */

function fromApi(row) {
  return {
    id: row.id,
    date: row.studied_at,
    minutes: row.duration_minutes,
    material: row.material,
    skill: row.skill,
    understanding: row.understanding,
    review: row.needs_review,
    content: row.content,
    memo: row.memo
  };
}

async function fetchLogs() {
  const res = await fetch(`${apiBaseUrl}/study-logs`, { headers: authHeaders() });

  if (!res.ok) {
    console.error("学習ログの取得に失敗しました", await res.text());
    return [];
  }

  const data = await res.json();
  return data.map(fromApi);
}

async function createLog(payload) {
  const res = await fetch(`${apiBaseUrl}/study-logs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

async function deleteLog(id) {
  const res = await fetch(`${apiBaseUrl}/study-logs/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

async function refreshLogs() {
  logs = await fetchLogs();
  render();
}

/* Form */

$("logForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    studied_at: $("date").value,
    duration_minutes: Number($("minutes").value),
    material: $("material").value,
    skill: $("skill").value,
    understanding: getUnderstandingValue(),
    needs_review: $("review").checked,
    content: $("content").value.trim(),
    memo: $("memo").value.trim()
  };

  try {
    await createLog(payload);

    event.target.reset();
    $("date").valueAsDate = new Date();
    resetUnderstanding();

    await refreshLogs();
  } catch (err) {
    console.error(err);
    alert("記録の保存に失敗しました。");
  }
});

/* Sample data */

$("sampleBtn").addEventListener("click", async () => {
  const today = new Date();

  const samples = [
    ["Duolingo", "単語", 15, 4, "Unit復習・例文音読"],
    ["TOPIK文法", "文法", 35, 3, "지만 / 그런데 / 아무래도"],
    ["ドラマ", "リスニング", 40, 4, "聞き取れた表現メモ"],
    ["TOPIK単語", "単語", 25, 3, "中級単語30個"],
    ["ChatGPT", "文化・表現", 20, 5, "SNS表現のニュアンス確認"]
  ];

  try {
    for (const [index, sample] of samples.entries()) {
      const d = new Date(today);
      d.setDate(d.getDate() - index);

      await createLog({
        studied_at: fmt(d),
        material: sample[0],
        skill: sample[1],
        duration_minutes: sample[2],
        understanding: sample[3],
        content: sample[4],
        memo: "",
        needs_review: sample[3] <= 3
      });
    }

    await refreshLogs();
  } catch (err) {
    console.error(err);
    alert("サンプルデータの追加に失敗しました。");
  }
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

/* Tab bar (mobile) */

const tabButtons = document.querySelectorAll(".tab-btn");
const tabViews = document.querySelectorAll(".tab-view");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.view;

    tabButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
    tabViews.forEach((view) => view.classList.toggle("is-hidden-mobile", view.id !== target));

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (target === "view-dashboard") {
      materialChart?.resize();
      skillChart?.resize();
    }
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

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-log]");

  if (!button) return;

  try {
    await deleteLog(button.dataset.deleteLog);
    await refreshLogs();
  } catch (err) {
    console.error(err);
    alert("削除に失敗しました。");
  }
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

/* Log in / log out triggers the actual data load, since fetching
   requires an access token from Supabase Auth. */
document.addEventListener("study-atlas:session-changed", async (event) => {
  if (!event.detail) {
    logs = [];
    return;
  }

  await refreshLogs();
  materialChart?.resize();
  skillChart?.resize();
});
