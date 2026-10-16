/**
 * SQLITE ENTERPRISE DATABASE LAYER (DB.JS)
 * Chuẩn ACID, Chế độ WAL (Write-Ahead Logging) chống hỏng file, Hiệu năng cao
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Nhận diện môi trường Serverless (Vercel, AWS Lambda)
const isServerless = Boolean(
  process.env.VERCEL === '1' ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION
);

const BUNDLED_DIR = path.join(__dirname, 'data');
// Trên serverless (/var/task là read-only), chỉ duy nhất thư mục tạm tmpdir (/tmp) có quyền ghi file
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'khao-sat-data') : BUNDLED_DIR;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'surveys.db');
const JSON_FILE = path.join(DATA_DIR, 'surveys.json');
const BACKUP_JSON_FILE = path.join(DATA_DIR, 'surveys.backup.json');
const CLEARED_MARKER = path.join(DATA_DIR, '.cleared');

// Nếu chạy trên serverless và chưa có file db trong /tmp
if (isServerless && !fs.existsSync(DB_FILE)) {
  if (!fs.existsSync(CLEARED_MARKER)) {
    const bundledDb = path.join(BUNDLED_DIR, 'surveys.db');
    if (fs.existsSync(bundledDb)) {
      try {
        fs.copyFileSync(bundledDb, DB_FILE);
      } catch (err) {
        console.warn('[Serverless Init Warning]: Không thể sao chép surveys.db sẵn có:', err.message);
      }
    }
    const bundledJson = path.join(BUNDLED_DIR, 'surveys.json');
    if (fs.existsSync(bundledJson) && !fs.existsSync(JSON_FILE)) {
      try { fs.copyFileSync(bundledJson, JSON_FILE); } catch (_) {}
    }
    const bundledBackup = path.join(BUNDLED_DIR, 'surveys.backup.json');
    if (fs.existsSync(bundledBackup) && !fs.existsSync(BACKUP_JSON_FILE)) {
      try { fs.copyFileSync(bundledBackup, BACKUP_JSON_FILE); } catch (_) {}
    }
  }
}

// Khởi tạo kết nối SQLite với file database
const db = new Database(DB_FILE);

// Kích hoạt các PRAGMA chuẩn doanh nghiệp tối ưu hiệu năng & độ bền dữ liệu
if (isServerless) {
  // Trên môi trường container serverless, chế độ DELETE an toàn tuyệt đối, không phụ thuộc bộ nhớ chia sẻ -shm
  db.pragma('journal_mode = DELETE');
  db.pragma('mmap_size = 67108864'); // 64MB memory-mapped I/O
} else {
  // Môi trường máy chủ cố định / nội bộ: chế độ WAL tối ưu tốc độ đọc ghi đồng thời
  db.pragma('journal_mode = WAL');
  db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O
}
db.pragma('synchronous = NORMAL');      // Cân bằng hoàn hảo giữa an toàn dữ liệu và tốc độ ghi đĩa
db.pragma('busy_timeout = 5000');       // Cơ chế hàng đợi tự động chờ 5s, chống lỗi EBUSY/locked
db.pragma('temp_store = MEMORY');       // Lưu bảng tạm và index tạm trên RAM
db.pragma('cache_size = -64000');       // Cấp phát 64MB RAM làm bộ đệm trang (Page Cache)
db.pragma('foreign_keys = ON');

// 1. Tạo cấu trúc bảng chuẩn mực
db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    submitted_at TEXT NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL,
    experience TEXT NOT NULL,
    gender TEXT NOT NULL,
    degree TEXT NOT NULL,
    
    -- 23 Tiêu chí chuẩn Bộ Y tế (Likert 1 - 5)
    a1 INTEGER NOT NULL DEFAULT 3,
    a2 INTEGER NOT NULL DEFAULT 3,
    a3 INTEGER NOT NULL DEFAULT 3,
    a4 INTEGER NOT NULL DEFAULT 3,
    a5 INTEGER NOT NULL DEFAULT 3,
    
    b1 INTEGER NOT NULL DEFAULT 3,
    b2 INTEGER NOT NULL DEFAULT 3,
    b3 INTEGER NOT NULL DEFAULT 3,
    b4 INTEGER NOT NULL DEFAULT 3,
    b5 INTEGER NOT NULL DEFAULT 3,
    
    c1 INTEGER NOT NULL DEFAULT 3,
    c2 INTEGER NOT NULL DEFAULT 3,
    c3 INTEGER NOT NULL DEFAULT 3,
    c4 INTEGER NOT NULL DEFAULT 3,
    c5 INTEGER NOT NULL DEFAULT 3,
    
    d1 INTEGER NOT NULL DEFAULT 3,
    d2 INTEGER NOT NULL DEFAULT 3,
    d3 INTEGER NOT NULL DEFAULT 3,
    d4 INTEGER NOT NULL DEFAULT 3,
    
    e1 INTEGER NOT NULL DEFAULT 3,
    e2 INTEGER NOT NULL DEFAULT 3,
    e3 INTEGER NOT NULL DEFAULT 3,
    e4 INTEGER NOT NULL DEFAULT 3,
    
    -- Đánh giá chung & Gắn kết
    overall_score INTEGER NOT NULL DEFAULT 8,
    commitment TEXT NOT NULL DEFAULT 'chac_chan',
    enps INTEGER NOT NULL DEFAULT 8,
    suggestions TEXT DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_surveys_dept ON surveys (department);
  CREATE INDEX IF NOT EXISTS idx_surveys_submitted ON surveys (submitted_at);
`);

// Helper chuyển từ Row SQLite sang Object Survey
function rowToSurvey(row) {
  if (!row) return null;
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    demographics: {
      department: row.department,
      role: row.role,
      experience: row.experience,
      gender: row.gender,
      degree: row.degree
    },
    answers: {
      a1: row.a1, a2: row.a2, a3: row.a3, a4: row.a4, a5: row.a5,
      b1: row.b1, b2: row.b2, b3: row.b3, b4: row.b4, b5: row.b5,
      c1: row.c1, c2: row.c2, c3: row.c3, c4: row.c4, c5: row.c5,
      d1: row.d1, d2: row.d2, d3: row.d3, d4: row.d4,
      e1: row.e1, e2: row.e2, e3: row.e3, e4: row.e4
    },
    overall: {
      score: row.overall_score,
      commitment: row.commitment,
      enps: row.enps,
      suggestions: row.suggestions || ''
    }
  };
}

// Helper chuyển từ Object Survey sang Row SQLite
function surveyToRow(s) {
  return {
    id: s.id,
    submitted_at: s.submittedAt || new Date().toISOString(),
    department: s.demographics?.department || 'other',
    role: s.demographics?.role || 'other',
    experience: s.demographics?.experience || 'other',
    gender: s.demographics?.gender || 'khac',
    degree: s.demographics?.degree || 'other',
    
    a1: Number(s.answers?.a1) || 3,
    a2: Number(s.answers?.a2) || 3,
    a3: Number(s.answers?.a3) || 3,
    a4: Number(s.answers?.a4) || 3,
    a5: Number(s.answers?.a5) || 3,
    
    b1: Number(s.answers?.b1) || 3,
    b2: Number(s.answers?.b2) || 3,
    b3: Number(s.answers?.b3) || 3,
    b4: Number(s.answers?.b4) || 3,
    b5: Number(s.answers?.b5) || 3,
    
    c1: Number(s.answers?.c1) || 3,
    c2: Number(s.answers?.c2) || 3,
    c3: Number(s.answers?.c3) || 3,
    c4: Number(s.answers?.c4) || 3,
    c5: Number(s.answers?.c5) || 3,
    
    d1: Number(s.answers?.d1) || 3,
    d2: Number(s.answers?.d2) || 3,
    d3: Number(s.answers?.d3) || 3,
    d4: Number(s.answers?.d4) || 3,
    
    e1: Number(s.answers?.e1) || 3,
    e2: Number(s.answers?.e2) || 3,
    e3: Number(s.answers?.e3) || 3,
    e4: Number(s.answers?.e4) || 3,
    
    overall_score: Number(s.overall?.score) || 8,
    commitment: s.overall?.commitment || 'chac_chan',
    enps: Number(s.overall?.enps) || 8,
    suggestions: s.overall?.suggestions || ''
  };
}

// Prepared Statements tối ưu tốc độ thực thi
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO surveys (
    id, submitted_at, department, role, experience, gender, degree,
    a1, a2, a3, a4, a5,
    b1, b2, b3, b4, b5,
    c1, c2, c3, c4, c5,
    d1, d2, d3, d4,
    e1, e2, e3, e4,
    overall_score, commitment, enps, suggestions
  ) VALUES (
    @id, @submitted_at, @department, @role, @experience, @gender, @degree,
    @a1, @a2, @a3, @a4, @a5,
    @b1, @b2, @b3, @b4, @b5,
    @c1, @c2, @c3, @c4, @c5,
    @d1, @d2, @d3, @d4,
    @e1, @e2, @e3, @e4,
    @overall_score, @commitment, @enps, @suggestions
  )
`);

// 2. Tự động chuyển đổi dữ liệu từ surveys.json hoặc surveys.backup.json nếu Database SQLite mới khởi tạo
const currentCount = db.prepare('SELECT COUNT(*) as count FROM surveys').get().count;
if (currentCount === 0 && (!isServerless || !fs.existsSync(CLEARED_MARKER))) {
  let surveysToLoad = null;

  if (fs.existsSync(JSON_FILE)) {
    try {
      const raw = fs.readFileSync(JSON_FILE, 'utf8');
      const existing = JSON.parse(raw);
      if (Array.isArray(existing) && existing.length > 0) {
        surveysToLoad = existing;
      }
    } catch (_) {}
  }

  // Fallback sang file backup nếu surveys.json trống
  if ((!surveysToLoad || surveysToLoad.length === 0) && fs.existsSync(BACKUP_JSON_FILE)) {
    try {
      const rawBackup = fs.readFileSync(BACKUP_JSON_FILE, 'utf8');
      const backupExisting = JSON.parse(rawBackup);
      if (Array.isArray(backupExisting) && backupExisting.length > 0) {
        surveysToLoad = backupExisting;
      }
    } catch (_) {}
  }

  // Fallback sang bundled backup trên serverless nếu cần
  if ((!surveysToLoad || surveysToLoad.length === 0) && isServerless) {
    const bundledBackup = path.join(BUNDLED_DIR, 'surveys.backup.json');
    if (fs.existsSync(bundledBackup)) {
      try {
        const raw = fs.readFileSync(bundledBackup, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          surveysToLoad = parsed;
        }
      } catch (_) {}
    }
  }

  if (surveysToLoad && surveysToLoad.length > 0) {
    console.log(`[SQLite Migration] Đang tự động nạp ${surveysToLoad.length} bản ghi hiện có vào surveys.db...`);
    const insertManyTx = db.transaction((surveys) => {
      for (const s of surveys) {
        insertStmt.run(surveyToRow(s));
      }
    });
    insertManyTx(surveysToLoad);
    console.log(`[SQLite Migration] Hoàn tất nạp ${surveysToLoad.length} bản ghi sang cơ sở dữ liệu SQLite!`);
    try {
      fs.writeFileSync(JSON_FILE, JSON.stringify(surveysToLoad, null, 2), 'utf8');
    } catch (_) {}
  }
}

// Cơ chế sao lưu JSON dự phòng bất đồng bộ với Debounce và Atomic Write chống khóa file EBUSY trên Windows
let backupSyncTimer = null;
let isWritingBackup = false;

function scheduleBackupSync() {
  if (backupSyncTimer) clearTimeout(backupSyncTimer);
  backupSyncTimer = setTimeout(() => {
    backupSyncTimer = null;
    performBackupSync();
  }, 1000);
}

function performBackupSync() {
  if (isWritingBackup) {
    scheduleBackupSync();
    return;
  }
  isWritingBackup = true;
  try {
    const all = getAllSurveys();
    const jsonStr = JSON.stringify(all, null, 2);
    const tempFile = `${JSON_FILE}.tmp`;
    fs.writeFile(tempFile, jsonStr, 'utf8', (err) => {
      isWritingBackup = false;
      if (!err) {
        try {
          fs.renameSync(tempFile, JSON_FILE);
        } catch (_) {
          fs.writeFile(JSON_FILE, jsonStr, () => {});
        }
      }
    });
  } catch (err) {
    isWritingBackup = false;
    console.warn('[Backup Sync Warning]:', err.message);
  }
}

// API Functions giao tiếp với Database

/**
 * Lấy tất cả phiếu khảo sát (hỗ trợ lọc theo khối và giai đoạn thời gian)
 */
