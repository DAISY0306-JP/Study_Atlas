let logs = [];
let mockExams = [];
let reflections = [];
let reflectionType = "weekly";
let vocabWords = [];
let editingLogId = null;
let materialChart;
let skillChart;
let weakTagChart;
let examChart;
let examTotalChart;

const EXAM_CONFIG = window.STUDY_ATLAS_CONFIG || {};

const WEAK_TAGS_BY_SKILL = {
  読解: ["時間不足", "文法", "語彙"],
  ライティング: ["助詞", "接続詞", "語尾", "語彙不足"],
  リスニング: ["数字", "敬語", "会話問題", "スピード"]
};

const REFLECTION_LABELS = {
  weekly: {
    date: "週の開始日",
    good: "今週できたこと",
    weak: "苦手だったこと",
    next: "来週の目標"
  },
  monthly: {
    date: "対象月の1日",
    good: "今月よかったこと",
    weak: "苦手だったこと・課題",
    next: "来月に向けた改善点"
  }
};

const $ = (id) => document.getElementById(id);

if ($("date")) {
  $("date").valueAsDate = new Date();
}

if ($("reflectionDate")) {
  $("reflectionDate").valueAsDate = weekStart();
}

/* Utilities */

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

function daysUntil(dateStr) {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${dateStr}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.ceil((target - today) / msPerDay);
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

function weakTagCounts(sourceLogs = logs) {
  return sourceLogs.reduce((acc, log) => {
    (log.weakTags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
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
  return Number(document.querySelector('input[name="understanding"]:checked')?.value || 5);
}

function resetUnderstanding() {
  const defaultChoice = document.querySelector('input[name="understanding"][value="5"]');

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

function getTodayLogs() {
  const today = fmt(new Date());
  return logs.filter((log) => log.date === today);
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
    memo: row.memo,
    weakTags: row.weak_tags || []
  };
}

async function fetchLogs() {
  const { data, error } = await window.supabaseClient
    .from("study_logs")
    .select("*")
    .order("studied_at", { ascending: false });

  if (error) {
    console.error("学習ログの取得に失敗しました", error);
    return [];
  }

  return data.map(fromApi);
}

async function createLog(payload) {
  const { error } = await window.supabaseClient.from("study_logs").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateLog(id, payload) {
  const { error } = await window.supabaseClient.from("study_logs").update(payload).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteLog(id) {
  const { error } = await window.supabaseClient.from("study_logs").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function refreshLogs() {
  logs = await fetchLogs();
  render();
}

/* Mock exams */

function fromApiExam(row) {
  return {
    id: row.id,
    examNo: row.exam_no,
    date: row.taken_at,
    reading: row.reading_score,
    writing: row.writing_score,
    listening: row.listening_score,
    total: row.total_score,
    memo: row.memo
  };
}

async function fetchMockExams() {
  const { data, error } = await window.supabaseClient
    .from("mock_exams")
    .select("*")
    .order("taken_at", { ascending: true });

  if (error) {
    console.error("模試結果の取得に失敗しました", error);
    return [];
  }

  return data.map(fromApiExam);
}

async function createMockExam(payload) {
  const { error } = await window.supabaseClient.from("mock_exams").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteMockExam(id) {
  const { error } = await window.supabaseClient.from("mock_exams").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function refreshMockExams() {
  mockExams = await fetchMockExams();
  renderExams();
}

/* Reflections */

function fromApiReflection(row) {
  return {
    id: row.id,
    periodType: row.period_type,
    periodStart: row.period_start,
    goodPoints: row.good_points,
    weakPoints: row.weak_points,
    nextGoal: row.next_goal
  };
}

async function fetchReflections() {
  const { data, error } = await window.supabaseClient
    .from("reflections")
    .select("*")
    .order("period_start", { ascending: true });

  if (error) {
    console.error("振り返りの取得に失敗しました", error);
    return [];
  }

  return data.map(fromApiReflection);
}

async function createReflection(payload) {
  const { error } = await window.supabaseClient.from("reflections").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteReflection(id) {
  const { error } = await window.supabaseClient.from("reflections").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function refreshReflections() {
  reflections = await fetchReflections();
  renderReflectionList();
}

/* Vocab */

function fromApiVocab(row) {
  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    isWeak: row.is_weak,
    reviewCount: row.review_count,
    learnedAt: row.learned_at
  };
}

async function fetchVocabWords() {
  const { data, error } = await window.supabaseClient
    .from("vocab_words")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("単語の取得に失敗しました", error);
    return [];
  }

  return data.map(fromApiVocab);
}

async function createVocabWord(payload) {
  const { error } = await window.supabaseClient.from("vocab_words").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateVocabWord(id, patch) {
  const { error } = await window.supabaseClient.from("vocab_words").update(patch).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteVocabWord(id) {
  const { error } = await window.supabaseClient.from("vocab_words").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function refreshVocabWords() {
  vocabWords = await fetchVocabWords();
  renderVocab();
}

/* Weak tags */

function syncWeakTagsField() {
  const skill = $("skill").value;
  const hasTags = Object.prototype.hasOwnProperty.call(WEAK_TAGS_BY_SKILL, skill);

  $("weakTagsField").hidden = !hasTags;

  document.querySelectorAll(".weak-tags-group").forEach((group) => {
    const isMatch = group.dataset.weakSkill === skill;
    group.hidden = !isMatch;

    if (!isMatch) {
      group.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false;
      });
    }
  });
}

function getWeakTags() {
  return Array.from(document.querySelectorAll('input[name="weakTag"]:checked')).map(
    (checkbox) => checkbox.value
  );
}

function resetWeakTags() {
  document.querySelectorAll('input[name="weakTag"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
  syncWeakTagsField();
}

$("skill").addEventListener("change", syncWeakTagsField);
syncWeakTagsField();

/* Form */

/* Edit log */

function populateLogForm(log) {
  $("date").value = log.date;
  $("minutes").value = log.minutes;
  $("material").value = log.material;
  $("skill").value = log.skill;
  syncWeakTagsField();

  const understandingInput = document.querySelector(
    `input[name="understanding"][value="${log.understanding}"]`
  );
  if (understandingInput) understandingInput.checked = true;

  $("review").checked = Boolean(log.review);
  $("content").value = log.content || "";
  $("memo").value = log.memo || "";

  document.querySelectorAll('input[name="weakTag"]').forEach((checkbox) => {
    checkbox.checked = (log.weakTags || []).includes(checkbox.value);
  });
}

function enterEditMode(log) {
  editingLogId = log.id;
  populateLogForm(log);

  switchTab("view-record");
  document.querySelector(".quick-record-card").open = true;
  $("logFormSubmitBtn").textContent = "更新する";
  $("logFormCancelBtn").hidden = false;

  document
    .querySelector(".quick-record-card")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingLogId = null;
  $("logForm").reset();
  $("date").valueAsDate = new Date();
  resetUnderstanding();
  resetWeakTags();
  $("logFormSubmitBtn").textContent = "＋ 記録する";
  $("logFormCancelBtn").hidden = true;
}

$("logFormCancelBtn").addEventListener("click", () => {
  exitEditMode();
  document.querySelector(".quick-record-card").open = false;
});

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
    memo: $("memo").value.trim(),
    weak_tags: getWeakTags()
  };

  const isEditing = Boolean(editingLogId);

  try {
    if (isEditing) {
      await updateLog(editingLogId, payload);
    } else {
      await createLog(payload);
    }

    document.querySelector(".quick-record-card").open = false;
    exitEditMode();

    await refreshLogs();
  } catch (err) {
    console.error(err);
    alert(isEditing ? "更新に失敗しました。" : "記録の保存に失敗しました。");
  }
});

$("examForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    exam_no: $("examNo").value ? Number($("examNo").value) : null,
    taken_at: $("examDate").value,
    reading_score: Number($("examReading").value),
    writing_score: Number($("examWriting").value),
    listening_score: Number($("examListening").value),
    memo: $("examMemo").value.trim()
  };

  try {
    await createMockExam(payload);

    event.target.reset();

    await refreshMockExams();
  } catch (err) {
    console.error(err);
    alert("模試結果の保存に失敗しました。");
  }
});

/* Reflection type toggle */

function applyReflectionLabels() {
  const labels = REFLECTION_LABELS[reflectionType];

  $("reflectionDateLabel").textContent = labels.date;
  $("reflectionGoodLabel").textContent = labels.good;
  $("reflectionWeakLabel").textContent = labels.weak;
  $("reflectionNextLabel").textContent = labels.next;
}

const reflectionTypeButtons = document.querySelectorAll("[data-reflection-type]");

reflectionTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    reflectionType = button.dataset.reflectionType;

    reflectionTypeButtons.forEach((btn) => btn.classList.toggle("active", btn === button));

    applyReflectionLabels();
    renderReflectionList();
  });
});

applyReflectionLabels();

$("reflectionForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    period_type: reflectionType,
    period_start: $("reflectionDate").value,
    good_points: $("reflectionGood").value.trim(),
    weak_points: $("reflectionWeak").value.trim(),
    next_goal: $("reflectionNext").value.trim()
  };

  try {
    await createReflection(payload);

    event.target.reset();

    await refreshReflections();
  } catch (err) {
    console.error(err);
    alert("振り返りの保存に失敗しました。");
  }
});

