const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const XLSX = require('xlsx');

const SURVEY_CONFIG = require('./questions');
const db = require('./db');
const googleSheetSync = require('./googleSheetSync');
const settingsManager = require('./settingsManager');

const isServerless = Boolean(
  process.env.VERCEL === '1' ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION
);
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'khao-sat-data') : path.join(__dirname, 'data');

const app = express();
const PORT = process.env.PORT || 3000;

// ADMIN CREDENTIALS CONFIGURATION
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// Persistent Secret for Signing Session Tokens (HMAC-SHA256)
const SESSION_SECRET = process.env.SESSION_SECRET || 'HOSPITAL_SURVEY_HMAC_SECRET_2026_KEY';

// In-memory active admin sessions store (fallback & revocation list)
const adminSessions = new Map();

// Helper to create admin session token (valid 24h, stateless HMAC cryptographic token)
function createAdminSession(user) {
  const now = Date.now();
  const payload = {
    user: user || ADMIN_USER,
    iat: now,
    exp: now + 24 * 60 * 60 * 1000 // 24 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  const token = `${payloadB64}.${signature}`;

  // Keep in memory map as fallback for backward compatibility
  adminSessions.set(token, {
    user: payload.user,
    createdAt: now,
    expiresAt: payload.exp
  });

  return token;
}

// Verify Admin Session Token (Serverless-safe & Memory-safe)
function verifyAdminSession(token) {
  if (!token || typeof token !== 'string') return null;

  // 1. Verify HMAC stateless token (Works across any serverless instance or after server restart)
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [payloadB64, signature] = parts;
      try {
        const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSig);
        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          if (payload && payload.exp && Date.now() <= payload.exp) {
            return { user: payload.user || ADMIN_USER };
          }
        }
      } catch (_) {}
    }
  }

  // 2. Check in-memory store fallback
  const memSession = adminSessions.get(token);
  if (memSession && Date.now() <= memSession.expiresAt) {
    return { user: memSession.user };
  }

  return null;
}

// Helper to extract token from various sources (Headers, Cookies, Query)
function extractAdminToken(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]).trim();
  }
  return token;
}

// Authentication middleware for Admin routes
function requireAdmin(req, res, next) {
  const token = extractAdminToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Yêu cầu đăng nhập tài khoản Quản trị viên (Admin) để xem kết quả.'
    });
  }

  const session = verifyAdminSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Phiên làm việc Quản trị viên đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
    });
  }

  req.adminUser = session.user;
  next();
}

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (_) {}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get local network IP
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Helper hàm đọc toàn bộ khảo sát từ cơ sở dữ liệu SQLite
function readSurveys() {
  return db.getAllSurveys();
}

// API: Get survey config & system status
app.get('/api/config', (req, res) => {
  const clientTarget = req.headers['x-target-respondents'] || req.query.target;
  if (clientTarget) {
    settingsManager.syncClientTarget(clientTarget);
  }
  const currentTarget = settingsManager.getTargetRespondents();

  const localIps = getLocalIpAddresses();
  const primaryIp = localIps.length > 0 ? localIps[0] : 'localhost';
  const hostHeader = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const currentOrigin = hostHeader ? `${protocol}://${hostHeader}` : `http://${primaryIp}:${PORT}`;
  
  res.json({
    config: {
      ...SURVEY_CONFIG,
      targetRespondents: currentTarget
    },
    totalCount: db.getSurveyCount(),
    target: currentTarget,
    localIps,
    networkUrl: isServerless ? currentOrigin : `http://${primaryIp}:${PORT}`,
    localUrl: isServerless ? currentOrigin : `http://localhost:${PORT}`,
    currentOrigin,
    isServerless,
    tunnelUrl: process.env.TUNNEL_URL || null,
    engine: isServerless ? 'Vercel Cloud Serverless (Auto Google Sheet Sync)' : 'SQLite WAL Mode (Enterprise ACID)',
    googleSheetConnected: Boolean(googleSheetSync.getWebhookUrl())
  });
});

// API: Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
  }

  if (username.trim() === ADMIN_USER && settingsManager.verifyAdminPassword(password)) {
    const token = createAdminSession(ADMIN_USER);
    res.setHeader('Set-Cookie', `admin_token=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax`);
    return res.json({
      success: true,
      token,
      user: ADMIN_USER,
      message: 'Đăng nhập Quản trị viên thành công!'
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác!'
    });
  }
});

