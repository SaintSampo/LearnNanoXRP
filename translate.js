// LearnNanoXRP – AI Translation Script
// Translates all lesson HTML files into a target language using Claude.
//
// Usage:
//   node translate.js --lang es
//   node translate.js --lang es,fr
//   node translate.js --lang es --force          (re-translate even if file exists)
//   node translate.js --lang es --lessons lesson1,lesson2  (specific lessons only)
//
// Requires: ANTHROPIC_API_KEY environment variable
//           npm install  (adds @anthropic-ai/sdk)

const Anthropic = require('@anthropic-ai/sdk');
const fs        = require('fs');
const path      = require('path');

const ROOT        = __dirname;
const LESSONS_DIR = path.join(ROOT, 'lessons');
const SRC_DIR     = path.join(LESSONS_DIR, 'source');
const LANG_FILE   = path.join(ROOT, 'languages.js');

// Known languages: code → display label
const LANG_LABELS = {
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  it: 'Italiano',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  ru: 'Русский',
  nl: 'Nederlands',
};

// ── CLI argument parser ───────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { langs: [], force: false, lessonFilter: null };

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--lang' || args[i] === '--langs') && args[i + 1]) {
      opts.langs = args[++i].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (args[i] === '--force') {
      opts.force = true;
    } else if (args[i] === '--lessons' && args[i + 1]) {
      opts.lessonFilter = args[++i].split(',').map(s => s.trim().toLowerCase());
    }
  }

  if (opts.langs.length === 0) {
    console.error('');
    console.error('  Usage:');
    console.error('    node translate.js --lang <code>[,<code>...]');
    console.error('');
    console.error('  Examples:');
    console.error('    node translate.js --lang es');
    console.error('    node translate.js --lang es,fr,de');
    console.error('    node translate.js --lang es --force');
    console.error('    node translate.js --lang es --lessons lesson1,lesson2');
    console.error('');
    console.error('  Supported codes:', Object.keys(LANG_LABELS).join(', '));
    console.error('');
    process.exit(1);
  }

  return opts;
}

// ── Find English source lesson folders ───────────────────
function findSourceLessons(filter) {
  return fs.readdirSync(SRC_DIR)
    .filter(name => {
      if (!/^lesson\d+-.+/.test(name)) return false;
      const full = path.join(SRC_DIR, name);
      return fs.statSync(full).isDirectory() &&
             fs.existsSync(path.join(full, 'index.html'));
    })
    .sort()
    .filter(name => {
      if (!filter) return true;
      return filter.some(f => name.toLowerCase().startsWith(f));
    })
    .map(name => ({ name, dir: path.join(SRC_DIR, name) }));
}

// ── Claude translation call ───────────────────────────────
async function translateWithClaude(client, html, langCode) {
  const langLabel = LANG_LABELS[langCode] || langCode;

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content:
`Translate the following HTML lesson page into ${langLabel} (language code: ${langCode}).
This lesson is for 5th-grade students (age 10–11).

Translation rules — follow these exactly:
1. Translate ALL visible text: headings, paragraphs, list items, button text, captions, callout text, alt="" values on <img> tags, and quiz questions and answer choices.
2. Keep ALL HTML tags, attributes, CSS class names, IDs, and data-* attribute names exactly as-is. Never modify tag structure.
3. Do NOT translate these technical terms — keep them in English: NanoXRP, XRP, Blockly, MicroPython, Python, JavaScript, SCORM, USB, Wi-Fi, HTML, CSS, Motor 1, Motor 2.
4. Inside <script> blocks: ONLY translate user-facing string literals (alert messages, result titles/messages, button label strings, and the word "of" in slide counters like " of "). Do NOT translate variable names, function names, property keys, CSS class names in JS, or logic.
5. Keep all emoji exactly as they appear — do not change or remove them.
6. Use a friendly, encouraging, age-appropriate tone in the target language.
7. Return ONLY the complete translated HTML document. No explanation, no markdown fences.

HTML to translate:
${html}`,
    }],
  });

  let result = message.content[0].text.trim();

  // Strip any accidental markdown code fences Claude might add
  result = result.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '');

  // Detect truncation
  if (!result.toLowerCase().trim().endsWith('</html>')) {
    throw new Error('Translation appears truncated (does not end with </html>). Try re-running with --force.');
  }

  return result;
}

