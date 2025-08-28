// --- TETRIS CONSTANTS ---
const COLS = 10;
const ROWS = 20;
const BLOCK = 24;
let colors = [
  null,
  '#FF0D72', // T
  '#0DC2FF', // I
  '#0DFF72', // S
  '#F538FF', // Z
  '#FF8E0D', // L
  '#FFE138', // O
  '#3877FF'  // J
];
const SHAPES = [
  [],
  [ // T
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [ // I
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  [ // S
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  [ // Z
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  [ // L
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [ // O
    [1, 1],
    [1, 1]
  ],
  [ // J
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ]
];
// Add this after the SHAPES array:
const WALL_KICKS = {
  standard: [
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2], [1, 0], [1, 1], [0, 2], [1, -2], [-2, 0]], // 0->1
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2], [-1, 0], [-1, -1], [0, -2], [-1, 2], [2, 0]],   // 1->2
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2], [-1, 0], [-1, 1], [0, 2], [-1, -2], [-2, 0]],  // 2->3
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2], [1, 0], [1, -1], [0, -2], [1, 2], [2, 0]]    // 3->0
  ],
  iPiece: [
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2], [2, 0], [-1, 0], [2, 1], [-1, -2]],  // 0->1
    [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1], [1, 0], [-2, 0], [1, -2], [-2, 1]], // 1->2
    [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2], [-2, 0], [1, 0], [-2, -1], [1, 2]], // 2->3
    [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1], [-1, 0], [2, 0], [-1, 2], [2, -1]]  // 3->0
  ]
};

function getWallKicks(oldMatrix, newMatrix, rotation) {
  const isIPiece = oldMatrix.length === 4 && oldMatrix[1].every(v => v === 1);
  const kicks = isIPiece ? WALL_KICKS.iPiece : WALL_KICKS.standard;
  return kicks[rotation];
}
// --- GAME STATE ---
let arena = createMatrix(COLS, ROWS);
let player = {
  pos: {x: 0, y: 0},
  matrix: null,
  color: null,
  score: 0,
  rotation: 0 // Add to player object
};
let dropCounter = 0;
let dropInterval = 500;
let lastTime = 0;
let gameOver = false;
let paused = false;
// Hold-to-restart state
let restartHoldActive = false;
let restartHoldStart = 0;
let restartHoldMs = 3000;
let restartRemainingMs = 0;
// --- NEXT & HOLD ---
let nextQueue = [];
let holdPiece = null;
let holdUsed = false;
// 7-bag randomizer
let bag = [];
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function refillBag() {
  bag = shuffle([1,2,3,4,5,6,7]);
}
function drawFromBag() {
  if (bag.length === 0) refillBag();
  return bag.pop();
}
function getRandomTetrominoIndex() {
  // Backward compatibility alias to bag draw
  return drawFromBag();
}
function fillNextQueue() {
  while (nextQueue.length < 5) {
    nextQueue.push(drawFromBag());
  }
}
// --- CANVAS ---
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
// Add this after: const holdCtx = holdCanvas.getContext('2d');
var musicEnabled = true;
const audio = new Audio('Strokinthatshitinbrazil.mp3');
audio.loop = true;
audio.preservesPitch = false;
audio.mozPreservesPitch = false;
audio.webkitPreservesPitch = false;
const sfxGameOver = new Audio('fuck-sound-effect-meme.mp3');
sfxGameOver.loop = false;
let musicSpeedTimer = 0;
const MUSIC_SPEED_INTERVAL = 500;
const MUSIC_OSCILLATION_PERIOD = 8000;
const MUSIC_MIN_RATE = 0.5;
const MUSIC_MAX_RATE = 2.0;
// Line clear messages
let lineClearMessage = '';
let lineClearStartTime = 0;
const LINE_CLEAR_DURATION = 500; // 1.5 seconds

// Hard drop animation variables
let hardDropActive = false;
let hardDropStartPos = {x: 0, y: 0};
let hardDropEndPos = {x: 0, y: 0};
let hardDropAnimationStart = 0;
const HARD_DROP_ANIMATION_DURATION = 150; // 150ms animation

// === ADD GHOST PIECE SHADOW (SIMPLE VERSION) ===

