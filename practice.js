// ===== 共テ型AI演習（β） =====
// 問題文は practice-data.js の品質確認済みオリジナル問題を使用する。
const PRACTICE_SET_SIZE = 3;
const PRACTICE_ATTEMPTS_KEY = 'mc_practice_attempts';
const PRACTICE_SUPPORTED_SUBJECTS = ['english', 'math', 'joho'];

const practiceState = {
  mode: 'unit',
  subjectId: 'english',
  unitId: 'eng_reading',
  topic: '',
  sectionId: '',
  difficulty: 'all',
  questions: [],
  index: 0,
  selectedChoiceId: '',
  answered: false,
  results: [],
  pendingStartAfterLogin: false,
};

function validatePracticeQuestion(question) {
  if (!question || typeof question !== 'object') return false;
  const requiredStrings = [
    'id', 'subjectId', 'unitId', 'topic', 'sectionId', 'sectionLabel',
    'difficulty', 'prompt', 'correctChoiceId', 'explanation',
  ];
  if (requiredStrings.some(key => !String(question[key] || '').trim())) return false;
  if (!Array.isArray(question.choices) || question.choices.length !== 4) return false;
  const choiceIds = question.choices.map(choice => String(choice?.id || '').trim());
  if (new Set(choiceIds).size !== question.choices.length) return false;
  if (question.choices.some(choice => !String(choice?.id || '').trim() || !String(choice?.text || '').trim())) return false;
  return choiceIds.includes(question.correctChoiceId);
}

function filterPracticeQuestions(questions, scope = {}) {
  return (Array.isArray(questions) ? questions : [])
    .filter(validatePracticeQuestion)
    .filter(question => !scope.subjectId || question.subjectId === scope.subjectId)
    .filter(question => scope.mode !== 'unit' || !scope.unitId || question.unitId === scope.unitId)
    .filter(question => scope.mode !== 'unit' || !scope.topic || question.topic === scope.topic)
    .filter(question => scope.mode !== 'section' || !scope.sectionId || question.sectionId === scope.sectionId)
    .filter(question => !scope.difficulty || scope.difficulty === 'all' || question.difficulty === scope.difficulty);
}