// ── Translate UI strings for the outer shell ──────────────
async function translateUIStrings(client, langCode) {
  const langLabel = LANG_LABELS[langCode] || langCode;

  const UI_KEYS = {
    subtitleHero:    'Robot Coding Adventure',
    sidebarTitle:    'Lessons',
    progressLabel:   'Progress',
    prevBtn:         '← Previous',
    nextBtn:         'Next Lesson →',
    allDone:         'All Done! 🎉',
    selectLesson:    'Select a lesson to begin',
    welcomeTitle:    'Welcome to LearnNanoXRP!',
    welcomeDesc:     "You're going to learn how to build and program your very own robot. Click a lesson on the left to get started!",
    startLearning:   'Start Learning! →',
    lessonLabel:     'Lesson',
    badgeDone:       'Done!',
    badgeInProgress: 'In Progress',
    stayHere:        'Stay Here',
    modalNext:       'Next Lesson →',
    lessonComplete:  'Lesson {n} Complete!',
    awesomeWork:     'Awesome work! You scored {score}%. Ready for the next lesson?',
    youDidIt:        'You Did It!',
    allFinished:     'You finished all 6 lessons! You are now an XRP Robot programming expert!',
    whosLearning:    "Who's Learning Today?",
    clickYourName:   'Click your name, or add yourself below!',
    noStudents:      'No students yet — be the first to add your name!',
    newStudent:      'New Student',
    namePlaceholder: 'Type your name...',
    letsGo:          "Let's Go! →",
    switchBtn:       'Switch',
  };

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content:
`Translate the following JSON UI strings into ${langLabel} (language code: ${langCode}).
These strings are used in a 5th-grade robot coding learning website.

Rules:
1. Translate ALL string values into natural, friendly ${langLabel}.
2. Preserve {n}, {score}, and other {placeholder} tokens exactly as-is — they are filled in at runtime.
3. Keep "LearnNanoXRP", "NanoXRP", "XRP" in English.
4. Keep emoji exactly as they appear.
5. Return ONLY valid JSON with the same keys — no explanation, no markdown fences.

JSON to translate:
${JSON.stringify(UI_KEYS, null, 2)}`,
    }],
  });

  let raw = message.content[0].text.trim();
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '');
  return JSON.parse(raw);
}

// ── Copy a folder recursively (Node 16.7+ fs.cpSync) ──────
function copyDir(src, dst) {
  if (typeof fs.cpSync === 'function') {
    fs.cpSync(src, dst, { recursive: true });
  } else {
    // Fallback for older Node
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dst, entry.name);
      if (entry.isDirectory()) copyDir(s, d);
      else fs.copyFileSync(s, d);
    }
  }
}

// ── Translate one lesson into one language ────────────────
async function translateLesson(client, lesson, langCode, force) {
  const outDir  = path.join(LESSONS_DIR, 'translations', langCode, lesson.name);
  const outHtml = path.join(outDir, 'index.html');

  if (!force && fs.existsSync(outHtml)) {
    console.log(`  ↷  ${langCode}/${lesson.name}/ already exists — skipping (use --force to overwrite)`);
    return true;
  }

  process.stdout.write(`  ✦  ${lesson.name} → ${langCode} ... `);

  const srcHtml = fs.readFileSync(path.join(lesson.dir, 'index.html'), 'utf8');

  let translated;
  try {
    translated = await translateWithClaude(client, srcHtml, langCode);
  } catch (err) {
    process.stdout.write('\n');
    console.error(`  ✗  API error: ${err.message}`);
    return false;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outHtml, translated, 'utf8');

  // Images are language-neutral — copy the whole images/ folder
  const imgSrc = path.join(lesson.dir, 'images');
  const imgDst = path.join(outDir, 'images');
  if (fs.existsSync(imgSrc) && !fs.existsSync(imgDst)) {
    copyDir(imgSrc, imgDst);
  }

  // Copy imsmanifest.xml unchanged (LMS titles in English are fine)
  const manifestSrc = path.join(lesson.dir, 'imsmanifest.xml');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, path.join(outDir, 'imsmanifest.xml'));
  }

  console.log('done');
  return true;
}