$("vocabForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    word: $("vocabWord").value.trim(),
    meaning: $("vocabMeaning").value.trim(),
    is_weak: $("vocabWeak").checked,
    learned_at: fmt(new Date())
  };

  try {
    await createVocabWord(payload);

    event.target.reset();

    await refreshVocabWords();
  } catch (err) {
    console.error(err);
    alert("単語の保存に失敗しました。");
  }
});

/* Reload (PWA standalone mode has no browser reload UI) */

$("reloadBtn").addEventListener("click", () => {
  location.reload();
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

/* Quick tiles (one-tap record) */

document.querySelectorAll(".quick-tile").forEach((button) => {
  const originalContent = button.innerHTML;

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    button.disabled = true;

    try {
      await createLog({
        studied_at: fmt(new Date()),
        duration_minutes: Number(button.dataset.minutes),
        material: button.dataset.material,
        skill: button.dataset.skill,
        understanding: 5,
        needs_review: false,
        content: button.dataset.content || "",
        memo: ""
      });

      button.innerHTML = '<span class="quick-tile-check">✓ 記録しました</span>';
      await refreshLogs();

      setTimeout(() => {
        button.innerHTML = originalContent;
        button.disabled = false;
      }, 1200);
    } catch (err) {
      console.error(err);
      alert("記録の保存に失敗しました。");
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  });
});

/* Tab bar (mobile) */

const tabButtons = document.querySelectorAll(".tab-btn");
const tabViews = document.querySelectorAll(".tab-view");

function switchTab(target) {
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === target));
  tabViews.forEach((view) => view.classList.toggle("is-hidden-mobile", view.id !== target));

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (target === "view-dashboard") {
    materialChart?.resize();
    skillChart?.resize();
    weakTagChart?.resize();
    examChart?.resize();
    examTotalChart?.resize();
  }
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.view));
});

