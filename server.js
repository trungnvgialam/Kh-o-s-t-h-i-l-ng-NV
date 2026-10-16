const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');

const SURVEY_CONFIG = require('./questions');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'surveys.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure database file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
}

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

// IN-MEMORY DATA STORE & SAFE CONCURRENCY ENGINE
let cachedSurveys = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    cachedSurveys = JSON.parse(raw);
  }
} catch (err) {
  console.error('Lỗi khi đọc file dữ liệu khảo sát ban đầu:', err);
  cachedSurveys = [];
}

// Compute atomic monotonic ID counter to prevent duplicate IDs forever
let maxIdCounter = 0;
cachedSurveys.forEach(s => {
  const match = String(s.id).match(/^NV-(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > maxIdCounter) maxIdCounter = num;
  }
});

// Serialized async queue to guarantee non-blocking, conflict-free disk persistence
let writePromise = Promise.resolve();

function scheduleDiskWrite() {
  writePromise = writePromise.then(async () => {
    await persistSurveysToDisk();
  }).catch(err => {
    console.error('Lỗi hàng đợi ghi đĩa:', err);
  });
  return writePromise;
}

async function persistSurveysToDisk() {
  const jsonStr = JSON.stringify(cachedSurveys, null, 2);
  const tempFile = path.join(DATA_DIR, `surveys_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
  const backupFile = path.join(DATA_DIR, 'surveys.backup.json');

  try {
    // 1. Write unique temporary file
    await fs.promises.writeFile(tempFile, jsonStr, 'utf8');

    // 2. Backup existing file if non-empty
    if (fs.existsSync(DATA_FILE) && fs.statSync(DATA_FILE).size > 10) {
      try {
        await fs.promises.copyFile(DATA_FILE, backupFile);
      } catch (_) {}
    }

    // 3. Atomically replace with retry for Windows EBUSY / locking
    let renamed = false;
    for (let i = 0; i < 5; i++) {
      try {
        await fs.promises.rename(tempFile, DATA_FILE);
        renamed = true;
        break;
      } catch (err) {
        await new Promise(res => setTimeout(res, 50));
      }
    }

    // Fallback direct write if Windows rename is held
    if (!renamed) {
      await fs.promises.writeFile(DATA_FILE, jsonStr, 'utf8');
      try { await fs.promises.unlink(tempFile); } catch (_) {}
    }
  } catch (err) {
    console.error('Lỗi khi ghi đĩa dữ liệu khảo sát:', err);
    try { if (fs.existsSync(tempFile)) await fs.promises.unlink(tempFile); } catch (_) {}
  }
}

// Read all surveys safely from memory (O(1), zero disk lock)
function readSurveys() {
  return cachedSurveys;
}

// Write/update surveys in memory & schedule disk write
function writeSurveys(data) {
  cachedSurveys = data;
  maxIdCounter = 0;
  cachedSurveys.forEach(s => {
    const match = String(s.id).match(/^NV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdCounter) maxIdCounter = num;
    }
  });
  scheduleDiskWrite();
}

// API: Get survey config & system status
app.get('/api/config', (req, res) => {
  const localIps = getLocalIpAddresses();
  const primaryIp = localIps.length > 0 ? localIps[0] : 'localhost';
  
  res.json({
    config: SURVEY_CONFIG,
    totalCount: cachedSurveys.length,
    target: SURVEY_CONFIG.targetRespondents,
    localIps,
    networkUrl: `http://${primaryIp}:${PORT}`,
    localUrl: `http://localhost:${PORT}`
  });
});

// API: Submit a response (Thread-safe, Concurrency-proof, Validated & Sanitized)
app.post('/api/submit', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.demographics || !body.answers) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.' });
    }

    // Atomic monotonic ID generation
    maxIdCounter++;
    const newId = `NV-${String(maxIdCounter).padStart(4, '0')}`;

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
    // Strip HTML/script tags to prevent XSS
    const cleanSuggestions = rawSuggestions.replace(/<[^>]*>?/gm, '').slice(0, 2000);

    const submission = {
      id: newId,
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

    // Atomic in-memory push
    cachedSurveys.push(submission);
    
    // Asynchronous non-blocking queue persist
    scheduleDiskWrite();

    res.json({
      success: true,
      id: newId,
      message: 'Gửi phiếu khảo sát thành công. Chân thành cảm ơn sự đóng góp quý báu của bạn!'
    });
  } catch (err) {
    console.error('Error submitting survey:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lưu phản hồi.' });
  }
});

