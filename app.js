// LearnNanoXRP – Main Application
// Handles navigation, progress tracking (localStorage), and SCORM bridge.

const LESSONS = [
  {
    id: 'lesson1',
    num: 1,
    title: 'Assembling the Robot',
    icon: '🔧',
    src: 'lessons/lesson1-assembly/index.html',
    scorm: 'scorm-packages/lesson1-assembly.zip',
  },
  {
    id: 'lesson2',
    num: 2,
    title: 'The Web Editor & Blockly',
    icon: '💻',
    src: 'lessons/lesson2-web-editor/index.html',
    scorm: 'scorm-packages/lesson2-web-editor.zip',
  },
  {
    id: 'lesson3',
    num: 3,
    title: 'Making the Robot Drive',
    icon: '🚗',
    src: 'lessons/lesson3-driving/index.html',
    scorm: 'scorm-packages/lesson3-driving.zip',
  },
  {
    id: 'lesson4',
    num: 4,
    title: 'Following a Line',
    icon: '〰️',
    src: 'lessons/lesson4-line-follow/index.html',
    scorm: 'scorm-packages/lesson4-line-follow.zip',
  },
  {
    id: 'lesson5',
    num: 5,
    title: 'Sonar Sensor',
    icon: '📡',
    src: 'lessons/lesson5-sonar/index.html',
    scorm: 'scorm-packages/lesson5-sonar.zip',
  },
  {
    id: 'lesson6',
    num: 6,
    title: 'Wireless Gamepad',
    icon: '🎮',
    src: 'lessons/lesson6-gamepad/index.html',
    scorm: 'scorm-packages/lesson6-gamepad.zip',
  },
];

const STORAGE_KEY = 'learnNanoXRP_progress';

const app = (() => {
  let currentLessonIdx = -1;
  let progress = {};

  // ── Persistence ──────────────────────────────────────────
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      progress = raw ? JSON.parse(raw) : {};
    } catch { progress = {}; }
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
  }

  function getLessonStatus(id) {
    return progress[id] || 'locked'; // 'locked' | 'available' | 'in-progress' | 'complete'
  }

  function setLessonStatus(id, status) {
    progress[id] = status;
    saveProgress();
  }

  // First lesson is always available
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
      const status = getLessonStatus(lesson.id);
      const isActive = idx === currentLessonIdx;
      const btn = document.createElement('button');
      btn.className = [
        'lesson-card',
        status,
        isActive ? 'active' : '',
      ].filter(Boolean).join(' ');
      btn.innerHTML = `
        <span class="card-icon">${statusIcon(status)}</span>
        <span class="card-info">
          <span class="card-num">Lesson ${lesson.num}</span>
          <span class="card-name">${lesson.title}</span>
        </span>
        ${statusBadge(status)}
      `;
      if (status !== 'locked') {
        btn.addEventListener('click', () => loadLesson(idx));
      }
      nav.appendChild(btn);
    });

    // Download links
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
      card.addEventListener('click', () => {
        if (status !== 'locked') loadLesson(idx);
      });
      grid.appendChild(card);
    });
  }

  function updateProgressBar() {
    const done = LESSONS.filter(l => getLessonStatus(l.id) === 'complete').length;
    const pct = Math.round((done / LESSONS.length) * 100);
    document.getElementById('progressBarFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
  }

  // ── Lesson Loading ────────────────────────────────────────
  function loadLesson(idx) {
    const lesson = LESSONS[idx];
    if (!lesson) return;
    const status = getLessonStatus(lesson.id);
    if (status === 'locked') return;

    currentLessonIdx = idx;

    if (status !== 'complete') {
      setLessonStatus(lesson.id, 'in-progress');
    }

    // Show iframe, hide welcome
    document.getElementById('welcomeScreen').style.display = 'none';
    const frame = document.getElementById('lessonFrame');
    frame.style.display = 'block';
    frame.src = lesson.src;

    document.getElementById('currentLessonTitle').textContent =
      `Lesson ${lesson.num}: ${lesson.title}`;

    const prevBtn = document.getElementById('prevLessonBtn');
    const nextBtn = document.getElementById('nextLessonBtn');
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === LESSONS.length - 1 ||
      getLessonStatus(LESSONS[idx + 1]?.id) === 'locked';
    nextBtn.textContent = idx === LESSONS.length - 1 ? 'All Done! 🎉' : 'Next Lesson →';

    renderSidebar();
    updateProgressBar();
  }

  function startFirstLesson() {
    loadLesson(0);
  }

  function goToNextLesson() {
    if (currentLessonIdx < LESSONS.length - 1) {
      const next = currentLessonIdx + 1;
      if (getLessonStatus(LESSONS[next].id) !== 'locked') {
        loadLesson(next);
      }
    }
  }

  function goToPrevLesson() {
    if (currentLessonIdx > 0) loadLesson(currentLessonIdx - 1);
  }

  // ── SCORM / postMessage Bridge ────────────────────────────
  function handleLessonMessage(event) {
    // Only accept messages from same origin (our lesson iframes)
    if (event.origin !== window.location.origin) return;

    const { type, lessonId, score } = event.data || {};

    if (type === 'LESSON_COMPLETE' && lessonId) {
      onLessonComplete(lessonId, score || 100);
    }

    if (type === 'LESSON_PROGRESS' && lessonId) {
      setLessonStatus(lessonId, 'in-progress');
      renderSidebar();
    }
  }

  function onLessonComplete(lessonId, score) {
    const idx = LESSONS.findIndex(l => l.id === lessonId);
    if (idx === -1) return;

    setLessonStatus(lessonId, 'complete');

    // Unlock the next lesson
    if (idx + 1 < LESSONS.length) {
      const nextStatus = getLessonStatus(LESSONS[idx + 1].id);
      if (nextStatus === 'locked') {
        setLessonStatus(LESSONS[idx + 1].id, 'available');
      }
    }

    renderSidebar();
    updateProgressBar();

    // Update nav buttons
    const nextBtn = document.getElementById('nextLessonBtn');
    if (currentLessonIdx === idx) {
      nextBtn.disabled = idx === LESSONS.length - 1;
    }

    showCompletionModal(idx, score);
  }

  // ── Completion Modal ──────────────────────────────────────
  function showCompletionModal(idx, score) {
    const lesson = LESSONS[idx];
    const isLast = idx === LESSONS.length - 1;
    const modal  = document.getElementById('completionModal');
    const emoji  = document.getElementById('modalEmoji');
    const title  = document.getElementById('modalTitle');
    const msg    = document.getElementById('modalMessage');
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

  function closeModal() {
    document.getElementById('completionModal').style.display = 'none';
  }

  function modalNextLesson() {
    closeModal();
    goToNextLesson();
  }

  // ── Sidebar Toggle ────────────────────────────────────────
  function initSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const reveal = document.getElementById('sidebarReveal');
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
    loadProgress();
    unlockFirstLesson();
    renderSidebar();
    renderWelcomeGrid();
    updateProgressBar();
    initSidebarToggle();
    window.addEventListener('message', handleLessonMessage);
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
  };
})();

document.addEventListener('DOMContentLoaded', () => app.init());