$("homeRecordBtn")?.addEventListener("click", () => switchTab("view-record"));

$("homeVocabBtn")?.addEventListener("click", () => {
  switchTab("view-dashboard");
  document.querySelector('[data-subview="sub-vocab"]')?.click();
});

/* Dashboard sub-tabs (mobile) */

const segmentButtons = document.querySelectorAll(".segment-btn");
const dashSubviews = document.querySelectorAll(".dash-subview");

segmentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.subview;

    segmentButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
    dashSubviews.forEach((view) => view.classList.toggle("is-hidden-mobile", view.id !== target));

    if (target === "sub-charts") {
      materialChart?.resize();
      skillChart?.resize();
      weakTagChart?.resize();
    }

    if (target === "sub-exams") {
      examChart?.resize();
      examTotalChart?.resize();
    }
  });
});

/* Charts */

function renderChart(canvasId, oldChart, grouped, label, unit = "分") {
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
            label: (context) => `${context.raw}${unit}`
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
            callback: (value) => `${value}${unit}`
          }
        }
      }
    }
  });
}

/* Mock exam charts */
/* Section scores (0-100 each) and the total (0-300) live on separate
   charts/axes since they're different scales — mixing them on one
   y-axis would misrepresent both. */

function examLineDataset(label, color, width, data) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: width,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: color,
    tension: 0,
    fill: false
  };
}