function getAllSurveys(deptFilter = 'all', startDate = null, endDate = null) {
  let query = 'SELECT * FROM surveys WHERE 1=1';
  const params = [];

  if (deptFilter && deptFilter !== 'all') {
    query += ' AND department = ?';
    params.push(deptFilter);
  }

  if (startDate) {
    query += ' AND date(submitted_at) >= date(?)';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date(submitted_at) <= date(?)';
    params.push(endDate);
  }

  query += ' ORDER BY submitted_at ASC';
  const rows = db.prepare(query).all(...params);
  return rows.map(rowToSurvey);
}

/**
 * Đếm tổng số phiếu (hỗ trợ lọc theo khối và giai đoạn thời gian)
 */
function getSurveyCount(deptFilter = 'all', startDate = null, endDate = null) {
  let query = 'SELECT COUNT(*) as count FROM surveys WHERE 1=1';
  const params = [];

  if (deptFilter && deptFilter !== 'all') {
    query += ' AND department = ?';
    params.push(deptFilter);
  }

  if (startDate) {
    query += ' AND date(submitted_at) >= date(?)';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date(submitted_at) <= date(?)';
    params.push(endDate);
  }

  const row = db.prepare(query).get(...params);
  return row ? row.count : 0;
}

/**
 * Tạo ID tuần tự nguyên tử tiếp theo (NV-0001, NV-0002, ...)
 */
