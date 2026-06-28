#!/usr/bin/env node
// ============================================================
//  generate-placeholders.js
//  Run: node generate-placeholders.js
//  Creates all placeholder SVG images in each lesson's images/
//  folder. Replace any SVG with a real PNG photo of the same
//  name (changing .svg to .png and updating the <img src="">).
// ============================================================

const fs   = require('fs');
const path = require('path');

// Accent colors per lesson
const LESSON_COLORS = {
  'lesson1-assembly':  { bg: '#EEF2FF', border: '#6366F1', title: '#3730A3', icon: '🔧' },
  'lesson2-web-editor':{ bg: '#FFF7ED', border: '#F97316', title: '#9A3412', icon: '💻' },
  'lesson3-driving':   { bg: '#FFF1F2', border: '#F43F5E', title: '#9F1239', icon: '🚗' },
  'lesson4-line-follow':{ bg: '#F0FDF4', border: '#22C55E', title: '#14532D', icon: '〰️' },
  'lesson5-sonar':     { bg: '#EFF6FF', border: '#3B82F6', title: '#1E3A8A', icon: '📡' },
  'lesson6-gamepad':   { bg: '#FFF7ED', border: '#F97316', title: '#7C2D12', icon: '🎮' },
};

const IMAGES = {
  'lesson1-assembly': [
    { file: '01-completed-robot.svg',      desc: 'Completed NanoXRP Robot\n(front 3/4 view)', sub: 'Show the fully assembled robot on a flat surface' },
    { file: '02-parts-layout.svg',         desc: 'Plastic Parts Laid Out\n(on a table)', sub: 'Chassis, top cover, bottom cover, 2 wheels, 2 caster balls' },
    { file: '02-1-parts-layout.svg',       desc: 'Electronics Laid Out\n(on a table)', sub: '2 motors, 2 motor wires, controller board, sonar sensor, battery' },
    { file: '03-motor-wire-connect.svg',   desc: 'Motor Wires Connected to\nNanoXRP Board', sub: 'Close-up of Left and Right motor port connectors plugged into the board — show correct orientation' },
    { file: '04-battery-connect.svg',      desc: 'Battery Plugged into\nNanoXRP Board', sub: 'Battery connector inserted into the power port on the NanoXRP board' },
    { file: '05-wheel-press.svg',          desc: 'Pressing Wheel onto\nMotor Shaft', sub: 'Wheel nub facing the motor, being pressed firmly onto the shaft — do NOT push on the encoder magnet wheel' },
    { file: '06-chassis-assemble.svg',     desc: 'Chassis Upside Down —\nMotors & Casters Pressed In', sub: 'Chassis flipped over, motors clipped in, caster balls inserted, encoder ports facing down' },
    { file: '07-wire-routing.svg',         desc: 'Motor Wires Routed Through\nRear Wheel Wells', sub: 'Chassis upright, motor wires guided through rear wheel wells, battery routed through the middle — no pinched wires' },
    { file: '08-bottom-plate.svg',         desc: 'Bottom Plate Clipped\nonto Chassis', sub: 'Bottom plate snapped in, line following sensors visible on the underside for orientation check' },
    { file: '09-motor-plug.svg',           desc: 'Motor Wires Plugged\ninto the Motors', sub: 'Close-up of motor wire connectors being inserted into the motor ports' },
    { file: '10-sonar-connect.svg',        desc: 'Sonar Sensor Plugged In\nand Slid into Chassis', sub: '4-pin Dupont connector gently inserted into NanoXRP board, sonar sensor sliding into front chassis slot' },
    { file: '11-battery-cover.svg',        desc: 'Battery Cover Clipped On\nand Slid Forward', sub: 'Battery cover clipped to top of chassis, slid forward until snug against the sonar sensor' },
  ],
  'lesson2-web-editor': [
    { file: '01-web-editor-homepage.svg', desc: 'XRP Web Editor\nin Chrome Browser', sub: 'Show the full editor interface with Blockly workspace, toolbox, and toolbar' },
    { file: '02-usb-connection.svg',      desc: 'USB Cable Connecting Robot\nto Laptop', sub: 'USB-C cable going from robot to laptop USB port' },
    { file: '03-editor-overview.svg',     desc: 'Labeled Editor Interface\n(annotated screenshot)', sub: 'Label: A=Toolbar, B=Toolbox, C=Workspace, D=Python view, E=Terminal' },
    { file: '04-blockly-workspace.svg',   desc: 'Blockly Blocks in Workspace\n(colorful blocks snapped together)', sub: 'Show several blocks connected vertically in the workspace' },
    { file: '05-block-categories.svg',    desc: 'Block Category Toolbox\n(left panel)', sub: 'Colored category names: DriveTrain, Sensors, Control Board, Gamepad, Control, etc.' },
    { file: '06-first-program.svg',       desc: 'First Program: Blink LED\n(blocks in workspace)', sub: 'repeat forever > LED on > wait 0.5 > LED off > wait 0.5' },
    { file: '07-run-button.svg',          desc: 'Run Button Highlighted\nin Toolbar', sub: 'Green play/run button highlighted, robot is connected (green indicator)' },
    { file: '08-save-file.svg',           desc: 'Save Program Dialog\n(File menu open)', sub: 'File menu showing "Save to Robot" and "Save to Computer" options' },
  ],
  'lesson3-driving': [
    { file: '01-robot-driving.svg',        desc: 'NanoXRP Robot Driving\nForward on Table', sub: 'Robot in motion, shot from slightly above' },
    { file: '02-drivetrain-blocks.svg',    desc: 'DriveTrain Block Category\n(all blocks visible)', sub: 'Open DriveTrain toolbox showing straight, turn, set_effort, set_speed, stop blocks' },
    { file: '03-blocking-example.svg',     desc: 'Blocking Command Diagram\n(step 1 → step 2 in sequence)', sub: 'Arrow: DRIVE 30cm → [wait] → TURN 90° → [wait] → DONE' },
    { file: '04-drive-square.svg',         desc: 'Robot Path: Perfect Square\n(overhead view)', sub: 'Floor view showing robot tracks making a square, numbered corners' },
    { file: '05-nonblocking-example.svg',  desc: 'Non-Blocking Command Diagram\n(motors on + code continues)', sub: 'Parallel arrows: MOTORS START → code immediately reads sensor' },
    { file: '06-challenge-path.svg',       desc: 'L-Shaped Path Challenge\n(overhead view with measurements)', sub: 'L-shape with 40cm horizontal, 20cm vertical, directional arrows' },
    { file: '07-speed-ramp.svg',           desc: 'Speed Ramp Graph\n(speed vs time)', sub: 'Bar chart: 0.2 effort → 0.5 effort → 0.8 effort → 0 (stop)' },
  ],
  'lesson4-line-follow': [
    { file: '01-robot-on-line.svg',        desc: 'Robot Following Black Tape Line\n(top-down view)', sub: 'Robot centered on a black tape oval, sensors visible at bottom front' },
    { file: '02-sensor-bottom-view.svg',   desc: 'Bottom View of Robot\n(showing reflectance sensors)', sub: 'Robot flipped over or bottom-up, two IR sensors visible at front-center' },
    { file: '03-ir-diagram.svg',           desc: 'IR Reflection Diagram\n(how the sensor works)', sub: 'Arrow: IR light → black surface (absorbed) vs white surface (reflected back)' },
    { file: '04-sensor-blocks.svg',        desc: 'Reflectance Sensor Blocks\nin Blockly', sub: 'Sensors > Reflectance: "get left reflectance" and "get right reflectance" blocks' },
    { file: '05-tape-track.svg',           desc: 'Black Tape Track on White Surface\n(oval shape)', sub: 'Simple oval made of black electrical tape, about 60cm wide, on white poster board' },
    { file: '06-steering-logic.svg',       desc: 'Line Following Steering Logic\n(diagram)', sub: '3 diagrams: robot drifting left (right sensor on line = steer right), drifting right, on track' },
    { file: '07-blockly-line-follow.svg',  desc: 'Complete Line Following Program\nin Blockly', sub: 'Forever loop with if/else if/else checking left and right sensors, setting effort' },
    { file: '08-tuning.svg',               desc: 'Robot Being Tested on Track\n(in classroom)', sub: 'Robot on tape oval, student nearby with laptop open to editor' },
    { file: '09-figure-8-track.svg',       desc: 'Figure-8 Track\n(advanced challenge)', sub: 'Figure-8 made of black tape, about 120cm wide, with directional arrows' },
  ],
  'lesson5-sonar': [
    { file: '01-robot-stops-before-wall.svg', desc: 'Robot Stopping Before a Wall\n(with distance marker)', sub: 'Robot facing a stack of books, arrow showing 20cm gap between sensor and books' },
    { file: '02-sensor-front-view.svg',       desc: 'Front View of Robot\n(ultrasonic sensor visible)', sub: 'Close-up of robot front showing the two circular sonar sensor eyes' },
    { file: '03-sonar-diagram.svg',           desc: 'Sonar Echolocation Diagram\n(sound waves)', sub: 'Robot emits waves → waves hit wall → echo returns → distance labeled' },
    { file: '04-distance-block.svg',          desc: '"Get Sonar Distance" Block\nin Blockly Sensors menu', sub: 'Sensors > Distance menu open, highlighting the rangefinder.distance() block' },
    { file: '05-stop-code.svg',               desc: 'Stop-Before-Wall Blockly Code\n(complete program)', sub: 'set_effort → repeat until distance < 20 → stop' },
    { file: '06-wall-test-setup.svg',         desc: 'Wall Test Setup\n(books stacked as wall)', sub: 'Robot on table, stack of 3 books as wall, measuring tape showing distance' },
    { file: '07-gradual-stop.svg',            desc: 'Gradual Slowdown Graph\n(speed vs distance from wall)', sub: 'Speed: full at >30cm, slow at 15-30cm, stop at <15cm' },
  ],
  'lesson6-gamepad': [
    { file: '01-gamepad-control.svg',    desc: 'Student Using Gamepad\nto Drive Robot', sub: 'Student holding Xbox-style controller, robot driving on table in front of them' },
    { file: '02-gamepad-connected.svg',  desc: 'Gamepad Connected to Computer\n(USB cable, editor shows icon)', sub: 'Gamepad plugged into laptop USB, editor toolbar shows gamepad icon lit up' },
    { file: '03-gamepad-layout.svg',     desc: 'Labeled Gamepad Diagram\n(top-down view)', sub: 'Xbox controller labeled: Left Stick (LEFT_X, LEFT_Y), Right Stick, A/B/X/Y buttons, bumpers L/R, D-pad' },
    { file: '04-gamepad-blocks.svg',     desc: 'Gamepad Block Category\nin Blockly', sub: 'Orange Gamepad category open: "get gamepad value [LEFT_Y]" and "is button pressed [BTN_A]" blocks' },
    { file: '05-arcade-diagram.svg',     desc: 'Arcade Drive Joystick Map\n(direction arrows)', sub: 'Joystick circle with arrows: up=forward, down=backward, left=turn left, right=turn right, diagonal=both' },
    { file: '06-arcade-code.svg',        desc: 'Arcade Drive Blockly Program\n(complete)', sub: 'Forever loop: arcade(-(LEFT_Y), LEFT_X), wait 0.02' },
    { file: '07-obstacle-course.svg',    desc: 'Obstacle Course Setup\n(books and objects on table)', sub: 'Table with books/bottles arranged as obstacles, tape start/finish line, robot at start' },
  ],
};