// Add these variables after your existing variables (around line 275)
let ghostPiecePos = {x: 0, y: 0};
let ghostPieceMatrix = null;

// Add this simple function to calculate where the ghost lands
function updateGhostPiece() {
  if (!player.matrix || inMenu) return;
  
  // Copy the current piece matrix
  ghostPieceMatrix = player.matrix.map(row => row.slice());
  
  // Start from current position
  let ghostY = player.pos.y;
  const ghostX = player.pos.x;
  
  // Drop straight down until we hit something
  while (!collide(arena, { ...player, pos: { x: ghostX, y: ghostY } }) && ghostY < ROWS) {
    ghostY++;
  }
  ghostY--; // Move back up from collision
  
  ghostPiecePos = { x: ghostX, y: Math.max(0, ghostY) };
}

// --- UTILS ---
function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}
function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x]) {
        const newX = x + o.x;
        const newY = y + o.y;
        
        // Strict bounds checking - no piece can ever be outside these bounds
        if (newX < 0 || newX >= COLS || newY >= ROWS) {
          return true; // Hit wall or floor - NO EXCEPTIONS
        }
        
        // Check collision with existing pieces (but allow pieces above the arena during spawn)
        if (newY >= 0 && arena[newY] && arena[newY][newX] !== 0) {
          return true; // Hit existing piece
        }
      }
    }
  }
  return false;
}
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        // Store tetromino index, not just 1
        arena[y + player.pos.y][x + player.pos.x] = player.tetrominoIndex;
      }
    });
  });
}
function drawMatrix(matrix, offset, colorIndex, ctx = context) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctx.fillStyle = colors[colorIndex || value];
        ctx.fillRect((x + offset.x) * BLOCK, (y + offset.y) * BLOCK, BLOCK, BLOCK);
        ctx.strokeStyle = '#222';
        ctx.strokeRect((x + offset.x) * BLOCK, (y + offset.y) * BLOCK, BLOCK, BLOCK);
      }
    });
  });
}
function drawPreview(ctx, matrix, colorIndex) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!matrix) return;
  // Find bounding box of the tetromino (with I-block special-case handled below)
  let isIBlock = (matrix.length === 4 && matrix[1].every(v => v === 1));
  let offset;
  if (isIBlock) {
    offset = { x: 0, y: 1 };
    if (matrix[1][0] === 1 && matrix[1][1] === 1 && matrix[1][2] === 1 && matrix[1][3] === 1) {
      offset = { x: 0, y: 1 };
    } else {
      offset = { x: 1, y: 0 };
    }
  } else {
    let minX = 4, maxX = -1, minY = 4, maxY = -1;
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      });
    });
    const shapeW = maxX - minX + 1;
    const shapeH = maxY - minY + 1;
    offset = {
      x: Math.floor((4 - shapeW) / 2) - minX,
      y: Math.floor((4 - shapeH) / 2) - minY
    };
  }
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctx.fillStyle = colors[colorIndex || value];
        ctx.fillRect((x + offset.x) * 24, (y + offset.y) * 24, 24, 24);
        ctx.strokeStyle = '#222';
        ctx.strokeRect((x + offset.x) * 24, (y + offset.y) * 24, 24, 24);
      }
    });
  });
}
function drawNextPreviews() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  for (let i = 0; i < 5; i++) {
    const idx = nextQueue[i];
    if (idx == null) continue;
    const m = SHAPES[idx];
    if (!m) continue;
    // Create an offscreen 4x4 area within the tall canvas
    nextCtx.save();
    nextCtx.translate(0, i * 96);
    // Centering logic
    let isIBlock = (m.length === 4 && m[1] && m[1].every(v => v === 1));
    let offset;
    if (isIBlock) {
      offset = { x: 0, y: 1 };
      if (m[1][0] === 1 && m[1][1] === 1 && m[1][2] === 1 && m[1][3] === 1) {
        offset = { x: 0, y: 1 };
      } else {
        offset = { x: 1, y: 0 };
      }
    } else {
      let minX = 4, maxX = -1, minY = 4, maxY = -1;
      m.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        });
      });
      const shapeW = maxX - minX + 1;
      const shapeH = maxY - minY + 1;
      offset = {
        x: Math.floor((4 - shapeW) / 2) - minX,
        y: Math.floor((4 - shapeH) / 2) - minY
      };
    }
    m.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          nextCtx.fillStyle = colors[idx];
          nextCtx.fillRect((x + offset.x) * 24, (y + offset.y) * 24, 24, 24);
          nextCtx.strokeStyle = '#222';
          nextCtx.strokeRect((x + offset.x) * 24, (y + offset.y) * 24, 24, 24);
        }
      });
    });
    nextCtx.restore();
  }
}
function drawGrid() {
  context.save();
  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    context.beginPath();
    context.moveTo(x * BLOCK, 0);
    context.lineTo(x * BLOCK, ROWS * BLOCK);
    context.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    context.beginPath();
    context.moveTo(0, y * BLOCK);
    context.lineTo(COLS * BLOCK, y * BLOCK);
    context.stroke();
  }
  context.restore();
}
// --- MODE STATE ---
let inMenu = true;
let gameMode = null; // '40lines' | 'blitz'
let linesCleared = 0;
let modeStartedAt = 0;
let blitzDurationMs = 120000;
let blitzEndsAt = 0;
// Speed-up toggle/state
let autoSpeedEnabled = true;
const SPEED_DECREMENT_MS = 8;
const SPEED_MIN_MS = 200;
const SPEED_INITIAL_MS = 500;