function baseLineOptions(maxScore) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#6B7C6B",
          font: { weight: "700" },
          boxWidth: 10,
          boxHeight: 10
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw}点`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B7C6B", font: { weight: "700" } }
      },
      y: {
        beginAtZero: true,
        max: maxScore,
        grid: { color: "rgba(213, 239, 217, 0.8)" },
        ticks: {
          color: "#6B7C6B",
          callback: (value) => `${value}点`
        }
      }
    }
  };
}

function examCard(exam) {
  const diffLabel =
    exam.diff === null || exam.diff === undefined
      ? ""
      : exam.diff > 0
        ? `<span class="exam-diff up">▲ ${exam.diff}</span>`
        : exam.diff < 0
          ? `<span class="exam-diff down">▼ ${Math.abs(exam.diff)}</span>`
          : `<span class="exam-diff">±0</span>`;

  return `
    <article class="exam-item">
      <div class="exam-item-header">
        <div class="log-date">
          <span class="log-chip">${escapeHtml(exam.date)}</span>
          ${exam.examNo ? `<span class="log-chip">第${escapeHtml(exam.examNo)}回</span>` : ""}
          ${diffLabel}
        </div>

        <button class="delete-btn" type="button" data-delete-exam="${escapeHtml(exam.id)}">
          削除
        </button>
      </div>

      <div class="exam-score-row">
        <span class="exam-score-pill">
          <span>読解</span>
          <strong>${escapeHtml(exam.reading)}</strong>
        </span>

        <span class="exam-score-pill">
          <span>作文</span>
          <strong>${escapeHtml(exam.writing)}</strong>
        </span>

        <span class="exam-score-pill">
          <span>リスニング</span>
          <strong>${escapeHtml(exam.listening)}</strong>
        </span>

        <span class="exam-score-pill total">
          <span>合計</span>
          <strong>${escapeHtml(exam.total)}</strong>
        </span>
      </div>

      ${exam.memo ? `<div class="log-memo">${escapeHtml(exam.memo)}</div>` : ""}
    </article>
  `;
}

function renderExamList() {
  const withDiff = mockExams.map((exam, index) => ({
    ...exam,
    diff: index > 0 ? exam.total - mockExams[index - 1].total : null
  }));

  const items = [...withDiff].reverse();

  $("examList").className = `list ${items.length ? "" : "empty"}`;
  $("examList").innerHTML = items.length ? items.map(examCard).join("") : "まだ記録がありません";
}

function renderExamHome() {
  const dday = daysUntil(EXAM_CONFIG.EXAM_DATE);
  $("examDday").textContent = dday === null ? "--日" : `${dday}日`;

  const target = EXAM_CONFIG.TARGET_SCORE?.total;
  $("examTarget").textContent = target ? `${target}点` : "--点";

  const latest = mockExams[mockExams.length - 1];
  $("examLatest").textContent = latest ? `${latest.total}点` : "--点";
}

function renderExams() {
  renderExamCharts();
  renderExamList();
  renderExamHome();
}

function renderExamCharts() {
  examChart?.destroy();
  examTotalChart?.destroy();

  if (!mockExams.length) {
    examChart = undefined;
    examTotalChart = undefined;
    return;
  }

  const labels = mockExams.map((exam) => exam.date);

  examChart = new Chart($("examSectionChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        examLineDataset(
          "読解",
          "#2a78d6",
          2,
          mockExams.map((exam) => exam.reading)
        ),
        examLineDataset(
          "リスニング",
          "#1baf7a",
          2,
          mockExams.map((exam) => exam.listening)
        ),
        examLineDataset(
          "作文",
          "#eda100",
          2,
          mockExams.map((exam) => exam.writing)
        )
      ]
    },
    options: baseLineOptions(100)
  });

  examTotalChart = new Chart($("examTotalChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        examLineDataset(
          "合計",
          "#35a64a",
          3,
          mockExams.map((exam) => exam.total)
        )
      ]
    },
    options: baseLineOptions(300)
  });
}

/* Reflections */

function reflectionCard(reflection) {
  const labels = REFLECTION_LABELS[reflection.periodType];

  return `
    <article class="log-item">
      <div class="log-item-header">
        <div class="log-date">
          <span class="log-chip">${escapeHtml(reflection.periodStart)}</span>
          <span class="log-chip">${reflection.periodType === "weekly" ? "週次" : "月次"}</span>
        </div>

        <button class="delete-btn" type="button" data-delete-reflection="${escapeHtml(reflection.id)}">
          削除
        </button>
      </div>

      ${
        reflection.goodPoints
          ? `<div class="log-content"><strong>${escapeHtml(labels.good)}：</strong>${escapeHtml(reflection.goodPoints)}</div>`
          : ""
      }

      ${
        reflection.weakPoints
          ? `<div class="log-content"><strong>${escapeHtml(labels.weak)}：</strong>${escapeHtml(reflection.weakPoints)}</div>`
          : ""
      }

      ${
        reflection.nextGoal
          ? `<div class="log-memo"><strong>${escapeHtml(labels.next)}：</strong>${escapeHtml(reflection.nextGoal)}</div>`
          : ""
      }
    </article>
  `;
}

function renderReflectionList() {
  const items = reflections
    .filter((r) => r.periodType === reflectionType)
    .slice()
    .reverse();

  $("reflectionList").className = `list ${items.length ? "" : "empty"}`;
  $("reflectionList").innerHTML = items.length
    ? items.map(reflectionCard).join("")
    : "まだ記録がありません";
}

/* Vocab */

function vocabCard(word) {
  return `
    <article class="log-item ${word.isWeak ? "needs-review" : ""}">
      <div class="log-item-header">
        <div class="log-date">
          <span class="log-chip">${escapeHtml(word.learnedAt)}</span>
          <span class="log-chip">復習${escapeHtml(word.reviewCount)}回</span>
        </div>

        <button class="delete-btn" type="button" data-delete-vocab="${escapeHtml(word.id)}">
          削除
        </button>
      </div>

      <div class="log-main">
        <span class="log-title">
          ${escapeHtml(word.word)}${word.meaning ? `・${escapeHtml(word.meaning)}` : ""}
        </span>
      </div>

      <div class="log-item-actions">
        <button type="button" class="ghost" data-review-vocab="${escapeHtml(word.id)}">
          復習した（+1）
        </button>

        <button type="button" class="ghost" data-toggle-weak-vocab="${escapeHtml(word.id)}">
          ${word.isWeak ? "苦手を解除" : "苦手にする"}
        </button>
      </div>
    </article>
  `;
}

function renderVocabList() {
  $("vocabList").className = `list ${vocabWords.length ? "" : "empty"}`;
  $("vocabList").innerHTML = vocabWords.length
    ? vocabWords.map(vocabCard).join("")
    : "まだ記録がありません";
}

function renderVocabStats() {
  const today = fmt(new Date());
  const totalCount = vocabWords.length;
  const todayCount = vocabWords.filter((w) => w.learnedAt === today).length;
  const weakCount = vocabWords.filter((w) => w.isWeak).length;

  $("vocabTotalCount").textContent = `${totalCount}語`;
  $("vocabTodayCount").textContent = `${todayCount}語`;
  $("vocabWeakCount").textContent = `${weakCount}語`;

  $("homeVocabTotal").textContent = `${totalCount}語`;
  $("homeVocabToday").textContent = `${todayCount}語`;
  $("homeVocabWeak").textContent = `${weakCount}語`;
}

function renderVocab() {
  renderVocabList();
  renderVocabStats();
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

/* Calendar (month heatmap) */

let calendarViewDate = new Date();

function calendarLevel(total, maxDay) {
  if (total <= 0) return 0;
  return Math.min(4, Math.ceil((total / maxDay) * 4));
}

function renderCalendarMonth() {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const today = fmt(new Date());

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyTotals = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dailyTotals.push(sum(logs.filter((log) => log.date === fmt(new Date(year, month, d)))));
  }

  const maxDay = Math.max(1, ...dailyTotals);

  const emptyCells = Array.from(
    { length: startWeekday },
    () => `<div class="cal-day is-empty"></div>`
  );

  const dayCells = dailyTotals.map((total, index) => {
    const d = index + 1;
    const dateKey = fmt(new Date(year, month, d));
    const level = calendarLevel(total, maxDay);
    const isToday = dateKey === today ? " is-today" : "";

    return `
      <div class="cal-day${isToday}" data-level="${level}" title="${dateKey}: ${total}分">
        ${d}
      </div>
    `;
  });

  $("calendarMonthLabel").textContent = `${year}年${month + 1}月`;
  $("calendarGrid").innerHTML = [...emptyCells, ...dayCells].join("");

  const now = new Date();
  $("calendarNextBtn").disabled = year === now.getFullYear() && month === now.getMonth();
}

$("calendarPrevBtn")?.addEventListener("click", () => {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
  renderCalendarMonth();
});

$("calendarNextBtn")?.addEventListener("click", () => {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
  renderCalendarMonth();
});

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

        <div class="log-item-buttons">
          <button class="edit-btn" type="button" data-edit-log="${escapeHtml(log.id)}">
            編集
          </button>

          <button class="delete-btn" type="button" data-delete-log="${escapeHtml(log.id)}">
            削除
          </button>
        </div>
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
        log.weakTags && log.weakTags.length
          ? `<div class="log-date">${log.weakTags
              .map((tag) => `<span class="log-chip">#${escapeHtml(tag)}</span>`)
              .join("")}</div>`
          : ""
      }

      ${log.memo ? `<div class="log-memo">${escapeHtml(log.memo)}</div>` : ""}
    </article>
  `;
}