function makeSVG(lesson, file, desc, sub, colors) {
  const lines = desc.split('\n');
  const subLines = sub.split(',').map(s => s.trim());

  // Build multi-line text for main description
  let textLines = '';
  lines.forEach((line, i) => {
    textLines += `<text x="400" y="${248 + i * 30}" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${colors.title}" text-anchor="middle">${escXML(line)}</text>\n`;
  });

  // Build sub-description lines
  let subTexts = '';
  const subStartY = 248 + lines.length * 30 + 18;
  subLines.slice(0, 3).forEach((s, i) => {
    subTexts += `<text x="400" y="${subStartY + i * 22}" font-family="Arial, sans-serif" font-size="14" fill="#64748B" text-anchor="middle">${escXML(s.substring(0, 80))}</text>\n`;
  });

  const filename = file.replace('.svg', '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
  <!-- =============================================
       PLACEHOLDER IMAGE
       Lesson: ${lesson}
       File:   ${file}

       REPLACE THIS FILE with a real photo named:
         ${filename}.png
       Then update <img src="images/${filename}.svg">
       to        <img src="images/${filename}.png">
       ============================================= -->

  <!-- Background -->
  <rect width="800" height="500" fill="${colors.bg}" rx="12"/>

  <!-- Dashed border -->
  <rect x="12" y="12" width="776" height="476" fill="none"
    stroke="${colors.border}" stroke-width="2.5"
    stroke-dasharray="14,7" rx="8"/>

  <!-- Camera icon group -->
  <g transform="translate(400, 160)" opacity="0.5">
    <!-- Camera body -->
    <rect x="-40" y="-28" width="80" height="60" rx="8" fill="${colors.border}"/>
    <!-- Camera lens -->
    <circle cx="0" cy="12" r="20" fill="white" opacity="0.6"/>
    <circle cx="0" cy="12" r="12" fill="${colors.border}" opacity="0.5"/>
    <!-- Camera bump top -->
    <rect x="-12" y="-36" width="24" height="12" rx="4" fill="${colors.border}"/>
    <!-- Flash/indicator -->
    <circle cx="26" cy="-18" r="5" fill="#FCD34D" opacity="0.8"/>
  </g>

  <!-- "PHOTO PLACEHOLDER" label -->
  <rect x="280" y="82" width="240" height="28" rx="14" fill="${colors.border}" opacity="0.2"/>
  <text x="400" y="101" font-family="Arial, sans-serif" font-size="13" font-weight="700"
    fill="${colors.border}" text-anchor="middle" letter-spacing="2">📸  PHOTO PLACEHOLDER</text>

  <!-- Main description text -->
${textLines}
  <!-- Sub-description -->
${subTexts}
  <!-- Replace instruction -->
  <text x="400" y="455" font-family="Arial, sans-serif" font-size="12"
    fill="#94A3B8" text-anchor="middle" font-style="italic">
    Replace with: ${escXML(filename)}.png  •  ${escXML(lesson)}
  </text>

  <!-- Lesson icon badge -->
  <circle cx="752" cy="50" r="28" fill="${colors.border}" opacity="0.15"/>
  <text x="752" y="58" font-family="Arial, sans-serif" font-size="22" text-anchor="middle">${colors.icon}</text>
</svg>`;
}

function escXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Generate all images
let totalGenerated = 0;
const baseDir = path.join(__dirname, 'lessons', 'source');

Object.entries(IMAGES).forEach(([lesson, images]) => {
  const colors = LESSON_COLORS[lesson];
  const dir = path.join(baseDir, lesson, 'images');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  images.forEach(({ file, desc, sub }) => {
    const svg = makeSVG(lesson, file, desc, sub, colors);
    const outPath = path.join(dir, file);
    fs.writeFileSync(outPath, svg, 'utf8');
    console.log(`  ✓  ${lesson}/images/${file}`);
    totalGenerated++;
  });
});

console.log(`\n✅  Generated ${totalGenerated} placeholder SVG images.`);
console.log('\nTo replace an image with a real photo:');
console.log('  1. Take or find a photo of the subject described in the SVG comment.');
console.log('  2. Save it as  lessons/<lesson>/images/<filename>.png');
console.log('  3. In the lesson HTML, change the <img src="...svg"> to <img src="...png">');
console.log('\nImages are used as <img> tags, so any web-compatible format works (PNG, JPG, WebP, SVG).\n');