// API: Admin Logout
app.post('/api/admin/logout', (req, res) => {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }
  if (token) {
    adminSessions.delete(token);
  }
  res.setHeader('Set-Cookie', 'admin_token=; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ success: true, message: 'Đã đăng xuất thành công.' });
});

// API: Check Admin Auth status
app.get('/api/admin/check-auth', requireAdmin, (req, res) => {
  res.json({ success: true, authenticated: true, user: req.adminUser });
});

// API: Admin Change Password
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    if (!settingsManager.verifyAdminPassword(currentPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác. Vui lòng thử lại!'
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự trở lên!'
      });
    }

    settingsManager.setAdminPassword(newPassword);
    console.log('[Security] Quản trị viên đã đổi mật khẩu thành công lúc:', new Date().toLocaleString('vi-VN'));

    return res.json({
      success: true,
      message: 'Đổi mật khẩu Quản trị viên thành công! Vui lòng ghi nhớ mật khẩu mới.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật mật khẩu: ' + err.message
    });
  }
});

// API: Admin Reset Password (Khôi phục mật khẩu về mặc định 'admin123')
// Cho phép gọi an toàn từ localhost (máy chủ) hoặc cung cấp Master Key khôi phục
app.post('/api/admin/reset-password', (req, res) => {
  try {
    const { masterKey } = req.body || {};
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isLocal = clientIp.includes('127.0.0.1') || clientIp.includes('::1') || req.hostname === 'localhost';
    const isMasterAuthorized = masterKey && (masterKey === 'BV_RESET_2026' || (process.env.ADMIN_MASTER_KEY && masterKey === process.env.ADMIN_MASTER_KEY));

    if (!isLocal && !isMasterAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền khôi phục mật khẩu. Chỉ được khôi phục từ máy chủ (Localhost) hoặc cần Master Key hợp lệ.'
      });
    }

    const defaultPass = settingsManager.resetAdminPassword();
    // Invalidate old sessions to enforce re-login
    adminSessions.clear();

    console.log('[Security] Đã khôi phục mật khẩu Admin về mặc định lúc:', new Date().toLocaleString('vi-VN'), 'từ IP:', clientIp);

    return res.json({
      success: true,
      message: 'Đã khôi phục mật khẩu Quản trị về mặc định thành công!',
      defaultPassword: defaultPass
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi khôi phục mật khẩu: ' + err.message
    });
  }
});

// API: Submit a response (Thread-safe, Concurrency-proof, Validated & Sanitized)
app.post('/api/submit', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.demographics || !body.answers) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.' });
    }

    // Clean & validate Likert answers (1 to 5)
    const sanitizedAnswers = {};
    if (typeof body.answers === 'object') {
      for (const [k, v] of Object.entries(body.answers)) {
        const num = parseInt(v, 10);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          sanitizedAnswers[k] = num;
        }
      }
    }

    const overallScore = Math.max(1, Math.min(10, parseInt(body.overall?.score, 10) || 8));
    const enpsScore = Math.max(0, Math.min(10, parseInt(body.overall?.enps, 10) || 8));
    const rawSuggestions = String(body.overall?.suggestions || '').trim();
    // Trim & sanitize text length without breaking valid medical inequality symbols like < 5 or > 10
    const cleanSuggestions = rawSuggestions.slice(0, 2000);

    const submission = {
      // ID will be atomically assigned inside SQLite transaction in db.insertSurvey
      submittedAt: new Date().toISOString(),
      demographics: {
        department: String(body.demographics?.department || 'other'),
        role: String(body.demographics?.role || 'other'),
        experience: String(body.demographics?.experience || 'other'),
        gender: String(body.demographics?.gender || 'khac'),
        degree: String(body.demographics?.degree || 'other')
      },
      answers: sanitizedAnswers,
      overall: {
        score: overallScore,
        commitment: String(body.overall?.commitment || 'chac_chan'),
        enps: enpsScore,
        suggestions: cleanSuggestions
      }
    };

    // Lưu trực tiếp vào SQLite chuẩn ACID (WAL mode, non-blocking, atomic sequential ID)
    const saved = db.insertSurvey(submission);

    // Tự động đẩy ngầm (Real-time Async) sang Google Sheet (nếu đã cấu hình)
    googleSheetSync.syncSurveyAsync(saved).catch(err => {
      console.warn('[GoogleSheetSync Error]:', err.message);
    });

    res.json({
      success: true,
      id: saved.id,
      message: 'Gửi phiếu khảo sát thành công. Chân thành cảm ơn sự đóng góp quý báu của bạn!'
    });
  } catch (err) {
    console.error('Error submitting survey:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lưu phản hồi.', error: err.message });
  }
});

