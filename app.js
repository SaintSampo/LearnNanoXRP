// LearnNanoXRP – Main Application
// Handles navigation, progress tracking (localStorage), and SCORM bridge.

const LESSONS = [
  { id: 'lesson1', num: 1, title: 'Assembling the Robot',     icon: '🔧', src: 'lessons/lesson1-assembly/',    scorm: 'scorm-packages/lesson1-assembly.zip'    },
  { id: 'lesson2', num: 2, title: 'The Web Editor & Blockly', icon: '💻', src: 'lessons/lesson2-web-editor/',  scorm: 'scorm-packages/lesson2-web-editor.zip'  },
  { id: 'lesson3', num: 3, title: 'Making the Robot Drive',   icon: '🚗', src: 'lessons/lesson3-driving/',     scorm: 'scorm-packages/lesson3-driving.zip'     },
  { id: 'lesson4', num: 4, title: 'Following a Line',         icon: '〰️', src: 'lessons/lesson4-line-follow/', scorm: 'scorm-packages/lesson4-line-follow.zip' },
  { id: 'lesson5', num: 5, title: 'Sonar Sensor',             icon: '📡', src: 'lessons/lesson5-sonar/',       scorm: 'scorm-packages/lesson5-sonar.zip'       },
  { id: 'lesson6', num: 6, title: 'Wireless Gamepad',         icon: '🎮', src: 'lessons/lesson6-gamepad/',     scorm: 'scorm-packages/lesson6-gamepad.zip'     },
];

const STORAGE_BASE  = 'learnNanoXRP_progress';
const PROFILES_KEY  = 'learnNanoXRP_profiles';
const CURR_PROF_KEY = 'learnNanoXRP_currentProfile';
const LANG_KEY      = 'learnNanoXRP_language';
const PROF_COLORS   = ['#4F46E5','#10B981','#F97316','#EF4444','#8B5CF6','#06B6D4','#F59E0B','#EC4899'];

const LANG_FLAGS = {
  en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', pt: '🇧🇷',
  it: '🇮🇹', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦',
  hi: '🇮🇳', ru: '🇷🇺', nl: '🇳🇱',
};