function setHUD(text) {
  const speedText = ` | Speed-up: ${autoSpeedEnabled ? 'On' : 'Off'}`;
  document.getElementById('modeStatus').textContent = (text || '') + (gameMode ? speedText : '');
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const seconds = (totalSec % 60).toString().padStart(2, '0');
  const hundredths = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
  return `${minutes}:${seconds}.${hundredths}`;
}

function startMode(mode) {
  // Reset core state
  arena = createMatrix(COLS, ROWS);
  player.score = 0;
  gameOver = false;
  holdPiece = null;
  nextQueue = [];
  bag = [];
  linesCleared = 0;
  gameMode = mode;
  inMenu = false;
  paused = false;
  holdUsed = false;
  dropInterval = SPEED_INITIAL_MS;
  // timers
  modeStartedAt = performance.now();
  if (mode === 'blitz') blitzEndsAt = modeStartedAt + blitzDurationMs;
  // Start music
  if (musicEnabled) {
    audio.currentTime = 0;
    audio.playbackRate = 1.0;
    audio.preservesPitch = false;
    audio.mozPreservesPitch = false;
    audio.webkitPreservesPitch = false;
    audio.play();
    musicSpeedTimer = 0;
  }
  playerReset();
  updateScore();
  updateHUDForMode();
}

function endMode(message) {
  paused = true;
  setHUD(message);
  // Stop music
  audio.pause();
  // Return to menu after a short delay
  setTimeout(() => {
    inMenu = true;
    paused = false;
    gameMode = null;
    setHUD('');
  }, 1200);
}

function updateHUDForMode() {
  if (gameMode === '40lines') {
    const elapsed = performance.now() - modeStartedAt;
    setHUD(`40 Lines: ${linesCleared}/40 | Time: ${formatTime(elapsed)}`);
  } else if (gameMode === 'blitz') {
    const remaining = Math.max(0, blitzEndsAt - performance.now());
    const totalSec = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSec / 60).toString().padStart(1, '0');
    const seconds = (totalSec % 60).toString().padStart(2, '0');
    setHUD(`Blitz: ${minutes}:${seconds} left | Lines: ${linesCleared}`);
  } else {
    setHUD('');
  }
}

function getElapsedMsForMode() {
  if (!gameMode) return 0;
  if (gameMode === 'blitz') return Math.max(0, performance.now() - modeStartedAt);
  return performance.now() - modeStartedAt;
}
function formatStats() {
  const elapsed = getElapsedMsForMode();
  return `Score: ${player.score}\nLines: ${linesCleared}\nTime: ${formatTime(elapsed)}`;
}
function handleGameOver() {
  // Stop music and play SFX
  try { audio.pause(); } catch(e) {}
  try { sfxGameOver.currentTime = 0; sfxGameOver.play(); } catch(e) {}
  // Show stats
  alert('get fucked\n' + formatStats());
  // Return to menu
  performRestart();
}