// Calculate detailed statistics
function computeStatistics(surveys, filterDept = 'all') {
  let list = surveys;
  if (filterDept && filterDept !== 'all') {
    list = surveys.filter(s => s.demographics?.department === filterDept);
  }

  const total = list.length;
  const currentTarget = settingsManager.getTargetRespondents();

  if (total === 0) {
    const allQuestions = [];
    SURVEY_CONFIG.groups.forEach(g => {
      g.questions.forEach(q => {
        allQuestions.push({
          ...q,
          groupId: g.id,
          groupCode: g.code,
          groupName: g.name,
          meanScore: 0,
          csi: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      });
    });

    const groupScores = SURVEY_CONFIG.groups.map(g => ({
      id: g.id,
      code: g.code,
      name: g.name,
      meanScore: 0,
      csi: 0,
      questionCount: g.questions.length
    }));

    return {
      totalCount: 0,
      target: currentTarget,
      completionRate: 0,
      csi: 0,
      overallMean: 0,
      enps: { score: 0, promoters: 0, passives: 0, detractors: 0, promoterPct: 0, detractorPct: 0 },
      commitment: {},
      groupScores,
      questionScores: allQuestions,
      topStrengths: [],
      topConcerns: [],
      byDepartment: {},
      byRole: {},
      byExperience: {},
      suggestions: []
    };
  }

  // Flatten all questions
  const allQuestions = [];
  SURVEY_CONFIG.groups.forEach(g => {
    g.questions.forEach(q => {
      allQuestions.push({
        ...q,
        groupId: g.id,
        groupCode: g.code,
        groupName: g.name
      });
    });
  });

  // Calculate score for each question
  const questionScores = allQuestions.map(q => {
    let sum = 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach(s => {
      const val = Number(s.answers?.[q.id]) || 3;
      sum += val;
      distribution[val] = (distribution[val] || 0) + 1;
    });

    const mean = Number((sum / total).toFixed(2));
    const csi = Number(((mean / 5) * 100).toFixed(1));

    return {
      id: q.id,
      text: q.text,
      groupId: q.groupId,
      groupCode: q.groupCode,
      groupName: q.groupName,
      meanScore: mean,
      csi,
      distribution
    };
  });

  // Calculate group scores
  const groupScores = SURVEY_CONFIG.groups.map(g => {
    const qInGroup = questionScores.filter(qs => qs.groupId === g.id);
    const avgScore = Number((qInGroup.reduce((acc, curr) => acc + curr.meanScore, 0) / (qInGroup.length || 1)).toFixed(2));
    const groupCsi = Number(((avgScore / 5) * 100).toFixed(1));
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      meanScore: avgScore,
      csi: groupCsi,
      questionCount: qInGroup.length
    };
  });

  // Total CSI across all Likert items
  const overallCsi = Number((groupScores.reduce((acc, curr) => acc + curr.csi, 0) / (groupScores.length || 1)).toFixed(1));

  // Overall 1-10 satisfaction score
  const totalOverallScore = list.reduce((acc, curr) => acc + (Number(curr.overall?.score) || 0), 0);
  const overallMean = Number((totalOverallScore / total).toFixed(2));

  // eNPS (Healthcare Employee Net Promoter Score)
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let validEnpsCount = 0;
  list.forEach(s => {
    const score = Number(s.overall?.enps);
    if (!isNaN(score) && score >= 0 && score <= 10) {
      validEnpsCount++;
      if (score >= 9) promoters++;
      else if (score >= 7) passives++;
      else detractors++;
    }
  });

  const baseCount = validEnpsCount || total || 1;
  const promoterPct = (promoters / baseCount) * 100;
  const detractorPct = (detractors / baseCount) * 100;
  const enpsScore = Math.round(promoterPct - detractorPct);

  // Commitment breakdown
  const commitmentCounts = {};
  list.forEach(s => {
    const com = s.overall?.commitment || 'unknown';
    commitmentCounts[com] = (commitmentCounts[com] || 0) + 1;
  });

  // Top 5 strengths & concerns
  const sortedByScore = [...questionScores].sort((a, b) => b.meanScore - a.meanScore);
  const topStrengths = sortedByScore.slice(0, 5);
  const topConcerns = [...sortedByScore].reverse().slice(0, 5);

  // Breakdown by Department
  const deptMap = {};
  list.forEach(s => {
    const d = s.demographics?.department || 'other';
    if (!deptMap[d]) deptMap[d] = { count: 0, totalScore: 0 };
    deptMap[d].count++;
    // Avg score across answers
    let subSum = 0;
    allQuestions.forEach(q => { subSum += Number(s.answers?.[q.id]) || 3; });
    deptMap[d].totalScore += (subSum / allQuestions.length);
  });
  const byDepartment = {};
  for (const [k, v] of Object.entries(deptMap)) {
    byDepartment[k] = {
      count: v.count,
      avgScore: Number((v.totalScore / v.count).toFixed(2)),
      csi: Number(((v.totalScore / v.count / 5) * 100).toFixed(1))
    };
  }

  // Breakdown by Role
  const roleMap = {};
  list.forEach(s => {
    const r = s.demographics?.role || 'other';
    if (!roleMap[r]) roleMap[r] = { count: 0, totalScore: 0 };
    roleMap[r].count++;
    let subSum = 0;
    allQuestions.forEach(q => { subSum += Number(s.answers?.[q.id]) || 3; });
    roleMap[r].totalScore += (subSum / allQuestions.length);
  });
  const byRole = {};
  for (const [k, v] of Object.entries(roleMap)) {
    byRole[k] = {
      count: v.count,
      avgScore: Number((v.totalScore / v.count).toFixed(2)),
      csi: Number(((v.totalScore / v.count / 5) * 100).toFixed(1))
    };
  }

  // Breakdown by Experience
  const expMap = {};
  list.forEach(s => {
    const e = s.demographics?.experience || 'other';
    if (!expMap[e]) expMap[e] = { count: 0, totalScore: 0 };
    expMap[e].count++;
    let subSum = 0;
    allQuestions.forEach(q => { subSum += Number(s.answers?.[q.id]) || 3; });
    expMap[e].totalScore += (subSum / allQuestions.length);
  });
  const byExperience = {};
  for (const [k, v] of Object.entries(expMap)) {
    byExperience[k] = {
      count: v.count,
      avgScore: Number((v.totalScore / v.count).toFixed(2)),
      csi: Number(((v.totalScore / v.count / 5) * 100).toFixed(1))
    };
  }

  // Filter suggestions
  const suggestions = list
    .filter(s => s.overall?.suggestions && s.overall.suggestions.length > 3)
    .map(s => ({
      id: s.id,
      department: s.demographics?.department,
      role: s.demographics?.role,
      experience: s.demographics?.experience,
      text: s.overall.suggestions,
      score: s.overall?.score,
      submittedAt: s.submittedAt
    }));

  return {
    totalCount: total,
    target: currentTarget,
    completionRate: Number(((total / currentTarget) * 100).toFixed(1)),
    csi: overallCsi,
    overallMean,
    enps: {
      score: enpsScore,
      promoters,
      passives,
      detractors,
      promoterPct: Number(promoterPct.toFixed(1)),
      detractorPct: Number(detractorPct.toFixed(1))
    },
    commitment: commitmentCounts,
    groupScores,
    questionScores,
    topStrengths,
    topConcerns,
    byDepartment,
    byRole,
    byExperience,
    suggestions
  };
}

// API: Get comprehensive statistics (Admin only - Hỗ trợ lọc theo khối & giai đoạn)
app.get('/api/stats', requireAdmin, (req, res) => {
  const filterDept = req.query.department || 'all';
  const startDate = req.query.startDate || null;
  const endDate = req.query.endDate || null;
  const period = req.query.period || 'all';

  // Hỗ trợ đồng bộ mục tiêu từ client header hoặc query
  const headerTarget = req.headers['x-target-respondents'];
  const queryTarget = req.query.target;
  const clientTarget = headerTarget || queryTarget;
  if (clientTarget) {
    settingsManager.syncClientTarget(clientTarget);
  }

  const surveys = db.getAllSurveys(filterDept, startDate, endDate);
  const stats = computeStatistics(surveys, filterDept);
  stats.filterInfo = {
    department: filterDept,
    startDate,
    endDate,
    period,
    totalAllTime: db.getSurveyCount()
  };
  res.json(stats);
});

// API: Get list of responses with pagination & search (Admin only - Hỗ trợ lọc theo khối & giai đoạn)
app.get('/api/responses', requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = (req.query.search || '').trim();
  const dept = req.query.department || 'all';
  const startDate = req.query.startDate || null;
  const endDate = req.query.endDate || null;

  const result = db.getPaginatedResponses({ page, limit, search, department: dept, startDate, endDate });
  res.json(result);
});