const app = (() => {
  let currentLessonIdx = -1;
  let progress         = {};
  let currentProfile   = '';
  let profiles         = [];
  let currentLang      = 'en';

  // ── Profile helpers ──────────────────────────────────────
  function progressKey() {
    return currentProfile ? STORAGE_BASE + '_' + currentProfile : STORAGE_BASE;
  }

  function profileColor(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return PROF_COLORS[Math.abs(h) % PROF_COLORS.length];
  }

  function loadProfiles() {
    try { profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); }
    catch { profiles = []; }
  }

  function saveProfiles() {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
  }

  function setCurrentProfile(name) {
    currentProfile = name;
    try { localStorage.setItem(CURR_PROF_KEY, name); } catch {}
    _updateProfileDisplay();
  }

  function _updateProfileDisplay() {
    const pill   = document.getElementById('profilePill');
    const pName  = document.getElementById('profilePillName');
    const avatar = document.getElementById('profileAvatar');
    if (!pill) return;
    if (currentProfile) {
      pill.style.display = 'flex';
      pName.textContent  = currentProfile;
      avatar.textContent = currentProfile.charAt(0).toUpperCase();
      avatar.style.background = profileColor(currentProfile);
    } else {
      pill.style.display = 'none';
    }
  }

  // ── Profile Screen ───────────────────────────────────────
  function showProfileScreen() {
    _renderProfileList();
    document.getElementById('profileScreen').style.display = 'flex';
    setTimeout(() => {
      const input = document.getElementById('profileNameInput');
      if (input) input.focus();
    }, 100);
  }

  function hideProfileScreen() {
    document.getElementById('profileScreen').style.display = 'none';
  }

  function _renderProfileList() {
    const list  = document.getElementById('profileList');
    const empty = document.getElementById('profileEmptyMsg');
    if (!list) return;
    list.innerHTML = '';

    if (profiles.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    profiles.forEach(name => {
      const btn = document.createElement('button');
      btn.className = 'profile-card';
      btn.innerHTML = `
        <div class="profile-avatar-lg" style="background:${profileColor(name)}">${name.charAt(0).toUpperCase()}</div>
        <span class="profile-card-name">${name}</span>
      `;
      btn.addEventListener('click', () => selectProfile(name));
      list.appendChild(btn);
    });
  }

  function selectProfile(name) {
    setCurrentProfile(name);
    hideProfileScreen();
    loadProgress();
    unlockFirstLesson();
    currentLessonIdx = -1;
    document.getElementById('welcomeScreen').style.display = '';
    const frame = document.getElementById('lessonFrame');
    frame.style.display = 'none';
    frame.src = '';
    document.getElementById('currentLessonTitle').textContent = 'Select a lesson to begin';
    const prevBtn = document.getElementById('prevLessonBtn');
    const nextBtn = document.getElementById('nextLessonBtn');
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    renderSidebar();
    renderWelcomeGrid();
    updateProgressBar();
  }

  function createProfile() {
    const input = document.getElementById('profileNameInput');
    const name  = (input ? input.value : '').trim();
    if (!name) { if (input) input.focus(); return; }
    if (!profiles.includes(name)) {
      profiles.push(name);
      saveProfiles();
    }
    if (input) input.value = '';
    selectProfile(name);
  }

  function switchProfile() {
    showProfileScreen();
  }

  // ── Persistence ──────────────────────────────────────────
  function loadProgress() {
    try {
      const raw = localStorage.getItem(progressKey());
      progress = raw ? JSON.parse(raw) : {};
    } catch { progress = {}; }
  }

  function saveProgress() {
    try { localStorage.setItem(progressKey(), JSON.stringify(progress)); } catch {}
  }

  function getLessonStatus(id) {
    return progress[id] || 'locked';
  }

  function setLessonStatus(id, status) {
    progress[id] = status;
    saveProgress();
  }

  function unlockFirstLesson() {
    if (!progress[LESSONS[0].id] || progress[LESSONS[0].id] === 'locked') {
      setLessonStatus(LESSONS[0].id, 'available');
    }
  }

  // ── UI Rendering ─────────────────────────────────────────
  function statusIcon(status) {
    switch (status) {
      case 'complete':    return '✅';
      case 'in-progress': return '🔄';
      case 'available':   return '▶️';
      default:            return '🔒';
    }
  }

  function statusBadge(status) {
    switch (status) {
      case 'complete':    return '<span class="card-badge badge-done">Done!</span>';
      case 'in-progress': return '<span class="card-badge badge-active">In Progress</span>';
      case 'locked':      return '<span class="card-badge badge-locked">Locked</span>';
      default:            return '';
    }
  }

  function renderSidebar() {
    const nav = document.getElementById('lessonNav');
    nav.innerHTML = '';
    LESSONS.forEach((lesson, idx) => {
      const status   = getLessonStatus(lesson.id);
      const isActive = idx === currentLessonIdx;
      const btn = document.createElement('button');
      btn.className = ['lesson-card', status, isActive ? 'active' : ''].filter(Boolean).join(' ');
      btn.innerHTML = `
        <span class="card-icon">${statusIcon(status)}</span>
        <span class="card-info">
          <span class="card-num">Lesson ${lesson.num}</span>
          <span class="card-name">${lesson.title}</span>
        </span>
        ${statusBadge(status)}
      `;
      if (status !== 'locked') btn.addEventListener('click', () => loadLesson(idx));
      nav.appendChild(btn);
    });

    const dl = document.getElementById('downloadLinks');
    dl.innerHTML = '';
    LESSONS.forEach(lesson => {
      const a = document.createElement('a');
      a.href = lesson.scorm;
      a.download = '';
      a.className = 'download-link';
      a.innerHTML = `📦 Lesson ${lesson.num} SCORM`;
      dl.appendChild(a);
    });
  }

  function renderWelcomeGrid() {
    const grid = document.getElementById('lessonOverviewGrid');
    if (!grid) return;
    grid.innerHTML = '';
    LESSONS.forEach((lesson, idx) => {
      const status = getLessonStatus(lesson.id);
      const card = document.createElement('div');
      card.className = 'overview-card' + (status === 'complete' ? ' oc-complete' : '');
      card.innerHTML = `
        <div class="oc-icon">${lesson.icon}</div>
        <div class="oc-num">Lesson ${lesson.num}</div>
        <div class="oc-title">${lesson.title}</div>
      `;
      card.addEventListener('click', () => { if (status !== 'locked') loadLesson(idx); });
      grid.appendChild(card);
    });
  }

  function updateProgressBar() {
    const done = LESSONS.filter(l => getLessonStatus(l.id) === 'complete').length;
    const pct  = Math.round((done / LESSONS.length) * 100);
    document.getElementById('progressBarFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
  }

  // ── Language ──────────────────────────────────────────────
  function getLessonSrc(lesson) {
    if (!currentLang || currentLang === 'en') return lesson.src;
    // lesson.src is e.g. 'lessons/lesson1-assembly/'
    // translated version is 'lessons/lesson1-assembly-es/'
    return lesson.src.replace(/\/$/, '') + '-' + currentLang + '/';
  }

  function setLanguage(code) {
    currentLang = code;
    try { localStorage.setItem(LANG_KEY, code); } catch {}
    // Reload the open lesson in the new language
    if (currentLessonIdx >= 0) {
      const frame = document.getElementById('lessonFrame');
      frame.src = getLessonSrc(LESSONS[currentLessonIdx]);
    }
    // Sync the picker in case setLanguage was called programmatically
    const picker = document.getElementById('langPicker');
    if (picker) picker.value = code;
  }

  function initLanguagePicker() {
    const langs = window.AVAILABLE_LANGUAGES || [{ code: 'en', label: 'English' }];
    const wrap   = document.getElementById('langPickerWrap');
    const picker = document.getElementById('langPicker');
    if (!wrap || !picker) return;

    // Restore saved language
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && langs.find(l => l.code === saved)) currentLang = saved;
    } catch {}

    // Only show the picker when there are real choices
    if (langs.length < 2) { wrap.style.display = 'none'; return; }

    picker.innerHTML = '';
    langs.forEach(({ code, label }) => {
      const opt = document.createElement('option');
      opt.value       = code;
      opt.textContent = (LANG_FLAGS[code] || '') + ' ' + label;
      if (code === currentLang) opt.selected = true;
      picker.appendChild(opt);
    });

    wrap.style.display = 'flex';
  }

  // ── Lesson Loading ────────────────────────────────────────
  function loadLesson(idx) {
    const lesson = LESSONS[idx];
    if (!lesson) return;
    const status = getLessonStatus(lesson.id);
    if (status === 'locked') return;

    currentLessonIdx = idx;
    if (status !== 'complete') setLessonStatus(lesson.id, 'in-progress');

    document.getElementById('welcomeScreen').style.display = 'none';
    const frame = document.getElementById('lessonFrame');
    frame.style.display = 'block';
    frame.src = getLessonSrc(lesson);

    document.getElementById('currentLessonTitle').textContent = `Lesson ${lesson.num}: ${lesson.title}`;

    const prevBtn = document.getElementById('prevLessonBtn');
    const nextBtn = document.getElementById('nextLessonBtn');
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === LESSONS.length - 1 || getLessonStatus(LESSONS[idx + 1]?.id) === 'locked';
    nextBtn.textContent = idx === LESSONS.length - 1 ? 'All Done! 🎉' : 'Next Lesson →';

    renderSidebar();
    updateProgressBar();
  }

  function startFirstLesson() { loadLesson(0); }

  function goToNextLesson() {
    if (currentLessonIdx < LESSONS.length - 1) {
      const next = currentLessonIdx + 1;
      if (getLessonStatus(LESSONS[next].id) !== 'locked') loadLesson(next);
    }
  }

  function goToPrevLesson() {
    if (currentLessonIdx > 0) loadLesson(currentLessonIdx - 1);
  }

  // ── SCORM / postMessage Bridge ────────────────────────────
  function handleLessonMessage(event) {
    if (event.origin !== window.location.origin) return;
    const { type, lessonId, score } = event.data || {};
    if (type === 'LESSON_COMPLETE' && lessonId) onLessonComplete(lessonId, score || 100);
    if (type === 'LESSON_PROGRESS' && lessonId) { setLessonStatus(lessonId, 'in-progress'); renderSidebar(); }
  }

  function onLessonComplete(lessonId, score) {
    const idx = LESSONS.findIndex(l => l.id === lessonId);
    if (idx === -1) return;
    setLessonStatus(lessonId, 'complete');
    if (idx + 1 < LESSONS.length && getLessonStatus(LESSONS[idx + 1].id) === 'locked') {
      setLessonStatus(LESSONS[idx + 1].id, 'available');
    }
    renderSidebar();
    updateProgressBar();
    const nextBtn = document.getElementById('nextLessonBtn');
    if (currentLessonIdx === idx) nextBtn.disabled = idx === LESSONS.length - 1;
    showCompletionModal(idx, score);
  }

  // ── Completion Modal ──────────────────────────────────────
  function showCompletionModal(idx, score) {
    const lesson  = LESSONS[idx];
    const isLast  = idx === LESSONS.length - 1;
    const modal   = document.getElementById('completionModal');
    const emoji   = document.getElementById('modalEmoji');
    const title   = document.getElementById('modalTitle');
    const msg     = document.getElementById('modalMessage');
    const nextBtn = document.getElementById('modalNextBtn');

    if (isLast) {
      emoji.textContent = '🏆';
      title.textContent = 'You Did It!';
      msg.textContent   = 'You finished all 6 lessons! You are now an XRP Robot programming expert!';
      nextBtn.style.display = 'none';
    } else {
      emoji.textContent = '🎉';
      title.textContent = `Lesson ${lesson.num} Complete!`;
      msg.textContent   = `Awesome work! You scored ${score}%. Ready for the next lesson?`;
      nextBtn.style.display = '';
    }
    modal.style.display = 'flex';
  }

  function closeModal()      { document.getElementById('completionModal').style.display = 'none'; }
  function modalNextLesson() { closeModal(); goToNextLesson(); }

  // ── Teacher Dashboard ─────────────────────────────────────
  function showTeacherView() {
    _renderTeacherDashboard();
    document.getElementById('teacherModal').style.display = 'flex';
  }

  function closeTeacherView() {
    document.getElementById('teacherModal').style.display = 'none';
  }

  function _renderTeacherDashboard() {
    loadProfiles();
    const tbody = document.getElementById('teacherTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (profiles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${LESSONS.length + 3}" class="td-empty">No students yet. Students will appear here once they log in.</td></tr>`;
      return;
    }

    profiles.forEach(name => {
      let prog = {};
      try { prog = JSON.parse(localStorage.getItem(STORAGE_BASE + '_' + name) || '{}'); } catch {}
      const done = LESSONS.filter(l => prog[l.id] === 'complete').length;
      const pct  = Math.round((done / LESSONS.length) * 100);

      const tr = document.createElement('tr');
      if (name === currentProfile) tr.className = 'tr-current';

      const tdName = document.createElement('td');
      tdName.innerHTML = `
        <div class="td-name-inner">
          <span class="td-avatar" style="background:${profileColor(name)}">${name.charAt(0).toUpperCase()}</span>
          <span>${name}</span>
        </div>`;
      tr.appendChild(tdName);

      LESSONS.forEach(lesson => {
        const status = prog[lesson.id] || 'locked';
        const td = document.createElement('td');
        td.className = 'td-status td-' + status;
        td.title = lesson.title + ': ' + status;
        td.textContent = statusIcon(status);
        tr.appendChild(td);
      });

      const tdPct = document.createElement('td');
      tdPct.innerHTML = `
        <div class="td-pct-inner">
          <div class="pct-bar"><div class="pct-fill" style="width:${pct}%"></div></div>
          <span>${pct}%</span>
        </div>`;
      tr.appendChild(tdPct);

      const tdAct = document.createElement('td');
      tdAct.className = 'td-actions';
      const resetBtn  = document.createElement('button');
      const removeBtn = document.createElement('button');
      resetBtn.className  = 'btn-reset-student';
      removeBtn.className = 'btn-remove-student';
      resetBtn.textContent  = '↺ Reset';
      removeBtn.textContent = '× Remove';
      resetBtn.title  = `Reset ${name}'s progress`;
      removeBtn.title = `Remove ${name} from list`;
      resetBtn.addEventListener('click',  () => _resetStudentProgress(name));
      removeBtn.addEventListener('click', () => _removeStudent(name));
      tdAct.appendChild(resetBtn);
      tdAct.appendChild(removeBtn);
      tr.appendChild(tdAct);

      tbody.appendChild(tr);
    });
  }

  function _resetStudentProgress(name) {
    if (!confirm(`Reset all progress for ${name}?\nThey will start over from Lesson 1.`)) return;
    try { localStorage.removeItem(STORAGE_BASE + '_' + name); } catch {}
    if (name === currentProfile) {
      progress = {};
      unlockFirstLesson();
      currentLessonIdx = -1;
      document.getElementById('welcomeScreen').style.display = '';
      document.getElementById('lessonFrame').style.display = 'none';
      document.getElementById('lessonFrame').src = '';
      renderSidebar();
      updateProgressBar();
    }
    _renderTeacherDashboard();
  }

  function _removeStudent(name) {
    if (!confirm(`Remove ${name} from the student list?\nThis will also delete their progress.`)) return;
    try { localStorage.removeItem(STORAGE_BASE + '_' + name); } catch {}
    profiles = profiles.filter(p => p !== name);
    saveProfiles();
    if (name === currentProfile) {
      currentProfile = '';
      try { localStorage.removeItem(CURR_PROF_KEY); } catch {}
      _updateProfileDisplay();
      progress = {};
    }
    _renderTeacherDashboard();
  }

  // ── Sidebar Toggle ────────────────────────────────────────
  function initSidebarToggle() {
    const toggle  = document.getElementById('sidebarToggle');
    const reveal  = document.getElementById('sidebarReveal');
    const sidebar = document.getElementById('sidebar');

    toggle.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
      reveal.style.display = 'flex';
    });

    reveal.addEventListener('click', () => {
      sidebar.classList.remove('collapsed');
      reveal.style.display = 'none';
    });
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    loadProfiles();

    try {
      const saved = localStorage.getItem(CURR_PROF_KEY);
      if (saved && profiles.includes(saved)) {
        currentProfile = saved;
        _updateProfileDisplay();
        loadProgress();
        unlockFirstLesson();
      } else {
        try { localStorage.removeItem(CURR_PROF_KEY); } catch {}
      }
    } catch {}

    initLanguagePicker();
    renderSidebar();
    renderWelcomeGrid();
    updateProgressBar();
    initSidebarToggle();
    window.addEventListener('message', handleLessonMessage);

    if (!currentProfile) showProfileScreen();
  }

  return {
    init,
    loadLesson,
    startFirstLesson,
    goToNextLesson,
    goToPrevLesson,
    closeModal,
    modalNextLesson,
    onLessonComplete,
    createProfile,
    switchProfile,
    setLanguage,
    showTeacherView,
    closeTeacherView,
  };
})();

document.addEventListener('DOMContentLoaded', () => app.init());