function handleWin() {
  // Stop music
  try { audio.pause(); } catch(e) {}
  // Show stats
  alert('You Win!\n\n' + formatStats());
  // Return to menu
  performRestart();
}

// Hook up menu buttons after DOM is ready
document.getElementById('btn40').addEventListener('click', () => startMode('40lines'));
document.getElementById('btnBlitz').addEventListener('click', () => startMode('blitz'));
const toggleSpeedEl = document.getElementById('toggleSpeed');
toggleSpeedEl.checked = autoSpeedEnabled;
toggleSpeedEl.addEventListener('change', () => {
  if (!toggleSpeedEl.checked) {
    const phrase = prompt('Type exactly: "I am a faggot" (case sensitive) to disable speed-up');
    if (phrase === 'I am a faggot') {
      autoSpeedEnabled = false;
    } else {
      toggleSpeedEl.checked = true;
      autoSpeedEnabled = true;
    }
  } else {
    autoSpeedEnabled = true;
  }
  updateHUDForMode();
});
const toggleMusicEl = document.getElementById('toggleMusic');
toggleMusicEl.addEventListener('change', () => {
  musicEnabled = toggleMusicEl.checked;
  if (!musicEnabled) {
    audio.pause();
  } else if (!inMenu && gameMode) {
    audio.play();
  }
});