function renderLogList() {
  const reviewLogs = logs.filter((log) => log.review || Number(log.understanding) <= 3).slice(0, 5);

  $("reviewList").className = `list ${reviewLogs.length ? "" : "empty"}`;
  $("reviewList").innerHTML = reviewLogs.length
    ? reviewLogs.map(logCard).join("")
    : "まだありません";

  $("logList").className = `list ${logs.length ? "" : "empty"}`;
  $("logList").innerHTML = logs.length
    ? logs.slice(0, 20).map(logCard).join("")
    : "まだ記録がありません";
}

/* Home */

function renderHome() {
  const todayMinutes = sum(getTodayLogs());
  const streak = calcStreak();
  const hour = new Date().getHours();

  const greeting = hour < 11 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";

  $("homeGreeting").textContent = greeting;
  $("homeStreak").textContent = `${streak}日`;
  $("homeToday").textContent = `${todayMinutes}分`;
  $("homeWeek").textContent = `${sum(getThisWeekLogs())}分`;
  $("homeMonth").textContent = `${sum(getThisMonthLogs())}分`;

  $("homeMessage").textContent =
    todayMinutes > 0
      ? `今日はもう${todayMinutes}分記録済みです。お疲れさまでした！`
      : streak > 0
        ? `${streak}日連続中！今日も続けましょう。`
        : "今日の学習を記録しましょう！";
}

