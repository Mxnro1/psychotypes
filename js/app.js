// ===============================
// ГЛОБАЛЬНЫЕ МОДЕЛИ
// ===============================
let MODEL = null;
let QUESTIONS_MODEL = null;
let WEIGHTS_MODEL = null;

// ===============================
// Навигация
// ===============================
function openSection(key) {
  document.getElementById("home").style.display = "none";
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById("section-" + key).classList.add("active");
}

function goHome() {
  document.getElementById("home").style.display = "block";
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
}

// ===============================
// Загрузка моделей
// ===============================
async function loadModel() {
  try {
    // loadModel will be called on DOM ready (guard added after function)
    const [psy, q, w, t] = await Promise.all([
      fetch("data/psychotypes.json"),
      fetch("data/questions_full.json").catch(() => null),
      fetch("data/weights.json").catch(() => null),
      fetch("data/interpret_triggers.json").catch(() => null)
    ]);

    MODEL = await psy.json();
    fillSelects();
    // Load optional models
    if (q && q.ok && w && w.ok) {
      QUESTIONS_MODEL = await q.json();
      WEIGHTS_MODEL = await w.json();
      renderFullTestUI();
    }

    // Load interpretation triggers if available (fallback to default already in INTERP_TRIGGERS)
    if (t && t.ok) {
      try {
        const loaded = await t.json();
        if (Array.isArray(loaded) && loaded.length > 0) INTERP_TRIGGERS = loaded;
      } catch (e) {
        console.warn('Failed to parse interpret_triggers.json, using default triggers', e);
      }
    }
  } catch (e) {
    console.error("Ошибка загрузки:", e);
    alert("Ошибка загрузки модели.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadModel);
} else {
  loadModel();
}

// ===============================
// Вспомогательные функции
// ===============================
function getRadical(id) {
  return MODEL?.radicals?.[id] || null;
}

function getInfluence(fromId, toId) {
  return MODEL?.influence_matrix?.[fromId]?.[toId] || null;
}

function fillSelects() {
  const lists = [
    "types-main", "types-second", "types-third",
    "role-main", "role-second", "role-third"
  ];

  lists.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;

    Object.entries(MODEL.radicals).forEach(([key, val]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${key} — ${val.name}`;
      sel.appendChild(opt);
    });
  });
}

// ===============================
// КРАТКИЙ ПРОФИЛЬ (ВАРИАНТ А)
// ===============================
function buildShortProfile(coreId, shellId, markId) {
  const core = getRadical(coreId);
  const shell = shellId ? getRadical(shellId) : null;
  const mark = markId ? getRadical(markId) : null;

  let html = `<h3>Комбинация радикалов</h3>`;
  html += `<p><strong>Ядро:</strong> ${core.name}</p>`;
  if (shell) html += `<p><strong>Оболочка:</strong> ${shell.name}</p>`;
  if (mark) html += `<p><strong>Стресс-профиль:</strong> ${mark.name}</p>`;

  html += `<hr><h3>Сильные стороны</h3><ul>`;
  (core.strengths || []).forEach(s => html += `<li>${s}</li>`);
  if (shell) (shell.strengths || []).slice(0, 2).forEach(s => html += `<li>${s} (оболочка)</li>`);
  html += `</ul>`;

  html += `<h3>Риски</h3><ul>`;
  (core.weaknesses || []).forEach(s => html += `<li>${s}</li>`);
  if (shell) (shell.weaknesses || []).slice(0, 2).forEach(s => html += `<li>${s} (оболочка)</li>`);
  if (mark) (mark.weaknesses || []).slice(0, 1).forEach(s => html += `<li>[стресс] ${s}</li>`);
  html += `</ul>`;

  return html;
}

// ===============================
// ПОЛНЫЙ ПРОФИЛЬ
// ===============================
const MANAGEMENT_STYLE_BY_CORE = {
  "1": { do: ["давать динамичные задачи"], avoid: ["рутина"] },
  "2": { do: ["поддержка"], avoid: ["публичная критика"] },
  "3": { do: ["чёткие правила"], avoid: ["хаос"] },
  "4": { do: ["спокойная среда"], avoid: ["много общения"] },
  "5": { do: ["похвала"], avoid: ["обесценивание"] },
  "6": { do: ["ясные инструкции"], avoid: ["давление страхом"] },
  "7": { do: ["полномочия"], avoid: ["подрыв авторитета"] }
};

function buildFullProfile(coreId, shellId, markId) {
  const core = getRadical(coreId);
  const shell = shellId ? getRadical(shellId) : null;
  const mark = markId ? getRadical(markId) : null;
  const ms = MANAGEMENT_STYLE_BY_CORE[coreId] || { do: [], avoid: [] };

  let html = `<h3>Полный разбор психотипа</h3>`;
  html += `<p><strong>Ядро:</strong> ${core.name}</p>`;
  if (shell) html += `<p><strong>Оболочка:</strong> ${shell.name}</p>`;
  if (mark) html += `<p><strong>Стресс-профиль:</strong> ${mark?.name || "-"}</p>`;
  html += `<hr>`;

  html += `<h4>1. Обычное поведение</h4>`;
  html += `<p>${core?.long_behavior || (core?.core_traits ? (core.core_traits.join('. ')) : (core?.short || ""))}</p>`;
  if (shell) html += `<p><strong>Оболочка усиливает:</strong> ${shell?.long_behavior || (shell.core_traits ? (shell.core_traits.join('. ')) : (shell.short || ""))}</p>`;

  if (mark) {
    html += `<h4>2. Поведение под стрессом</h4>`;
    html += `<p>${mark.stress_behavior || mark.short || ""}</p>`;
  }

  const motivations = core?.motivation || core?.core_traits || [];
  html += `<h4>3. Мотивация</h4><ul>`;
  (motivations || []).forEach(m => html += `<li>${m}</li>`);
  html += `</ul>`;

  const demot = core?.demotivation || core?.weaknesses || [];
  html += `<h4>4. Демотивация</h4><ul>`;
  (demot || []).forEach(m => html += `<li>${m}</li>`);
  html += `</ul>`;

  html += `<h4>5. Сильные стороны</h4><ul>`;
  (core.strengths || []).forEach(s => html += `<li>${s}</li>`);
  if (shell) (shell.strengths || []).forEach(s => html += `<li>${s} (оболочка)</li>`);
  html += `</ul>`;

  html += `<h4>6. Риски</h4><ul>`;
  (core.weaknesses || []).forEach(s => html += `<li>${s}</li>`);
  if (shell) (shell.weaknesses || []).forEach(s => html += `<li>${s} (оболочка)</li>`);
  if (mark) (mark.weaknesses || []).forEach(s => html += `<li>[стресс] ${s}</li>`);
  html += `</ul>`;

  html += `<h4>7. Рекомендации руководителю</h4><ul>`;
  (ms.do || []).forEach(s => html += `<li>${s}</li>`);
  html += `</ul>`;

  html += `<h4>Чего избегать</h4><ul>`;
  (ms.avoid || []).forEach(s => html += `<li>${s}</li>`);
  html += `</ul>`;

  return html;
}

function toggleFullProfile() {
  const box = document.getElementById("types-full");
  const btn = document.getElementById("btn-full-profile");

  if (box.style.display === "none") {
    box.style.display = "block";
    btn.textContent = "Скрыть полный разбор";
  } else {
    box.style.display = "none";
    btn.textContent = "Показать полный разбор";
  }
}

// ===============================
// Блок 1: Показ профиля
// ===============================
function showTypeCombo() {
  const main = document.getElementById("types-main").value;
  const second = document.getElementById("types-second").value;
  const third = document.getElementById("types-third").value;

  const box = document.getElementById("types-result");
  box.style.display = "block";

  if (!main) {
    box.innerHTML = "Выбери хотя бы ядро.";
    return;
  }

  // краткий профиль
  box.innerHTML = buildShortProfile(main, second, third);

  // показать кнопку
  const btn = document.getElementById("btn-full-profile");
  btn.style.display = "inline-block";

  // подготовить скрытый полный профиль
  const fullBox = document.getElementById("types-full");
  fullBox.innerHTML = buildFullProfile(main, second, third);
  fullBox.style.display = "none";
}

// ===============================
// Блок 1: Подбор ролей
// ===============================
function runRolePicker() {
  const main = document.getElementById("types-main").value;
  const second = document.getElementById("types-second").value;
  const third = document.getElementById("types-third").value;

  const box = document.getElementById("role-result");
  box.style.display = "block";

  if (!main) {
    box.innerHTML = "Укажи ядро.";
    return;
  }

  const all = [main, second, third].filter(Boolean).map(id => getRadical(id));
  const good = new Set();
  const bad = new Set();

  all.forEach(r => {
    r.work_best.forEach(x => good.add(x));
    r.work_bad.forEach(x => bad.add(x));
  });

  let html = `<h3>Подбор ролей</h3>`;

  html += `<p><strong>Подходящие роли</strong></p><ul>`;
  good.forEach(r => html += `<li>${r}</li>`);
  html += `</ul>`;

  html += `<p><strong>Роли с рисками</strong></p><ul>`;
  bad.forEach(r => html += `<li>${r}</li>`);
  html += `</ul>`;

  box.innerHTML = html;
}

// ===============================
// Блок 2: Полный тест
// ===============================
function renderFullTestUI() {
  const box = document.getElementById("full-test-container");
  if (!QUESTIONS_MODEL) return;

  let html = `<div class="test-box">`;

  QUESTIONS_MODEL.questions.forEach((q, i) => {
    html += `
      <div class="question">
        <div><strong>${i + 1}.</strong> ${q.text}</div>
        <div class="scale" role="radiogroup" aria-labelledby="q-${q.id}">
          ${[1,2,3,4,5].map(v => `
            <label class="scale-btn">
              <input type="radio" name="${q.id}" value="${v}" aria-label="${v}">
              <span>${v}</span>
            </label>
          `).join("")}
          <div class="scale-label">1 — не похоже · 5 — очень похоже</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  box.innerHTML = html;
}

function computeFullTestResult(answers) {
  const score = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};

  Object.entries(answers).forEach(([qid, val]) => {
    const w = WEIGHTS_MODEL.weights[qid];
    if (!w) return;

    Object.entries(w).forEach(([rad, weight]) => {
      score[rad] += val * weight;
    });
  });

  const sorted = Object.entries(score).sort((a,b)=>b[1]-a[1]);

  return {
    core: sorted[0][0],
    shell: sorted[1][0],
    mark: sorted[2][0]
  };
}

function handleFullTestSubmit() {
  const answers = {};
  let missing = 0;

  QUESTIONS_MODEL.questions.forEach(q => {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    if (!selected) missing++;
    else answers[q.id] = Number(selected.value);
  });

  const box = document.getElementById("full-test-result");
  box.style.display = "block";

  if (missing > 0) {
    box.innerHTML = `Не заполнено ${missing} вопросов.`;
    return;
  }

  const res = computeFullTestResult(answers);

  box.innerHTML = `
    <h3>Результат</h3>
    <p><strong>Ядро:</strong> ${getRadical(res.core).name}</p>
    <p><strong>Оболочка:</strong> ${getRadical(res.shell).name}</p>
    <p><strong>Метка:</strong> ${getRadical(res.mark).name}</p>
    <hr>
    ${buildShortProfile(res.core, res.shell, res.mark)}
  `;
}

// ===============================
// Блок 3: Интерпретация по характеристикам
// ===============================
// Traits mapped to radicals with weights
const TRAITS_BY_RADICAL = {
  "1": { name: "Гипертим", traits: ["Энергичный", "Активный", "Общительный", "Спонтанный", "Инициативный", "Любит новизну", "Быстрый", "Импульсивный"] },
  "2": { name: "Эмотив", traits: ["Эмпатичный", "Чувствительный", "Заботливый", "Поддерживающий", "Дружелюбный", "Понимающий", "Мягкий", "Волнуется за других"] },
  "3": { name: "Эпилептоид", traits: ["Пунктуальный", "Дисциплинированный", "Педантичный", "Структурированный", "Ответственный", "Аккуратный", "Систематичный", "Требовательный к качеству"] },
  "4": { name: "Шизоид", traits: ["Аналитичный", "Глубокий", "Интровертированный", "Логичный", "Независимый", "Углубленный в детали", "Сдержанный", "Вдумчивый"] },
  "5": { name: "Истероид", traits: ["Ярый", "Харизматичный", "Демонстративный", "Общительный на публике", "Творческий", "Яркий", "Внимание к внешности", "Импульсивный в эмоциях"] },
  "6": { name: "Тревожный", traits: ["Осторожный", "Предусмотрительный", "Тревожный", "Внимателен к деталям", "Опасается ошибок", "Переживающий", "Сомневается", "Думает перед действием"] },
  "7": { name: "Паранойял", traits: ["Решительный", "Ответственный", "Волевой", "Командный", "Конкурентоспособный", "Целеустремленный", "Агрессивный в целях", "Контролирующий"] }
};

function renderTraitsUI() {
  const container = document.getElementById("traits-container");
  if (!container) return;

  let html = '';
  Object.entries(TRAITS_BY_RADICAL).forEach(([id, data]) => {
    html += `<div style="margin-bottom:20px;">`;
    html += `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px;">`;
    data.traits.forEach(trait => {
      const checkId = `trait-${id}-${trait.replace(/\s+/g, '_')}`;
      html += `
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px;">
          <input type="checkbox" id="${checkId}" data-radical="${id}" data-weight="1" class="trait-checkbox">
          <span>${trait}</span>
        </label>
      `;
    });
    html += `</div></div>`;
  });

  container.innerHTML = html;
}

function computeTraitsInterpretation() {
  const name = document.getElementById("interp-name").value || "Сотрудник";
  const box = document.getElementById("interp-result");
  box.style.display = "block";

  // Collect selected traits
  const checkboxes = document.querySelectorAll(".trait-checkbox:checked");
  if (checkboxes.length === 0) {
    box.innerHTML = "Выбери хотя бы одну характеристику.";
    return;
  }

  const score = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  const selectedTraits = [];

  checkboxes.forEach(cb => {
    const radical = cb.dataset.radical;
    const weight = parseInt(cb.dataset.weight) || 1;
    const traitName = cb.nextElementSibling ? cb.nextElementSibling.textContent : "Черта";
    const radicalName = TRAITS_BY_RADICAL[radical].name;
    score[radical] += weight;
    selectedTraits.push({ radical, radicalName, traitName });
  });

  // Sort by score
  const sorted = Object.entries(score).sort((a,b) => b[1] - a[1]);
  const coreId = sorted[0][0];
  const shellId = sorted[1][0];
  const markId = sorted[2][0];

  const coreObj = getRadical(coreId) || { name: '-' };
  const shellObj = getRadical(shellId) || { name: '-' };
  const markObj = getRadical(markId) || { name: '-' };

  // Build traits list with radical names
  const traitsHtml = '<ul>' + selectedTraits.map(t => `<li>Радикал ${t.radical} — <strong>${t.radicalName}</strong> — ${t.traitName}</li>`).join('') + '</ul>';

  // Build score bar visualization
  const maxScore = Math.max(...Object.values(score), 1);
  const scoreBarHtml = Object.entries(score)
    .map(([radical, val]) => {
      const radicalName = TRAITS_BY_RADICAL[radical].name;
      const pct = (val / maxScore) * 100;
      const fill = pct > 0 ? `<div class="score-bar-fill" style="width: ${pct}%;"></div>` : '';
      return `<div class="score-bar"><span class="score-bar-label">Радикал ${radical} — ${radicalName}:</span><div class="score-bar-track">${fill}</div><span class="score-bar-value">${val}</span></div>`;
    })
    .join('');

  const confidencePercent = Math.round((coreObj ? 85 : 50)); // High confidence for explicit selection

  box.innerHTML = `
    <h3>Интерпретация: ${name}</h3>
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
      <div class="pill">${coreObj.name}</div>
      <div class="pill">${shellObj.name}</div>
      <div class="pill">${markObj.name}</div>
      <div style="margin-left:12px; font-size:13px; color:#374151;">Уверенность: <strong>${confidencePercent}%</strong></div>
    </div>
    <hr>
    <div><strong>Выбранные характеристики:</strong></div>
    ${traitsHtml}
    <hr>
    <div><strong>Баланс радикалов:</strong></div>
    <div class="score-bar-container">
      ${scoreBarHtml}
    </div>
    <hr>
    ${buildShortProfile(coreId, shellId, markId)}
  `;
}

// Render traits when DOM is ready or data loaded
function renderTraitsOnReady() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderTraitsUI);
  } else {
    renderTraitsUI();
  }
}