const DEPT_LABELS = {
  noi: 'Khối Lâm sàng Nội',
  ngoai: 'Khối Lâm sàng Ngoại',
  capcuu: 'Khối Khám bệnh & Cấp cứu',
  canlamsang: 'Khối Cận lâm sàng & Dược',
  hanhchinh: 'Khối Phòng ban chức năng',
  other: 'Khác'
};

const ROLE_LABELS = {
  bacsi: 'Bác sĩ / Bác sĩ CKI-CKII',
  dieuduong: 'Điều dưỡng / Hộ sinh',
  kythuatvien: 'Kỹ thuật viên y tế',
  duocsi: 'Dược sĩ',
  quanly_hanhchinh: 'Cán bộ QL / Hành chính',
  hotro: 'Hộ lý / Y công / Hỗ trợ',
  other: 'Khác'
};

const EXP_LABELS = {
  duoi2: 'Dưới 2 năm',
  tu2den5: 'Từ 2 đến 5 năm',
  tu5den10: 'Từ 5 đến 10 năm',
  tren10: 'Trên 10 năm',
  other: 'Khác'
};

const GENDER_LABELS = {
  nam: 'Nam',
  nu: 'Nữ',
  khac: 'Không nêu'
};

const DEGREE_LABELS = {
  trungcap_caodang: 'Trung cấp / Cao đẳng',
  daihoc: 'Đại học',
  saudaihoc: 'Sau đại học (ThS, CKI, CKII, TS)',
  other: 'Khác'
};