/* Delegated click actions (edit / delete / review / toggle) */

const CLICK_ACTIONS = [
  {
    selector: "[data-edit-log]",
    run: (button) => {
      const log = logs.find((l) => l.id === button.dataset.editLog);
      if (log) enterEditMode(log);
    }
  },
  {
    selector: "[data-delete-log]",
    run: (button) => deleteLog(button.dataset.deleteLog).then(refreshLogs),
    errorMessage: "削除に失敗しました。"
  },
  {
    selector: "[data-delete-exam]",
    run: (button) => deleteMockExam(button.dataset.deleteExam).then(refreshMockExams),
    errorMessage: "削除に失敗しました。"
  },
  {
    selector: "[data-delete-reflection]",
    run: (button) => deleteReflection(button.dataset.deleteReflection).then(refreshReflections),
    errorMessage: "削除に失敗しました。"
  },
  {
    selector: "[data-delete-vocab]",
    run: (button) => deleteVocabWord(button.dataset.deleteVocab).then(refreshVocabWords),
    errorMessage: "削除に失敗しました。"
  },
  {
    selector: "[data-review-vocab]",
    run: (button) => {
      const word = vocabWords.find((w) => w.id === button.dataset.reviewVocab);
      if (!word) return;

      return updateVocabWord(word.id, {
        review_count: word.reviewCount + 1,
        last_reviewed_at: fmt(new Date())
      }).then(refreshVocabWords);
    },
    errorMessage: "更新に失敗しました。"
  },
  {
    selector: "[data-toggle-weak-vocab]",
    run: (button) => {
      const word = vocabWords.find((w) => w.id === button.dataset.toggleWeakVocab);
      if (!word) return;

      return updateVocabWord(word.id, { is_weak: !word.isWeak }).then(refreshVocabWords);
    },
    errorMessage: "更新に失敗しました。"
  }
];

document.addEventListener("click", async (event) => {
  for (const action of CLICK_ACTIONS) {
    const button = event.target.closest(action.selector);
    if (!button) continue;

    try {
      await action.run(button);
    } catch (err) {
      console.error(err);
      if (action.errorMessage) alert(action.errorMessage);
    }
    return;
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

  skillChart = renderChart("skillChart", skillChart, groupBy("skill", thisMonthLogs), "学習時間");

  weakTagChart = renderChart("weakTagChart", weakTagChart, weakTagCounts(), "苦手回数", "回");

  renderCalendarMonth();
  renderLogList();
  renderHome();
}

/* Log in / log out triggers the actual data load, since fetching
   requires an access token from Supabase Auth. */
document.addEventListener("study-atlas:session-changed", async (event) => {
  if (!event.detail) {
    logs = [];
    mockExams = [];
    reflections = [];
    vocabWords = [];
    renderExamHome();
    renderReflectionList();
    renderVocab();
    renderCalendarMonth();
    return;
  }

  await Promise.all([refreshLogs(), refreshMockExams(), refreshReflections(), refreshVocabWords()]);
  materialChart?.resize();
  skillChart?.resize();
  weakTagChart?.resize();
  examChart?.resize();
  examTotalChart?.resize();
});

renderExamHome();
renderCalendarMonth();