function draw() {
  // Toggle menu visibility
  document.getElementById('startMenu').style.display = inMenu ? 'block' : 'none';
  context.fillStyle = '#222';
  context.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  drawGrid();
  arena.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = colors[value];
        context.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
        context.strokeStyle = '#222';
        context.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
      }
    });
  });
  
  // Draw ghost piece (semi-transparent shadow)
  if (ghostPieceMatrix && !inMenu && !hardDropActive) {
    context.save();
    context.globalAlpha = 0.2;
    drawMatrix(ghostPieceMatrix, ghostPiecePos, player.tetrominoIndex);
    context.restore();
  }
  
  if (player.matrix && !inMenu) drawMatrix(player.matrix, player.pos, player.tetrominoIndex);
  // Draw next (top 3) and hold previews
  drawNextPreviews();
  drawPreview(holdCtx, holdPiece ? SHAPES[holdPiece] : null, holdPiece);
  // Restart hold overlay
  if (restartHoldActive) {
    const secs = Math.ceil(restartRemainingMs / 1000);
    context.save();
    context.globalAlpha = 0.75;
    context.fillStyle = '#000';
    context.fillRect(0, ROWS * BLOCK / 2 - 60, COLS * BLOCK, 120);
    context.globalAlpha = 1;
    context.fillStyle = '#fff';
    context.font = 'bold 22px sans-serif';
    context.textAlign = 'center';
    context.fillText(`Hold R to restart: ${secs}`, COLS * BLOCK / 2, ROWS * BLOCK / 2 - 10);
    const barW = COLS * BLOCK * (1 - (restartRemainingMs / restartHoldMs));
    context.fillStyle = '#0DC2FF';
    context.fillRect(0, ROWS * BLOCK / 2 + 10, barW, 12);
    context.strokeStyle = '#fff';
    context.strokeRect(0, ROWS * BLOCK / 2 + 10, COLS * BLOCK, 12);
    context.restore();
  }
  if (paused && !inMenu) {
    context.save();
    context.globalAlpha = 0.7;
    context.fillStyle = '#000';
    context.fillRect(0, ROWS * BLOCK / 2 - 40, COLS * BLOCK, 80);
    context.globalAlpha = 1;
    context.fillStyle = '#fff';
    context.font = 'bold 36px sans-serif';
    context.textAlign = 'center';
    context.fillText('Paused', COLS * BLOCK / 2, ROWS * BLOCK / 2 + 12);
    context.restore();
  }
  // Draw line clear message
  if (lineClearMessage && !inMenu) {
    const elapsed = performance.now() - lineClearStartTime;
    if (elapsed < LINE_CLEAR_DURATION) {
      const alpha = Math.min(1, 3 * (1 - elapsed / LINE_CLEAR_DURATION));
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = '#fff';
      context.font = 'bold 24px sans-serif';
      context.textAlign = 'center';
      context.fillText(lineClearMessage, COLS * BLOCK / 2, ROWS * BLOCK / 2 - 20);
      context.restore();
    } else {
      lineClearMessage = '';
    }
  }
}
// --- Only reset holdUsed after piece locks and new one spawns ---
let lockDelayActive = false;
let lockDelayStart = 0;
const LOCK_DELAY_MS = 250; // 0.25 seconds of grace time
let pieceOnGround = false;
function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--; // Move back up
    
    if (!pieceOnGround) {
      // First time touching ground - start lock delay
      pieceOnGround = true;
      lockDelayActive = true;
      lockDelayStart = performance.now();
    }
    
    // Check if lock delay has expired
    if (lockDelayActive && (performance.now() - lockDelayStart) >= LOCK_DELAY_MS) {
      // Lock the piece
      merge(arena, player);
      arenaSweep();
      // Speed up after piece locks
      if (autoSpeedEnabled) {
        dropInterval = Math.max(SPEED_MIN_MS, dropInterval - SPEED_DECREMENT_MS);
      }
      playerReset();
      updateScore();
      if (collide(arena, player)) {
        handleGameOver();
      }
      holdUsed = false; // Only reset hold after piece locks
      
      // Reset lock delay state
      pieceOnGround = false;
      lockDelayActive = false;
    }
  } else {
    // Piece moved down successfully, reset ground state
    pieceOnGround = false;
    lockDelayActive = false;
  }
  dropCounter = 0;
}
function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  } else {
    // Successfully moved, reset lock delay
    pieceOnGround = false;
    lockDelayActive = false;
  }
  updateGhostPiece();
}
function playerRotate() {
  const originalMatrix = player.matrix;
  const originalPos = { ...player.pos };
  const originalRotation = player.rotation;
  
  // Create rotated matrix
  const rotatedMatrix = rotate(originalMatrix);
  
  // ALWAYS try basic rotation first
  const basicTest = { 
    ...player, 
    matrix: rotatedMatrix,
    pos: { ...player.pos } 
  };
  
  if (!collide(arena, basicTest)) {
    player.matrix = rotatedMatrix;
    player.rotation = (player.rotation + 1) % 4;
    // Successfully rotated, reset lock delay
    pieceOnGround = false;
    lockDelayActive = false;
    updateGhostPiece();
    return;
  }
  
  // If basic rotation fails, try ALL wall kicks
  const kicks = getWallKicks(originalMatrix, rotatedMatrix, originalRotation);
  
  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i];
    const testPlayer = {
      ...player,
      matrix: rotatedMatrix,
      pos: { x: player.pos.x + dx, y: player.pos.y + dy }
    };
    
    // Double-check the test position is valid
    if (!collide(arena, testPlayer)) {
      player.matrix = rotatedMatrix;
      player.pos.x += dx;
      player.pos.y += dy;
      player.rotation = (player.rotation + 1) % 4;
      // Successfully rotated, reset lock delay
      pieceOnGround = false;
      lockDelayActive = false;
      updateGhostPiece();
      return;
    }
  }
  
  // If NO rotation works, keep original position (no rotation at all)
}
function rotate(matrix, reverse) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (reverse) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
  return matrix;
}
function arenaSweep() {
  let rowCount = 1;
  let cleared = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    player.score += rowCount * 10;
    rowCount *= 2;
    cleared += 1;
  }
  if (cleared > 0) linesCleared += cleared;
  // Set line clear message
  if (cleared === 2) {
    lineClearMessage = 'double :3';
    lineClearStartTime = performance.now();
  } else if (cleared === 3) {
    lineClearMessage = 'triple :3';
    lineClearStartTime = performance.now();
  } else if (cleared === 4) {
    lineClearMessage = 'tetris :3';
    lineClearStartTime = performance.now();
  }
}
function playerReset() {
  fillNextQueue();
  const tetrominoIndex = nextQueue.shift();
  player.matrix = SHAPES[tetrominoIndex].map(row => row.slice());
  player.color = colors[tetrominoIndex];
  player.tetrominoIndex = tetrominoIndex;
  player.pos.y = 0;
  player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  holdUsed = false;
  fillNextQueue();
  
  // Reset lock delay state for new piece
  pieceOnGround = false;
  lockDelayActive = false;
  
  updateGhostPiece();
  
  if (collide(arena, player)) {
    handleGameOver();
  }
}
function playerHold() {
  if (holdUsed) return;
  holdUsed = true;
  if (holdPiece == null) {
    holdPiece = player.tetrominoIndex;
    playerReset();
  } else {
    // Swap
    let temp = player.tetrominoIndex;
    player.matrix = SHAPES[holdPiece].map(row => row.slice());
    player.color = colors[holdPiece];
    player.tetrominoIndex = holdPiece;
    player.pos.y = 0;
    player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    holdPiece = temp;
    if (collide(arena, player)) {
      handleGameOver();
    }
  }
}
function updateScore() {
  document.getElementById('score').textContent = 'Score: ' + player.score;
}
// --- MOVEMENT DELAY ---
let moveLeftHeld = false, moveRightHeld = false, softDropHeld = false;
let moveLeftTimer = 0, moveRightTimer = 0, softDropTimer = 0;
const MOVE_INITIAL_DELAY = 120; // ms before repeat starts
const MOVE_REPEAT = 60; // ms between moves when holding
function handleMoveTimers(deltaTime) {
  if (moveLeftHeld) {
    moveLeftTimer -= deltaTime;
    if (moveLeftTimer <= 0) {
      playerMove(-1);
      moveLeftTimer = MOVE_REPEAT;
    }
  }
  if (moveRightHeld) {
    moveRightTimer -= deltaTime;
    if (moveRightTimer <= 0) {
      playerMove(1);
      moveRightTimer = MOVE_REPEAT;
    }
  }
  if (softDropHeld) {
    softDropTimer -= deltaTime;
    if (softDropTimer <= 0) {
      playerDrop();
      softDropTimer = MOVE_REPEAT;
    }
  }
}
function update(time = 0) {
  if (inMenu) {
    draw();
    requestAnimationFrame(update);
    return;
  }
  if (gameOver) return;
  if (paused) {
    if (restartHoldActive) {
      const now = performance.now();
      restartRemainingMs = Math.max(0, restartHoldMs - (now - restartHoldStart));
      if (restartRemainingMs === 0) { performRestart(); restartHoldActive = false; }
    }
    updateHUDForMode();
    draw();
    requestAnimationFrame(update);
    return;
  }
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  handleMoveTimers(deltaTime);
  if (dropCounter > dropInterval) playerDrop();
  // Update restart hold countdown
  if (restartHoldActive) {
    const now = performance.now();
    restartRemainingMs = Math.max(0, restartHoldMs - (now - restartHoldStart));
    if (restartRemainingMs === 0) { performRestart(); restartHoldActive = false; }
  }
  // Update music speed
  if (musicEnabled && !paused) {
    musicSpeedTimer += deltaTime;
    // Oscillate between 0.5x and 2.0x using sine wave
    const oscillationProgress = (musicSpeedTimer % MUSIC_OSCILLATION_PERIOD) / MUSIC_OSCILLATION_PERIOD;
    const sineValue = Math.sin(oscillationProgress * 2 * Math.PI);
    const range = MUSIC_MAX_RATE - MUSIC_MIN_RATE;
    const center = (MUSIC_MAX_RATE + MUSIC_MIN_RATE) / 2;
    audio.playbackRate = center + (sineValue * range / 2);
  }
  // Update mode HUD and end conditions
  if (gameMode === '40lines') {
    updateHUDForMode();
    if (linesCleared >= 40) {
      handleWin();
    }
  } else if (gameMode === 'blitz') {
    updateHUDForMode();
    if (performance.now() >= blitzEndsAt) {
      alert('Blitz Complete!\n\n' + formatStats());
      performRestart();
    }
  }
  // Update hard drop animation
  if (hardDropActive) {
    const elapsed = performance.now() - hardDropAnimationStart;
    const progress = Math.min(elapsed / HARD_DROP_ANIMATION_DURATION, 1);
    
    // Smooth easing function
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // Interpolate position
    player.pos.y = hardDropStartPos.y + (hardDropEndPos.y - hardDropStartPos.y) * easeProgress;
    
    if (progress >= 1) {
      // Animation complete - lock the piece
      player.pos = { ...hardDropEndPos };
      merge(arena, player);
      arenaSweep();
      // Speed up after piece locks
      if (autoSpeedEnabled) {
        dropInterval = Math.max(SPEED_MIN_MS, dropInterval - SPEED_DECREMENT_MS);
      }
      playerReset();
      updateScore();
      if (collide(arena, player)) {
        handleGameOver();
      }
      holdUsed = false;
      
      // Reset animation state
      hardDropActive = false;
      pieceOnGround = false;
      lockDelayActive = false;
    }
  }
  // Update ghost piece position
  if (!inMenu && !gameOver && !paused) {
    updateGhostPiece();
  }
  draw();
  requestAnimationFrame(update);
}
function performRestart() {
  // On restart, return to the mode selection menu
  inMenu = true;
  gameMode = null;
  restartHoldActive = false;
  restartRemainingMs = 0;
  paused = false;
  // Stop music
  audio.pause();
  // Reset core state
  arena = createMatrix(COLS, ROWS);
  player.score = 0;
  gameOver = false;
  holdPiece = null;
  nextQueue = [];
  bag = [];
  linesCleared = 0;
  holdUsed = false;
  dropInterval = SPEED_INITIAL_MS;
  updateScore();
  moveLeftHeld = moveRightHeld = softDropHeld = false;
  moveLeftTimer = moveRightTimer = softDropTimer = 0;
  setHUD('');
  // Re-enable speed-up for next match
  autoSpeedEnabled = true;
  document.getElementById('toggleSpeed').checked = true;
}
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'p') {
    paused = !paused;
    if (!paused) lastTime = performance.now();
    draw();
    return;
  }
  if (event.key.toLowerCase() === 'r') {
    if (!restartHoldActive) {
      restartHoldActive = true;
      restartHoldStart = performance.now();
      restartRemainingMs = restartHoldMs;
    }
    return;
  }
  if (inMenu) return; // block gameplay keys while in menu
  if (gameOver) return;
  if (event.key === 'ArrowLeft') {
    if (!moveLeftHeld) {
      playerMove(-1);
      moveLeftHeld = true;
      moveLeftTimer = MOVE_INITIAL_DELAY; // initial delay
    }
  } else if (event.key === 'ArrowRight') {
    if (!moveRightHeld) {
      playerMove(1);
      moveRightHeld = true;
      moveRightTimer = MOVE_INITIAL_DELAY;
    }
  } else if (event.key === 'ArrowDown') {
    if (!softDropHeld) {
      playerDrop();
      softDropHeld = true;
      softDropTimer = MOVE_INITIAL_DELAY;
    }
  } else if (event.key === 'ArrowUp') {
    playerRotate();
  } else if (event.key === ' ') {
    // Hard drop with animation
    if (!hardDropActive) {
      // Find the drop position
      const originalPos = { ...player.pos };
      while (!collide(arena, player)) {
        player.pos.y++;
      }
      player.pos.y--; // Move back up from collision
      
      // Set up animation
      hardDropActive = true;
      hardDropStartPos = originalPos;
      hardDropEndPos = { ...player.pos };
      hardDropAnimationStart = performance.now();
      
      // Reset to starting position for animation
      player.pos = originalPos;
    }
  } else if (event.key === 'Shift' || event.key.toLowerCase() === 'c') {
    playerHold();
  }
});
document.addEventListener('keyup', event => {
  if (event.key.toLowerCase() === 'r') {
    restartHoldActive = false;
    restartRemainingMs = 0;
  }
  if (event.key === 'ArrowLeft') moveLeftHeld = false;
  if (event.key === 'ArrowRight') moveRightHeld = false;
  if (event.key === 'ArrowDown') softDropHeld = false;
});
// --- START GAME ---
// nextQueue = [];
// holdPiece = null;
// playerReset();
updateScore();
update();
document.getElementById('error').textContent = '';