renderTraitsOnReady();

// ===============================
// Блок 3 (старая версия): Интерпретация текста
// ===============================
// Interpretation triggers can be loaded from `data/interpret_triggers.json`.
// Fallback default (kept minimal) in case external file missing.
let INTERP_TRIGGERS = [
  { pattern: "сопереж", weights: {2: 3} },
  { pattern: "эмпат", weights: {2: 2} },
  { pattern: "энергич", weights: {1: 2} },
  { pattern: "общител", weights: {1: 2} },
  { pattern: "порядок", weights: {3: 2} },
  { pattern: "контрол", weights: {7: 2} },
  { pattern: "анализ", weights: {4: 2} }
];

function interpretByText(text) {
  // Normalize: lower case and keep Cyrillic/latin letters and numbers and spaces
  const norm = (text || "").toLowerCase().replace(/[^\p{L}0-9\s]/gu, ' ');
  
  // Remove common stop words to reduce noise
  const stopWords = ['и', 'а', 'о', 'в', 'на', 'по', 'с', 'со', 'к', 'ко', 'у', 'из', 'про', 'от', 'для', 'то', 'это', 'как', 'что', 'он', 'она', 'оно', 'они', 'мне', 'ему', 'им', 'я'];
  const words = norm.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
  const cleanText = words.join(' ');

  const score = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  const matches = [];
  
  INTERP_TRIGGERS.forEach(tr => {
    const pattern = tr.pattern;
    // match as word prefix (e.g. 'энергич' matches 'энергичный')
    const re = new RegExp('\\b' + pattern, 'ig');
    let count = 0;
    let m;
    while ((m = re.exec(cleanText)) !== null) {
      count++;
      // prevent infinite loops on zero-length matches
      if (re.lastIndex === m.index) re.lastIndex++;
    }
    
    if (count > 0) {
      Object.entries(tr.weights).forEach(([k,v]) => {
        // Boost score for multiple matches: more matches = stronger signal
        const boost = Math.min(count, 3); // cap at 3x boost
        score[k] += v * boost;
        matches.push({ pattern, radical: k, weight: v, count });
      });
    }
  });
  
  // Sorted array of [radical, value]
  const sorted = Object.entries(score).sort((a,b) => b[1] - a[1]);
  
  // Confidence: ratio of top score to sum of absolute scores + context factor
  const totalAbs = Object.values(score).reduce((s,v) => s + Math.abs(v), 0);
  const topVal = sorted[0] ? sorted[0][1] : 0;
  const baseConfidence = totalAbs > 0 ? (topVal / totalAbs) : 0;
  
  // Factor in text length and match count: longer text + more matches = more reliable
  const matchCount = matches.length;
  const textLength = words.length;
  const densityFactor = Math.min(matchCount / Math.max(textLength / 10, 1), 1); // normalized match density
  const confidence = (baseConfidence * 0.7) + (densityFactor * 0.3); // weighted blend
  
  return { score, sorted, matches, confidence };
}