function generateNextSurveyId() {
  const row = db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(id, 4) AS INTEGER)), 0) as maxId FROM surveys WHERE id LIKE 'NV-%'
  `).get();
  const nextNum = (row && row.maxId ? row.maxId : 0) + 1;
  return `NV-${String(nextNum).padStart(4, '0')}`;
}

// Transaction cấp phát ID và ghi dữ liệu nguyên tử (Atomic & Concurrency-Safe)
const insertSurveyTx = db.transaction((s) => {
  if (!s.id || s.id.startsWith('NV-') || s.id === 'auto') {
    const row = db.prepare(`
      SELECT COALESCE(MAX(CAST(SUBSTR(id, 4) AS INTEGER)), 0) as maxId FROM surveys WHERE id LIKE 'NV-%'
    `).get();
    const nextNum = (row && row.maxId ? row.maxId : 0) + 1;
    s.id = `NV-${String(nextNum).padStart(4, '0')}`;
  }
  const row = surveyToRow(s);
  insertStmt.run(row);
  return s.id;
});

/**
 * Thêm một phiếu khảo sát mới (Chuẩn ACID, Chống xung đột ghi đồng thời)
 */
function insertSurvey(survey) {
  if (isServerless && fs.existsSync(CLEARED_MARKER)) {
    try { fs.unlinkSync(CLEARED_MARKER); } catch (_) {}
  }
  const assignedId = insertSurveyTx(survey);
  survey.id = assignedId;
  scheduleBackupSync();
  return survey;
}

/**
 * Thêm hàng loạt phiếu khảo sát (Dùng Transaction siêu tốc cho Mock Data)
 */
function insertManySurveys(surveyList) {
  if (isServerless && fs.existsSync(CLEARED_MARKER)) {
    try { fs.unlinkSync(CLEARED_MARKER); } catch (_) {}
  }
  const insertManyTx = db.transaction((list) => {
    for (const s of list) {
      insertStmt.run(surveyToRow(s));
    }
  });
  insertManyTx(surveyList);
  scheduleBackupSync();
}

/**
 * Xóa sạch toàn bộ dữ liệu (Khi làm mới đợt khảo sát)
 */
function clearAllSurveys() {
  db.prepare('DELETE FROM surveys').run();
  if (backupSyncTimer) clearTimeout(backupSyncTimer);
  try {
    fs.writeFileSync(JSON_FILE, '[]', 'utf8');
  } catch (_) {}
  if (isServerless) {
    try {
      fs.writeFileSync(CLEARED_MARKER, '1', 'utf8');
    } catch (_) {}
  }
}

/**
 * Lấy danh sách phản hồi phân trang và tìm kiếm (hỗ trợ lọc theo khối & giai đoạn)
 */
function getPaginatedResponses({ page = 1, limit = 20, search = '', department = 'all', startDate = null, endDate = null }) {
  let query = 'SELECT * FROM surveys WHERE 1=1';
  const params = [];

  if (department && department !== 'all') {
    query += ' AND department = ?';
    params.push(department);
  }

  if (startDate) {
    query += ' AND date(submitted_at) >= date(?)';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date(submitted_at) <= date(?)';
    params.push(endDate);
  }

  if (search) {
    query += ' AND (LOWER(id) LIKE ? OR LOWER(suggestions) LIKE ?)';
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term);
  }

  // Đếm tổng số bản ghi thỏa mãn điều kiện
  const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
  const countRow = db.prepare(countQuery).get(...params);
  const total = countRow ? countRow.total : 0;

  // Lấy dữ liệu theo trang (mới nhất lên đầu)
  query += ' ORDER BY datetime(submitted_at) DESC LIMIT ? OFFSET ?';
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);

  return {
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    items: rows.map(rowToSurvey)
  };
}

module.exports = {
  db,
  getAllSurveys,
  getSurveyCount,
  generateNextSurveyId,
  insertSurvey,
  insertManySurveys,
  clearAllSurveys,
  getPaginatedResponses
};
