#!/usr/bin/env node
// ============================================================
//  package-scorm.js
//  Creates SCORM 1.2 ZIP packages for each lesson.
//  Run: node package-scorm.js
//  Output: scorm-packages/lesson1-assembly.zip  (etc.)
//
//  Requires: npm install archiver
// ============================================================

const fs      = require('fs');
const path    = require('path');
const archiver = require('archiver');

const LESSONS = [
  'lesson1-assembly',
  'lesson2-web-editor',
  'lesson3-driving',
  'lesson4-line-follow',
  'lesson5-sonar',
  'lesson6-gamepad',
];

const OUTPUT_DIR  = path.join(__dirname, 'scorm-packages');
const LESSONS_DIR = path.join(__dirname, 'lessons', 'source');
const SHARED_DIR  = path.join(__dirname, 'lessons', 'shared');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function packageLesson(lesson) {
  return new Promise((resolve, reject) => {
    const outPath  = path.join(OUTPUT_DIR, `${lesson}.zip`);
    const outStream = fs.createWriteStream(outPath);
    const archive   = archiver('zip', { zlib: { level: 9 } });

    outStream.on('close', () => {
      const kb = (archive.pointer() / 1024).toFixed(1);
      console.log(`  ✓  ${lesson}.zip  (${kb} KB)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(outStream);

    const lessonDir = path.join(LESSONS_DIR, lesson);

    // Add lesson-specific files (index.html, imsmanifest.xml, images/)
    archive.directory(lessonDir, false);

    // Add shared files (lesson.css, scorm-runtime.js) into a shared/ subfolder
    archive.directory(SHARED_DIR, 'shared');

    archive.finalize();
  });
}

(async () => {
  console.log('Packaging SCORM lessons...\n');
  for (const lesson of LESSONS) {
    await packageLesson(lesson);
  }
  console.log('\n✅  All SCORM packages created in scorm-packages/');
  console.log('\nThese ZIP files can be uploaded to:');
  console.log('  • Canvas LMS  (Modules → Add Item → External Tool or Content → Upload SCORM)');
  console.log('  • Moodle      (Turn editing on → Add activity → SCORM package)');
  console.log('  • Google Classroom (not natively, use a SCORM player add-on)');
  console.log('  • Any LMS that supports SCORM 1.2\n');
})();