// Calculate detailed statistics
function computeStatistics(surveys, filterDept = 'all') {
  let list = surveys;
  if (filterDept && filterDept !== 'all') {
    list = surveys.filter(s => s.demographics?.department === filterDept);
  }

  const total = list.length;
  if (total === 0) {
    return {
      totalCount: 0,
      target: SURVEY_CONFIG.targetRespondents,
      completionRate: 0,
      csi: 0,
      overallMean: 0,
      enps: { score: 0, promoters: 0, passives: 0, detractors: 0 },
      commitment: {},
      groupScores: [],
      questionScores: [],
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
    target: SURVEY_CONFIG.targetRespondents,
    completionRate: Number(((total / SURVEY_CONFIG.targetRespondents) * 100).toFixed(1)),
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

// API: Get comprehensive statistics
app.get('/api/stats', (req, res) => {
  const filterDept = req.query.department || 'all';
  const surveys = readSurveys();
  const stats = computeStatistics(surveys, filterDept);
  res.json(stats);
});

// API: Get list of responses with pagination & search
app.get('/api/responses', (req, res) => {
  const surveys = readSurveys();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = (req.query.search || '').toLowerCase();
  const dept = req.query.department;

  let filtered = surveys;
  if (dept && dept !== 'all') {
    filtered = filtered.filter(s => s.demographics?.department === dept);
  }
  if (search) {
    filtered = filtered.filter(s => 
      s.id.toLowerCase().includes(search) || 
      (s.overall?.suggestions && s.overall.suggestions.toLowerCase().includes(search))
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const items = filtered.slice().reverse().slice(start, start + limit);

  res.json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    items
  });
});

// API: Export Excel
app.get('/api/export-excel', (req, res) => {
  try {
    const surveys = readSurveys();
    const stats = computeStatistics(surveys);

    const wb = XLSX.utils.book_new();

    // 1. Sheet: Báo cáo Tổng hợp (Summary)
    const summaryData = [
      ['BÁO CÁO KẾT QUẢ KHẢO SÁT SỰ HÀI LÒNG NHÂN VIÊN Y TẾ'],
      ['Căn cứ theo Bộ tiêu chí chất lượng bệnh viện - Bộ Y tế Việt Nam'],
      ['Thời gian xuất báo cáo:', new Date().toLocaleString('vi-VN')],
      [''],
      ['CHỈ SỐ TỔNG QUAN', 'GIÁ TRỊ', 'MỤC TIÊU / ĐÁNH GIÁ'],
      ['Tổng số nhân viên tham gia khảo sát', stats.totalCount, `Mục tiêu: ${stats.target} NV (Đạt ${stats.completionRate}%)`],
      ['Chỉ số Hài lòng Chung (CSI %)', `${stats.csi}%`, stats.csi >= 85 ? 'Rất tốt (Xuất sắc)' : stats.csi >= 75 ? 'Khá' : 'Cần cải thiện'],
      ['Điểm hài lòng chung bình quân (1-10)', stats.overallMean, 'Thang điểm 10'],
      ['Chỉ số cam kết & gắn kết (eNPS)', stats.enps.score, `Promoters: ${stats.enps.promoterPct}%, Detractors: ${stats.enps.detractorPct}%`],
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
      s.demographics?.department || '',
      s.demographics?.role || '',
      s.demographics?.experience || '',
      s.demographics?.gender || '',
      s.demographics?.degree || '',
      s.answers?.a1 || '', s.answers?.a2 || '', s.answers?.a3 || '', s.answers?.a4 || '', s.answers?.a5 || '',
      s.answers?.b1 || '', s.answers?.b2 || '', s.answers?.b3 || '', s.answers?.b4 || '', s.answers?.b5 || '',
      s.answers?.c1 || '', s.answers?.c2 || '', s.answers?.c3 || '', s.answers?.c4 || '', s.answers?.c5 || '',
      s.answers?.d1 || '', s.answers?.d2 || '', s.answers?.d3 || '', s.answers?.d4 || '',
      s.answers?.e1 || '', s.answers?.e2 || '', s.answers?.e3 || '', s.answers?.e4 || '',
      s.overall?.score || '',
      s.overall?.commitment || '',
      s.overall?.enps || '',
      s.overall?.suggestions || ''
    ]);
    const wsRaw = XLSX.utils.aoa_to_sheet([rawHeaders, ...rawRows]);
    wsRaw['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 20 },
      ...Array(23).fill({ wch: 6 }),
      { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 65 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRaw, 'Dữ liệu 500 Khảo sát');

    // 4. Sheet: Ý kiến đóng góp
    const sugHeaders = ['Mã phiếu', 'Khối công tác', 'Chức danh', 'Thâm niên', 'Điểm chung', 'Ý kiến đóng góp / Nguyện vọng'];
    const sugRows = stats.suggestions.map(s => [
      s.id, s.department, s.role, s.experience, s.score, s.text
    ]);
    const wsSug = XLSX.utils.aoa_to_sheet([sugHeaders, ...sugRows]);
    wsSug['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsSug, 'Ý kiến Hiến kế');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Bao_Cao_Khao_Sat_Hai_Long_NVYT_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).send('Lỗi khi xuất file Excel.');
  }
});

// API: Generate realistic 500 mock surveys
app.post('/api/mock-data', (req, res) => {
  try {
    const targetCount = parseInt(req.body.count) || 500;
    const depts = [
      { id: 'noi', weight: 0.28 },
      { id: 'ngoai', weight: 0.26 },
      { id: 'capcuu', weight: 0.18 },
      { id: 'canlamsang', weight: 0.16 },
      { id: 'hanhchinh', weight: 0.12 }
    ];
    const roles = [
      { id: 'dieuduong', weight: 0.40 },
      { id: 'bacsi', weight: 0.28 },
      { id: 'kythuatvien', weight: 0.12 },
      { id: 'duocsi', weight: 0.08 },
      { id: 'quanly_hanhchinh', weight: 0.08 },
      { id: 'hotro', weight: 0.04 }
    ];
    const experiences = [
      { id: 'duoi2', weight: 0.20 },
      { id: 'tu2den5', weight: 0.35 },
      { id: 'tu5den10', weight: 0.28 },
      { id: 'tren10', weight: 0.17 }
    ];
    const genders = [
      { id: 'nu', weight: 0.65 },
      { id: 'nam', weight: 0.32 },
      { id: 'khac', weight: 0.03 }
    ];
    const degrees = [
      { id: 'daihoc', weight: 0.55 },
      { id: 'saudaihoc', weight: 0.25 },
      { id: 'trungcap_caodang', weight: 0.20 }
    ];

    function pickWeighted(arr) {
      const r = Math.random();
      let acc = 0;
      for (const item of arr) {
        acc += item.weight;
        if (r <= acc) return item.id;
      }
      return arr[arr.length - 1].id;
    }

    // Likert generation function with realistic bias:
    // Relationships (Group D) usually highest (avg ~4.2 - 4.4)
    // Leadership (Group B) avg ~3.8 - 4.1
    // Environment (Group A) avg ~3.7 - 4.0
    // Training (Group E) avg ~3.6 - 3.9
    // Salary/Compensation (Group C) usually lowest (avg ~3.1 - 3.4)
    function generateLikert(baseMean) {
      // Return 1..5 integer around baseMean
      const rand = (Math.random() + Math.random() + Math.random()) / 3; // bell-like distribution [0..1]
      const val = Math.round(baseMean + (rand - 0.5) * 2.2);
      return Math.max(1, Math.min(5, val));
    }

    const sampleSuggestions = [
      'Mong Ban Giám đốc xem xét tăng phụ cấp trực đêm và tiền trực ca cho khối Cấp cứu - Hồi sức tích cực.',
      'Đề nghị khoa Dược và phòng Vật tư cung ứng kịp thời hơn các trang thiết bị tiêu hao để tránh gián đoạn khám chữa bệnh.',
      'Phần mềm HIS đôi lúc còn bị giật lag vào đầu giờ sáng khi bệnh nhân đông, mong bộ phận CNTT nâng cấp máy chủ.',
      'Khu vực phòng trực và nhà ăn cho nhân viên cần được vệ sinh sạch sẽ hơn, nên có thêm bình nước nóng lạnh.',
      'Rất tự hào về tinh thần đoàn kết, tương trợ nhiệt tình của các anh chị điều dưỡng và bác sĩ trong khoa.',
      'Mong bệnh viện mở thêm các khóa đào tạo nâng cao về kỹ năng giao tiếp và ứng xử với người nhà bệnh nhân.',
      'Chế độ khen thưởng đột xuất cho các ca cấp cứu thành công nên được triển khai kịp thời để khích lệ anh em.',
      'Cần trang bị thêm găng tay y tế chất lượng cao và khẩu trang chuẩn N95 ở các khu vực có nguy cơ lây nhiễm cao.',
      'Lãnh đạo khoa rất nhiệt tình, lắng nghe và bảo vệ quyền lợi chính đáng của nhân viên.',
      'Đề xuất bố trí luân phiên ca kíp khoa học hơn để nhân viên có đủ thời gian tái tạo sức lao động và chăm lo gia đình.'
    ];

    const generated = [];
    const now = Date.now();

    for (let i = 1; i <= targetCount; i++) {
      const id = `NV-${String(i).padStart(4, '0')}`;
      const submittedAt = new Date(now - Math.floor(Math.random() * 14 * 86400000)).toISOString();

      const answers = {
        // Group A: Environment (~3.85)
        a1: generateLikert(3.8),
        a2: generateLikert(3.7),
        a3: generateLikert(4.1),
        a4: generateLikert(3.5),
        a5: generateLikert(3.9),

        // Group B: Leadership (~3.95)
        b1: generateLikert(4.1),
        b2: generateLikert(3.9),
        b3: generateLikert(3.8),
        b4: generateLikert(4.0),
        b5: generateLikert(3.9),

        // Group C: Compensation (~3.35)
        c1: generateLikert(3.2),
        c2: generateLikert(3.4),
        c3: generateLikert(3.6),
        c4: generateLikert(3.3),
        c5: generateLikert(3.2),

        // Group D: Relationships (~4.35)
        d1: generateLikert(4.5),
        d2: generateLikert(4.2),
        d3: generateLikert(4.4),
        d4: generateLikert(4.3),

        // Group E: Development (~3.80)
        e1: generateLikert(3.9),
        e2: generateLikert(3.8),
        e3: generateLikert(3.6),
        e4: generateLikert(3.7)
      };

      // Calculate realistic overall score (7 to 9 average)
      const avgAns = Object.values(answers).reduce((a, b) => a + b, 0) / 23;
      const overallScore = Math.min(10, Math.max(2, Math.round(avgAns * 2 + (Math.random() * 1.5 - 0.75))));

      let commitment = 'chac_chan';
      if (avgAns < 3.2) commitment = 'du_dinh_chuyen';
      else if (avgAns < 3.6) commitment = 'phan_van';
      else if (avgAns < 4.1) commitment = 'co_the';

      const enps = Math.min(10, Math.max(0, Math.round(avgAns * 2 + (Math.random() * 1.8 - 0.9))));

      const hasSuggestion = Math.random() < 0.35;
      const suggestions = hasSuggestion ? sampleSuggestions[Math.floor(Math.random() * sampleSuggestions.length)] : '';

      generated.push({
        id,
        submittedAt,
        demographics: {
          department: pickWeighted(depts),
          role: pickWeighted(roles),
          experience: pickWeighted(experiences),
          gender: pickWeighted(genders),
          degree: pickWeighted(degrees)
        },
        answers,
        overall: {
          score: overallScore,
          commitment,
          enps,
          suggestions
        }
      });
    }

    writeSurveys(generated);

    res.json({
      success: true,
      count: generated.length,
      message: `Đã khởi tạo thành công ${generated.length} dữ liệu khảo sát mô phỏng chân thực theo cơ cấu bệnh viện!`
    });
  } catch (err) {
    console.error('Error generating mock data:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo dữ liệu mẫu.' });
  }
});

// API: Clear data
app.post('/api/clear-data', (req, res) => {
  try {
    writeSurveys([]);
    res.json({ success: true, message: 'Đã làm mới dữ liệu khảo sát thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa dữ liệu.' });
  }
});

const server = app.listen(PORT, () => {
  const localIps = getLocalIpAddresses();
  console.log(`=======================================================`);
  console.log(`🏥 HỆ THỐNG KHẢO SÁT HÀI LÒNG NHÂN VIÊN Y TẾ (500 NV)`);
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