function runInterpretation() {
  const text = document.getElementById("interp-text").value.trim();
  const name = document.getElementById("interp-name").value || "Сотрудник";

  const box = document.getElementById("interp-result");
  box.style.display = "block";

  if (text.length < 20) {
    box.innerHTML = "Опиши поведение подробнее.";
    return;
  }

  const res = interpretByText(text);
  const coreId = res.sorted[0] ? res.sorted[0][0] : null;
  const shellId = res.sorted[1] ? res.sorted[1][0] : null;
  const markId = res.sorted[2] ? res.sorted[2][0] : null;

  const coreObj = getRadical(coreId) || { name: '-' };
  const shellObj = getRadical(shellId) || { name: '-' };
  const markObj = getRadical(markId) || { name: '-' };

  // Build matches block
  let matchHtml = '';
  if (res.matches.length > 0) {
    const uniq = {};
    res.matches.forEach(m => {
      const key = m.pattern + '|' + m.radical;
      uniq[key] = (uniq[key] || 0) + m.count;
    });
    matchHtml = '<ul>' + Object.entries(uniq).map(([k,v]) => {
      const parts = k.split('|');
      return `<li>Найдено «<strong>${parts[0]}</strong>» → радикал ${parts[1]} (x${v})</li>`;
    }).join('') + '</ul>';
  } else {
    matchHtml = '<div class="muted">Совпадений по ключевым словам не найдено.</div>';
  }

  const confidencePercent = Math.round((res.confidence || 0) * 100);

  let advise = '';
  if ((res.confidence || 0) < 0.35) {
    advise = '<div class="muted" style="margin-top:8px;">Низкая уверенность: опишите поведение подробнее или запустите опросник для точного результата.</div>';
  } else if ((res.confidence || 0) < 0.55) {
    advise = '<div class="muted" style="margin-top:8px;">Средняя уверенность: результат примерный. Для точности пройдите полный опросник.</div>';
  }

  // Build score bar visualization
  const maxScore = Math.max(...Object.values(res.score), 1); // ensure at least 1 to avoid div by zero
  const scoreBarHtml = Object.entries(res.score)
    .map(([radical, score]) => {
      const pct = (score / maxScore) * 100;
      const fill = pct > 0 ? `<div class="score-bar-fill" style="width: ${pct}%;"></div>` : '';
      return `<div class="score-bar"><span class="score-bar-label">Радикал ${radical}:</span><div class="score-bar-track">${fill}</div><span class="score-bar-value">${Math.round(score)}</span></div>`;
    })
    .join('');

  box.innerHTML = `
    <h3>Интерпретация: ${name}</h3>
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
      <div class="pill">${coreObj.name}</div>
      <div class="pill">${shellObj.name}</div>
      <div class="pill">${markObj.name}</div>
      <div style="margin-left:12px; font-size:13px; color:#374151;">Уверенность: <strong>${confidencePercent}%</strong></div>
    </div>
    <hr>
    <div><strong>Найденные ключевые слова:</strong></div>
    ${matchHtml}
    ${advise}
    <hr>
    <div><strong>Баланс радикалов:</strong></div>
    <div class="score-bar-container">
      ${scoreBarHtml}
    </div>
    <hr>
    ${buildShortProfile(coreId, shellId, markId)}
  `;
}