// ── Update languages.js ───────────────────────────────────
function updateLanguagesFile(langCode, langLabel, uiStrings) {
  let langs = [{ code: 'en', label: 'English' }];
  if (fs.existsSync(LANG_FILE)) {
    const raw = fs.readFileSync(LANG_FILE, 'utf8');
    const m   = raw.match(/window\.AVAILABLE_LANGUAGES\s*=\s*(\[[\s\S]*?\]);/);
    if (m) {
      try { langs = JSON.parse(m[1]); } catch {}
    }
  }

  const existing = langs.find(l => l.code === langCode);
  const entry = { code: langCode, label: langLabel, ...(uiStrings ? { ui: uiStrings } : {}) };
  if (existing) {
    Object.assign(existing, entry);
  } else {
    langs.push(entry);
  }

  const out = [
    '// Generated by translate.js — do not edit manually',
    `window.AVAILABLE_LANGUAGES = ${JSON.stringify(langs, null, 2)};`,
    '',
  ].join('\n');

  fs.writeFileSync(LANG_FILE, out, 'utf8');
  console.log(`  ✔  languages.js updated (${langs.map(l => l.code).join(', ')})`);
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('');
    console.error('  Error: ANTHROPIC_API_KEY is not set.');
    console.error('  Get your key at https://console.anthropic.com/');
    console.error('');
    console.error('  Windows:   $env:ANTHROPIC_API_KEY = "sk-ant-..."');
    console.error('  Mac/Linux: export ANTHROPIC_API_KEY=sk-ant-...');
    console.error('');
    process.exit(1);
  }

  const client  = new Anthropic({ apiKey });
  const lessons = findSourceLessons(opts.lessonFilter);

  if (lessons.length === 0) {
    console.error('No lesson folders found in lessons/');
    process.exit(1);
  }

  console.log('');
  console.log('  LearnNanoXRP Translator');
  console.log(`  Lessons : ${lessons.map(l => l.name).join(', ')}`);
  console.log(`  Languages: ${opts.langs.join(', ')}`);
  console.log('');

  for (const langCode of opts.langs) {
    const langLabel = LANG_LABELS[langCode] || langCode;
    console.log(`── ${langLabel} (${langCode}) ──────────────────────────`);

    let allOk = true;
    for (const lesson of lessons) {
      const ok = await translateLesson(client, lesson, langCode, opts.force);
      if (!ok) { allOk = false; break; }
    }

    if (allOk && !opts.lessonFilter) {
      process.stdout.write(`  ✦  Translating UI strings ... `);
      let uiStrings = null;
      try {
        uiStrings = await translateUIStrings(client, langCode);
        console.log('done');
      } catch (err) {
        console.warn(`\n  ⚠  UI string translation failed: ${err.message}`);
      }
      updateLanguagesFile(langCode, langLabel, uiStrings);
    } else if (!allOk) {
      console.warn(`  ⚠  Some translations failed — languages.js not updated for ${langCode}`);
    } else {
      console.log(`  ℹ  Partial run (--lessons used) — languages.js not updated`);
    }

    console.log('');
  }

  console.log('  Done! Run "npm run dev" to preview translated lessons.');
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