function seededPracticeShuffle(items, seed = 1) {
  const output = [...items];
  let value = Number(seed) || 1;
  for (let i = output.length - 1; i > 0; i -= 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const j = value % (i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

function buildPracticeSet(questions, scope = {}, limit = PRACTICE_SET_SIZE, seed = Date.now()) {
  const candidates = filterPracticeQuestions(questions, scope);
  return seededPracticeShuffle(candidates, seed).slice(0, Math.max(0, limit));
}

function scorePracticeAnswers(questions, answers = {}) {
  const valid = (Array.isArray(questions) ? questions : []).filter(validatePracticeQuestion);
  const correct = valid.reduce(
    (count, question) => count + (answers[question.id] === question.correctChoiceId ? 1 : 0),
    0,
  );
  return {
    correct,
    total: valid.length,
    percent: valid.length ? Math.round((correct / valid.length) * 100) : 0,
  };
}

const ManaCuePracticeEngine = Object.freeze({
  validatePracticeQuestion,
  filterPracticeQuestions,
  buildPracticeSet,
  scorePracticeAnswers,
});

function practiceQuestions() {
  return typeof MANACUE_PRACTICE_QUESTIONS === 'undefined'
    ? []
    : MANACUE_PRACTICE_QUESTIONS.filter(validatePracticeQuestion);
}

function practiceEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function practiceSignedIn() {
  return typeof authUser !== 'undefined' && Boolean(authUser);
}

function initPractice() {
  const view = document.getElementById('practiceView');
  if (!view) return;

  document.getElementById('practiceModeTabs')?.addEventListener('click', event => {
    const button = event.target.closest('[data-practice-mode]');
    if (!button) return;
    practiceState.mode = button.dataset.practiceMode;
    practiceState.topic = '';
    practiceState.sectionId = '';
    renderPracticeSetup();
  });
  document.getElementById('practiceSubjectSelect')?.addEventListener('change', event => {
    practiceState.subjectId = event.target.value;
    practiceState.unitId = firstPracticeUnitId(practiceState.subjectId);
    practiceState.topic = '';
    practiceState.sectionId = '';
    renderPracticeSetup();
  });
  document.getElementById('practiceUnitSelect')?.addEventListener('change', event => {
    practiceState.unitId = event.target.value;
    practiceState.topic = '';
    renderPracticeSetup();
  });
  document.getElementById('practiceTopicSelect')?.addEventListener('change', event => {
    practiceState.topic = event.target.value;
    renderPracticeSetupSummary();
  });
  document.getElementById('practiceSectionSelect')?.addEventListener('change', event => {
    practiceState.sectionId = event.target.value;
    renderPracticeSetupSummary();
  });
  document.getElementById('practiceDifficultySelect')?.addEventListener('change', event => {
    practiceState.difficulty = event.target.value;
    renderPracticeSetupSummary();
  });
  document.getElementById('startPracticeBtn')?.addEventListener('click', requestPracticeStart);
  document.getElementById('practiceSession')?.addEventListener('click', handlePracticeSessionClick);
  renderPracticeSetup();
}

function renderPracticeView() {
  if (!document.getElementById('practiceView')) return;
  if (!practiceState.questions.length) renderPracticeSetup();
}

function practiceSubjects() {
  const available = new Set(practiceQuestions().map(question => question.subjectId));
  return SUBJECTS.filter(subject => available.has(subject.id));
}

function practiceUnits(subjectId) {
  const subject = SUBJECTS.find(item => item.id === subjectId);
  const available = new Set(
    practiceQuestions()
      .filter(question => question.subjectId === subjectId)
      .map(question => question.unitId),
  );
  return (subject?.units || []).filter(unit => available.has(unit.id));
}

function firstPracticeUnitId(subjectId) {
  return practiceUnits(subjectId)[0]?.id || '';
}

function practiceTopics(subjectId, unitId) {
  return [...new Set(
    practiceQuestions()
      .filter(question => question.subjectId === subjectId && question.unitId === unitId)
      .map(question => question.topic),
  )];
}

function practiceSections(subjectId) {
  const seen = new Set();
  return practiceQuestions()
    .filter(question => question.subjectId === subjectId)
    .filter(question => {
      if (seen.has(question.sectionId)) return false;
      seen.add(question.sectionId);
      return true;
    })
    .map(question => ({ id: question.sectionId, label: question.sectionLabel }));
}

function currentPracticeScope() {
  return {
    mode: practiceState.mode,
    subjectId: practiceState.subjectId,
    unitId: practiceState.mode === 'unit' ? practiceState.unitId : '',
    topic: practiceState.mode === 'unit' ? practiceState.topic : '',
    sectionId: practiceState.mode === 'section' ? practiceState.sectionId : '',
    difficulty: practiceState.difficulty,
  };
}

function renderPracticeSetup() {
  const subjectSelect = document.getElementById('practiceSubjectSelect');
  if (!subjectSelect) return;
  if (!practiceSubjects().some(subject => subject.id === practiceState.subjectId)) {
    practiceState.subjectId = practiceSubjects()[0]?.id || '';
  }

  subjectSelect.innerHTML = practiceSubjects().map(subject => `
    <option value="${practiceEscapeHtml(subject.id)}"${subject.id === practiceState.subjectId ? ' selected' : ''}>
      ${practiceEscapeHtml(subject.icon)} ${practiceEscapeHtml(subject.name)}
    </option>
  `).join('');

  document.querySelectorAll('[data-practice-mode]').forEach(button => {
    const active = button.dataset.practiceMode === practiceState.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  const unitField = document.getElementById('practiceUnitField');
  const topicField = document.getElementById('practiceTopicField');
  const sectionField = document.getElementById('practiceSectionField');
  unitField?.classList.toggle('hidden', practiceState.mode !== 'unit');
  topicField?.classList.toggle('hidden', practiceState.mode !== 'unit');
  sectionField?.classList.toggle('hidden', practiceState.mode !== 'section');

  const units = practiceUnits(practiceState.subjectId);
  if (!units.some(unit => unit.id === practiceState.unitId)) {
    practiceState.unitId = units[0]?.id || '';
  }
  const unitSelect = document.getElementById('practiceUnitSelect');
  unitSelect.innerHTML = units.map(unit => `
    <option value="${practiceEscapeHtml(unit.id)}"${unit.id === practiceState.unitId ? ' selected' : ''}>
      ${practiceEscapeHtml(unit.name)}
    </option>
  `).join('');

  const topics = practiceTopics(practiceState.subjectId, practiceState.unitId);
  if (practiceState.topic && !topics.includes(practiceState.topic)) practiceState.topic = '';
  const topicSelect = document.getElementById('practiceTopicSelect');
  topicSelect.innerHTML = '<option value="">単元内すべて</option>' + topics.map(topic => `
    <option value="${practiceEscapeHtml(topic)}"${topic === practiceState.topic ? ' selected' : ''}>
      ${practiceEscapeHtml(topic)}
    </option>
  `).join('');

  const sections = practiceSections(practiceState.subjectId);
  if (!sections.some(section => section.id === practiceState.sectionId)) {
    practiceState.sectionId = sections[0]?.id || '';
  }
  const sectionSelect = document.getElementById('practiceSectionSelect');
  sectionSelect.innerHTML = sections.map(section => `
    <option value="${practiceEscapeHtml(section.id)}"${section.id === practiceState.sectionId ? ' selected' : ''}>
      ${practiceEscapeHtml(section.label)}
    </option>
  `).join('');

  renderPracticeSetupSummary();
}

function renderPracticeSetupSummary() {
  const available = filterPracticeQuestions(practiceQuestions(), currentPracticeScope());
  const count = Math.min(PRACTICE_SET_SIZE, available.length);
  const summary = document.getElementById('practiceSetupSummary');
  const button = document.getElementById('startPracticeBtn');
  if (!summary || !button) return;

  const modeLabel = practiceState.mode === 'unit'
    ? '選んだ単元から出題'
    : practiceState.mode === 'section'
      ? '選んだ大問型から出題'
      : '教科を横断して出題';
  summary.innerHTML = available.length
    ? `<strong>${count}問セット</strong><span>${modeLabel}・解答後すぐに解説</span>`
    : '<strong>この条件の問題は準備中です</strong><span>難易度を「すべて」に戻してお試しください。</span>';
  button.disabled = count === 0;
  button.textContent = practiceSignedIn()
    ? `${count}問を始める`
    : `ログインして${count}問を始める`;
}

function requestPracticeStart() {
  const available = filterPracticeQuestions(practiceQuestions(), currentPracticeScope());
  if (!available.length) return;
  if (!practiceSignedIn()) {
    practiceState.pendingStartAfterLogin = true;
    trackMarketingEvent('practice_login_required', {
      practice_mode: practiceState.mode,
      subject_id: practiceState.subjectId,
    });
    openAuthModal();
    setAuthStatus('ログインすると、先行βの共テ型演習を無料で利用できます。解答履歴はこの端末に保存されます。');
    return;
  }
  startPracticeSet();
}

function startPracticeSet() {
  const seed = Date.now() + loadPracticeAttempts().length;
  practiceState.questions = buildPracticeSet(
    practiceQuestions(),
    currentPracticeScope(),
    PRACTICE_SET_SIZE,
    seed,
  );
  if (!practiceState.questions.length) return;
  practiceState.index = 0;
  practiceState.selectedChoiceId = '';
  practiceState.answered = false;
  practiceState.results = [];
  practiceState.pendingStartAfterLogin = false;
  document.getElementById('practiceSetup')?.classList.add('hidden');
  document.getElementById('practiceSession')?.classList.remove('hidden');
  trackMarketingEvent('practice_set_started', {
    practice_mode: practiceState.mode,
    subject_id: practiceState.subjectId,
    question_count: practiceState.questions.length,
  });
  renderPracticeQuestion();
}

function renderPracticeQuestion() {
  const session = document.getElementById('practiceSession');
  const question = practiceState.questions[practiceState.index];
  if (!session || !question) return;
  const subject = SUBJECTS.find(item => item.id === question.subjectId);
  const unit = subject?.units.find(item => item.id === question.unitId);
  const progress = Math.round(((practiceState.index + 1) / practiceState.questions.length) * 100);
  session.innerHTML = `
    <div class="practice-progress-row">
      <button class="practice-exit-btn" type="button" data-practice-action="exit">← 条件選択</button>
      <span>${practiceState.index + 1} / ${practiceState.questions.length}</span>
    </div>
    <div class="practice-progress"><i style="width:${progress}%"></i></div>
    <article class="practice-question-card">
      <div class="practice-question-meta">
        <span>${practiceEscapeHtml(subject?.icon || '📝')} ${practiceEscapeHtml(subject?.name || '')}</span>
        <span>${practiceEscapeHtml(unit?.name || '')}</span>
        <span>${practiceEscapeHtml(question.difficulty === 'basic' ? '基礎' : question.difficulty === 'advanced' ? '発展' : '標準')}</span>
      </div>
      <p class="practice-section-label">${practiceEscapeHtml(question.sectionLabel)}</p>
      ${question.stimulus ? `<pre class="practice-stimulus">${practiceEscapeHtml(question.stimulus)}</pre>` : ''}
      <h3>${practiceEscapeHtml(question.prompt)}</h3>
      <div class="practice-choices" role="radiogroup" aria-label="選択肢">
        ${question.choices.map(choice => {
          const selected = practiceState.selectedChoiceId === choice.id;
          const isCorrect = practiceState.answered && choice.id === question.correctChoiceId;
          const isWrong = practiceState.answered && selected && !isCorrect;
          return `<button
            type="button"
            class="practice-choice${selected ? ' selected' : ''}${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}"
            data-practice-choice="${practiceEscapeHtml(choice.id)}"
            role="radio"
            aria-checked="${selected}"
            ${practiceState.answered ? 'disabled' : ''}
          ><b>${practiceEscapeHtml(choice.id)}</b><span>${practiceEscapeHtml(choice.text)}</span></button>`;
        }).join('')}
      </div>
      ${practiceState.answered ? renderPracticeExplanation(question) : ''}
      <div class="practice-question-actions">
        ${practiceState.answered
          ? `<button class="btn-primary" type="button" data-practice-action="next">${practiceState.index + 1 === practiceState.questions.length ? '結果を見る' : '次の問題へ'}</button>`
          : '<button class="btn-primary" type="button" data-practice-action="submit" disabled>解答する</button>'}
        <button class="practice-report-btn" type="button" data-practice-action="report" data-question-id="${practiceEscapeHtml(question.id)}">問題を報告</button>
      </div>
    </article>
    <p class="practice-question-id">ManaCueオリジナル問題・ID ${practiceEscapeHtml(question.id)}</p>
  `;
}

function renderPracticeExplanation(question) {
  const isCorrect = practiceState.selectedChoiceId === question.correctChoiceId;
  return `<div class="practice-explanation ${isCorrect ? 'is-correct' : 'is-wrong'}">
    <strong>${isCorrect ? '正解です' : `正解は ${practiceEscapeHtml(question.correctChoiceId)} です`}</strong>
    <p>${practiceEscapeHtml(question.explanation)}</p>
  </div>`;
}

function handlePracticeSessionClick(event) {
  const choiceButton = event.target.closest('[data-practice-choice]');
  if (choiceButton && !practiceState.answered) {
    practiceState.selectedChoiceId = choiceButton.dataset.practiceChoice;
    document.querySelectorAll('.practice-choice').forEach(button => {
      const selected = button.dataset.practiceChoice === practiceState.selectedChoiceId;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
    const submit = document.querySelector('[data-practice-action="submit"]');
    if (submit) submit.disabled = false;
    return;
  }

  const actionButton = event.target.closest('[data-practice-action]');
  if (!actionButton) return;
  if (actionButton.dataset.practiceAction === 'submit') submitPracticeAnswer();
  if (actionButton.dataset.practiceAction === 'next') nextPracticeQuestion();
  if (actionButton.dataset.practiceAction === 'exit') exitPracticeSession();
  if (actionButton.dataset.practiceAction === 'restart') startPracticeSet();
  if (actionButton.dataset.practiceAction === 'report') reportPracticeQuestion(actionButton.dataset.questionId);
}

function submitPracticeAnswer() {
  if (!practiceState.selectedChoiceId || practiceState.answered) return;
  const question = practiceState.questions[practiceState.index];
  const correct = practiceState.selectedChoiceId === question.correctChoiceId;
  practiceState.answered = true;
  practiceState.results.push({
    questionId: question.id,
    selectedChoiceId: practiceState.selectedChoiceId,
    correct,
  });
  trackMarketingEvent('practice_question_answered', {
    subject_id: question.subjectId,
    unit_id: question.unitId,
    is_correct: correct,
  });
  renderPracticeQuestion();
}

function nextPracticeQuestion() {
  if (!practiceState.answered) return;
  if (practiceState.index + 1 >= practiceState.questions.length) {
    completePracticeSet();
    return;
  }
  practiceState.index += 1;
  practiceState.selectedChoiceId = '';
  practiceState.answered = false;
  renderPracticeQuestion();
}

function completePracticeSet() {
  const answers = Object.fromEntries(
    practiceState.results.map(result => [result.questionId, result.selectedChoiceId]),
  );
  const score = scorePracticeAnswers(practiceState.questions, answers);
  savePracticeAttempt({
    id: `${Date.now()}_${practiceState.subjectId}`,
    userId: authUser?.uid || '',
    mode: practiceState.mode,
    subjectId: practiceState.subjectId,
    unitId: practiceState.unitId,
    sectionId: practiceState.sectionId,
    questionIds: practiceState.questions.map(question => question.id),
    correct: score.correct,
    total: score.total,
    percent: score.percent,
    completedAt: Date.now(),
  });
  trackMarketingEvent('practice_set_completed', {
    practice_mode: practiceState.mode,
    subject_id: practiceState.subjectId,
    question_count: score.total,
    score_percent: score.percent,
  });
  const session = document.getElementById('practiceSession');
  const message = score.percent === 100
    ? '全問正解。次は難易度を上げてみましょう。'
    : score.percent >= 60
      ? 'あと一歩。解説を思い出してもう一度挑戦しましょう。'
      : '今見つかった穴が、次に伸びる場所です。';
  session.innerHTML = `
    <div class="practice-result-card">
      <span class="practice-result-kicker">演習完了</span>
      <div class="practice-score"><strong>${score.correct}</strong><span>/ ${score.total}問</span></div>
      <h3>${practiceEscapeHtml(message)}</h3>
      <p>結果はこの端末に保存しました。β版では正答率よりも、迷った理由と解説の確認を大切にしてください。</p>
      <div class="practice-result-actions">
        <button class="btn-primary" type="button" data-practice-action="restart">同じ条件でもう一度</button>
        <button class="btn-secondary" type="button" data-practice-action="exit">条件を変える</button>
      </div>
    </div>
  `;
}

function exitPracticeSession() {
  practiceState.questions = [];
  practiceState.results = [];
  practiceState.index = 0;
  practiceState.selectedChoiceId = '';
  practiceState.answered = false;
  document.getElementById('practiceSession')?.classList.add('hidden');
  document.getElementById('practiceSetup')?.classList.remove('hidden');
  renderPracticeSetup();
}

function loadPracticeAttempts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRACTICE_ATTEMPTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePracticeAttempt(attempt) {
  try {
    const attempts = [attempt, ...loadPracticeAttempts()].slice(0, 50);
    localStorage.setItem(PRACTICE_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch (error) {
    console.warn('Practice attempt could not be saved.', error);
  }
}

function reportPracticeQuestion(questionId) {
  if (typeof openFeedbackModal !== 'function') return;
  openFeedbackModal();
  const category = document.getElementById('feedbackCategory');
  const text = document.getElementById('feedbackText');
  if (category) category.value = '不具合';
  if (text) text.value = `共テ型演習（β）の問題を報告します。\n問題ID: ${questionId}\n\n気になった点：`;
}

function activatePracticeNav() {
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
  document.querySelector('.nav-btn[data-view="practice"]')?.classList.add('active');
}

function openPracticeScope({ subjectId, unitId = '', topic = '', mode = 'unit' }) {
  if (!PRACTICE_SUPPORTED_SUBJECTS.includes(subjectId)) return;
  practiceState.mode = mode;
  practiceState.subjectId = subjectId;
  practiceState.unitId = unitId || firstPracticeUnitId(subjectId);
  practiceState.topic = topic;
  practiceState.sectionId = '';
  practiceState.questions = [];
  activatePracticeNav();
  switchView('practice');
  document.getElementById('practiceSession')?.classList.add('hidden');
  document.getElementById('practiceSetup')?.classList.remove('hidden');
  renderPracticeSetup();
}

function openPracticeFromElement(element) {
  openPracticeScope({
    subjectId: element.dataset.subjectId,
    unitId: element.dataset.unitId,
    topic: element.dataset.topic || '',
    mode: 'unit',
  });
}

function renderUnitPracticeAction(subjectId, unitId) {
  const count = filterPracticeQuestions(practiceQuestions(), { mode: 'unit', subjectId, unitId }).length;
  if (!count) return '';
  return `<button class="unit-practice-btn" type="button"
    data-subject-id="${practiceEscapeHtml(subjectId)}"
    data-unit-id="${practiceEscapeHtml(unitId)}"
    onclick="event.stopPropagation(); openPracticeFromElement(this)">共テ型演習 β</button>`;
}

function renderVideoPracticeAction(subjectId, unitId, topic = '') {
  const count = filterPracticeQuestions(practiceQuestions(), {
    mode: 'unit', subjectId, unitId, topic,
  }).length;
  if (!count) return '';
  return `<button class="topic-practice-cta" type="button"
    data-subject-id="${practiceEscapeHtml(subjectId)}"
    data-unit-id="${practiceEscapeHtml(unitId)}"
    data-topic="${practiceEscapeHtml(topic)}"
    onclick="openPracticeFromElement(this)"><span>✦</span>${topic ? 'この内容を解く' : 'この単元を解く'}<small>${Math.min(count, PRACTICE_SET_SIZE)}問</small></button>`;
}

function onPracticeAuthChanged(user) {
  renderPracticeSetupSummary();
  if (user && practiceState.pendingStartAfterLogin) {
    hide('authModal');
    startPracticeSet();
  }
}