const COMMITMENT_LABELS = {
  chac_chan: 'Chắc chắn gắn bó lâu dài',
  co_the: 'Có thể gắn bó',
  phan_van: 'Đang phân vân',
  du_dinh_chuyen: 'Dự định chuyển nơi khác',
  unknown: 'Chưa xác định'
};

// API: Export Excel (Admin only - Hỗ trợ lọc theo khối & giai đoạn)
app.get('/api/export-excel', requireAdmin, (req, res) => {
  try {
    const deptFilter = req.query.department || 'all';
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    let surveys = db.getAllSurveys(deptFilter, startDate, endDate);
    const isFiltered = deptFilter && deptFilter !== 'all';
    const stats = computeStatistics(surveys, deptFilter);

    const wb = XLSX.utils.book_new();

    const scopeDept = isFiltered ? `Khối: ${DEPT_LABELS[deptFilter] || deptFilter}` : 'Toàn bệnh viện';
    let periodText = 'Giai đoạn: Toàn bộ thời gian';
    if (startDate && endDate) {
      periodText = `Giai đoạn: Từ ${startDate} đến ${endDate}`;
    } else if (startDate) {
      periodText = `Giai đoạn: Từ ngày ${startDate}`;
    } else if (endDate) {
      periodText = `Giai đoạn: Đến ngày ${endDate}`;
    }
    const scopeText = `Phạm vi báo cáo: ${scopeDept} | ${periodText}`;

    // 1. Sheet: Báo cáo Tổng hợp (Summary)
    const summaryData = [
      ['BÁO CÁO KẾT QUẢ KHẢO SÁT SỰ HÀI LÒNG NHÂN VIÊN Y TẾ'],
      ['Căn cứ theo Bộ tiêu chí chất lượng bệnh viện - Bộ Y tế Việt Nam (QĐ 6858/QĐ-BYT)'],
      [scopeText],
      ['Thời gian xuất báo cáo:', new Date().toLocaleString('vi-VN')],
      [''],
      ['CHỈ SỐ TỔNG QUAN', 'GIÁ TRỊ', 'MỤC TIÊU / ĐÁNH GIÁ'],
      ['Tổng số nhân viên tham gia khảo sát', stats.totalCount, `Mục tiêu: ${stats.target} NV (Đạt ${stats.completionRate}%)`],
      ['Chỉ số Hài lòng Chung (CSI %)', `${stats.csi}%`, stats.csi >= 85 ? 'Rất tốt (Xuất sắc)' : stats.csi >= 75 ? 'Khá / Tốt' : 'Cần cải thiện'],
      ['Điểm hài lòng chung bình quân (1-10)', stats.overallMean, 'Thang điểm 10'],
      ['Chỉ số cam kết & gắn kết (eNPS)', stats.enps.score, `Promoters: ${stats.enps.promoterPct || 0}%, Detractors: ${stats.enps.detractorPct || 0}%`],
      [''],
      ['ĐIỂM TRUNG BÌNH THEO 5 NHÓM TIÊU CHÍ BỘ Y TẾ', 'ĐIỂM (1-5)', 'TỶ LỆ HÀI LÒNG (CSI)'],
      ...stats.groupScores.map(g => [g.code + '. ' + g.name, g.meanScore, `${g.csi}%`]),
      [''],
      ['TOP 5 TIÊU CHÍ HÀI LÒNG CAO NHẤT (ĐIỂM SÁNG)', 'MÃ', 'ĐIỂM (1-5)', 'NHÓM'],
      ...stats.topStrengths.map(q => [q.text, q.id.toUpperCase(), q.meanScore, q.groupName]),
      [''],
      ['TOP 5 TIÊU CHÍ CẦN ƯU TIÊN CẢI THIỆN (ĐIỂM NGHẼN)', 'MÃ', 'ĐIỂM (1-5)', 'NHÓM'],
      ...stats.topConcerns.map(q => [q.text, q.id.toUpperCase(), q.meanScore, q.groupName])
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 55 }, { wch: 22 }, { wch: 45 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Báo cáo Tổng hợp');

    // 2. Sheet: Chi tiết 23 tiêu chí
    const criteriaHeaders = ['Mã', 'Nhóm', 'Nội dung tiêu chí', 'Điểm trung bình (1-5)', 'Tỷ lệ CSI (%)', 'Rất KHL (1)', 'KHL (2)', 'Bình thường (3)', 'Hài lòng (4)', 'Rất HL (5)'];
    const criteriaRows = stats.questionScores.map(q => [
      q.id.toUpperCase(),
      q.groupCode + '. ' + q.groupName,
      q.text,
      q.meanScore,
      `${q.csi}%`,
      q.distribution[1] || 0,
      q.distribution[2] || 0,
      q.distribution[3] || 0,
      q.distribution[4] || 0,
      q.distribution[5] || 0
    ]);
    const wsCriteria = XLSX.utils.aoa_to_sheet([criteriaHeaders, ...criteriaRows]);
    wsCriteria['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 75 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsCriteria, 'Chi tiết 23 Tiêu chí');

    // 3. Sheet: Toàn bộ phản hồi (Raw Data)
    const rawHeaders = [
      'Mã phiếu', 'Thời gian nộp', 'Khối công tác', 'Chức danh', 'Thâm niên', 'Giới tính', 'Học vấn',
      'A1', 'A2', 'A3', 'A4', 'A5',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'C1', 'C2', 'C3', 'C4', 'C5',
      'D1', 'D2', 'D3', 'D4',
      'E1', 'E2', 'E3', 'E4',
      'Điểm chung (1-10)', 'Ý định gắn bó', 'Điểm eNPS (0-10)', 'Ý kiến đóng góp'
    ];

    const rawRows = surveys.map(s => [
      s.id,
      new Date(s.submittedAt).toLocaleString('vi-VN'),
      DEPT_LABELS[s.demographics?.department] || s.demographics?.department || '',
      ROLE_LABELS[s.demographics?.role] || s.demographics?.role || '',
      EXP_LABELS[s.demographics?.experience] || s.demographics?.experience || '',
      GENDER_LABELS[s.demographics?.gender] || s.demographics?.gender || '',
      DEGREE_LABELS[s.demographics?.degree] || s.demographics?.degree || '',
      s.answers?.a1 || '', s.answers?.a2 || '', s.answers?.a3 || '', s.answers?.a4 || '', s.answers?.a5 || '',
      s.answers?.b1 || '', s.answers?.b2 || '', s.answers?.b3 || '', s.answers?.b4 || '', s.answers?.b5 || '',
      s.answers?.c1 || '', s.answers?.c2 || '', s.answers?.c3 || '', s.answers?.c4 || '', s.answers?.c5 || '',
      s.answers?.d1 || '', s.answers?.d2 || '', s.answers?.d3 || '', s.answers?.d4 || '',
      s.answers?.e1 || '', s.answers?.e2 || '', s.answers?.e3 || '', s.answers?.e4 || '',
      s.overall?.score || '',
      COMMITMENT_LABELS[s.overall?.commitment] || s.overall?.commitment || '',
      s.overall?.enps ?? '',
      s.overall?.suggestions || ''
    ]);
    const wsRaw = XLSX.utils.aoa_to_sheet([rawHeaders, ...rawRows]);
    wsRaw['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 28 },
      ...Array(23).fill({ wch: 6 }),
      { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 65 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRaw, `Dữ liệu (${surveys.length} Khảo sát)`);

    // 4. Sheet: Ý kiến đóng góp
    const sugHeaders = ['Mã phiếu', 'Khối công tác', 'Chức danh', 'Thâm niên', 'Điểm chung (1-10)', 'Ý kiến đóng góp / Nguyện vọng'];
    const sugRows = stats.suggestions.map(s => [
      s.id, 
      DEPT_LABELS[s.department] || s.department, 
      ROLE_LABELS[s.role] || s.role, 
      EXP_LABELS[s.experience] || s.experience, 
      s.score, 
      s.text
    ]);
    const wsSug = XLSX.utils.aoa_to_sheet([sugHeaders, ...sugRows]);
    wsSug['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsSug, 'Ý kiến Hiến kế');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileSuffix = isFiltered ? `_${deptFilter}` : '';
    const dateSuffix = startDate && endDate ? `_${startDate}_den_${endDate}` : `_${new Date().toISOString().slice(0, 10)}`;
    const filename = `Bao_Cao_Khao_Sat_Hai_Long_NVYT${fileSuffix}${dateSuffix}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).send('Lỗi khi xuất file Excel.');
  }
});

// API: Clear data (Admin only)
app.post('/api/clear-data', requireAdmin, (req, res) => {
  try {
    db.clearAllSurveys();
    res.json({ success: true, message: 'Đã làm mới dữ liệu khảo sát trong SQLite thành công!' });
  } catch (err) {
    console.error('Error clearing data:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa dữ liệu.', error: err.message });
  }
});

// ==========================================
// GOOGLE SHEETS CLOUD SYNC APIs (Admin only)
// ==========================================

// Lấy thông tin cấu hình Google Sheet hiện tại
app.get('/api/admin/google-sheet-config', requireAdmin, (req, res) => {
  const webhookUrl = googleSheetSync.getWebhookUrl();
  res.json({
    success: true,
    configured: Boolean(webhookUrl),
    webhookUrl: webhookUrl || '',
    totalSurveys: db.getSurveyCount()
  });
});

// Lưu cấu hình Google Sheet Webhook URL
app.post('/api/admin/google-sheet-config', requireAdmin, (req, res) => {
  const { webhookUrl } = req.body || {};
  googleSheetSync.setWebhookUrl(webhookUrl || '');
  res.json({
    success: true,
    configured: Boolean(webhookUrl && webhookUrl.trim()),
    message: 'Đã lưu cấu hình Google Sheet Webhook thành công!'
  });
});

// Kiểm tra kết nối tới Google Sheet (Test Ping)
app.post('/api/admin/test-google-sheet', requireAdmin, async (req, res) => {
  try {
    const { webhookUrl } = req.body || {};
    const result = await googleSheetSync.testWebhook(webhookUrl);
    res.json({ success: true, data: result, message: 'Kết nối thành công tới Google Sheet!' });
  } catch (err) {
    console.error('Google Sheet Test Error:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể kết nối đến Google Sheet Webhook.' });
  }
});

// Đồng bộ toàn bộ dữ liệu khảo sát sang Google Sheet ngay lập tức
app.post('/api/admin/sync-google-sheet', requireAdmin, async (req, res) => {
  try {
    const allSurveys = db.getAllSurveys();
    const result = await googleSheetSync.syncAllSurveys(allSurveys);
    res.json({
      success: true,
      count: allSurveys.length,
      data: result,
      message: `Đã đồng bộ ${allSurveys.length} phiếu sang Google Sheet thành công!`
    });
  } catch (err) {
    console.error('Google Sheet Sync All Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi đồng bộ sang Google Sheet.' });
  }
});

// API: Cập nhật mục tiêu quy mô nhân viên y tế (Admin only)
app.post('/api/admin/target-config', requireAdmin, (req, res) => {
  try {
    const { target } = req.body || {};
    const updatedTarget = settingsManager.setTargetRespondents(target);
    res.json({
      success: true,
      target: updatedTarget,
      message: `Đã cập nhật mục tiêu quy mô thành công: ${updatedTarget} nhân viên y tế!`
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Tải nội dung Google Apps Script mẫu để sao chép
app.get('/api/admin/google-sheet-script', requireAdmin, (req, res) => {
  const scriptPath = path.join(__dirname, 'GOOGLE_SHEET_APPS_SCRIPT.js');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(scriptPath);
  }
  res.status(404).send('File script không tồn tại.');
});

// API: Đổi mật khẩu Quản trị viên (Admin only)
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
    }
    if (!settingsManager.verifyAdminPassword(currentPassword)) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác!' });
    }
    settingsManager.setAdminPassword(newPassword);
    res.json({ success: true, message: 'Đổi mật khẩu Quản trị viên thành công!' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// API: Khôi phục mật khẩu Quản trị viên về mặc định (admin123)
app.post('/api/admin/reset-password', (req, res) => {
  try {
    const { resetKey } = req.body || {};
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    
    // Yêu cầu gọi từ máy tính cục bộ (localhost) hoặc có Master Key dự phòng
    if (!isLocal && resetKey !== 'BV_RESET_2026') {
      return res.status(403).json({ success: false, message: 'Yêu cầu không được phép. Vui lòng thực hiện trên máy chủ hoặc liên hệ IT.' });
    }
    
    const defPass = settingsManager.resetAdminPassword();
    res.json({
      success: true,
      defaultPassword: defPass,
      message: `Đã khôi phục mật khẩu Quản trị viên về mặc định thành công: ${defPass}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});




if (!isServerless) {
  const server = app.listen(PORT, () => {
    const localIps = getLocalIpAddresses();
    console.log(`=======================================================`);
    console.log(`🏥 HỆ THỐNG KHẢO SÁT HÀI LÒNG NHÂN VIÊN Y TẾ (500 NV)`);
    console.log(`💾 CƠ SỞ DỮ LIỆU: SQLite Enterprise ACID (WAL Mode, Non-blocking)`);
    console.log(`📁 File lưu trữ: data/surveys.db (Kèm auto-sync backup JSON)`);
    console.log(`🚀 Cổng dịch vụ: http://localhost:${PORT}`);
    console.log(`📊 Dashboard Quản trị: http://localhost:${PORT}/admin.html`);
    if (localIps.length > 0) {
      console.log(`📱 Mạng nội bộ / Điện thoại: http://${localIps[0]}:${PORT}`);
      console.log(`📱 QR Code link: http://${localIps[0]}:${PORT}`);
    }
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️ Cảnh báo xung đột cổng: Cổng ${PORT} đang được tiến trình khác sử dụng.`);
      console.error(`Gợi ý: Kiểm tra hoặc cấu hình PORT qua biến môi trường (ví dụ: PORT=3001 node server.js).`);
    } else {
      console.error('Lỗi khởi động máy chủ:', err);
    }
  });
}

module.exports = app;
