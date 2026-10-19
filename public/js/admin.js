/**
 * ADMIN DASHBOARD ANALYTICS & INTERACTION CONTROLLER (ADMIN.JS)
 */

let radarChartInstance = null;
let barCriteriaChartInstance = null;
let roleDoughnutInstance = null;
let commitmentDoughnutInstance = null;
let qrCodeInstance = null;
let systemConfig = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAdminToken() {
  const fromStorage = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  if (match) {
    const val = decodeURIComponent(match[1]);
    try { sessionStorage.setItem('admin_token', val); } catch (_) {}
    return val;
  }
  return '';
}

function getAuthHeaders() {
  return {
    'Authorization': 'Bearer ' + getAdminToken(),
    'Content-Type': 'application/json'
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // 0. Khôi phục ngay lập tức số lượng nhân viên mục tiêu từ localStorage khi F5
  const savedTarget = localStorage.getItem('admin_target_respondents');
  if (savedTarget && parseInt(savedTarget, 10) > 0) {
    applyTargetToDom(parseInt(savedTarget, 10));
  }

  const token = getAdminToken();
  if (!token) {
    window.location.replace('login.html');
    return;
  }

  try {
    const authCheck = await fetch('/api/admin/check-auth', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    // Chỉ chuyển hướng nếu thực sự bị 401 Unauthorized từ máy chủ
    if (authCheck.status === 401) {
      sessionStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token');
      document.cookie = 'admin_token=; Path=/; Max-Age=0;';
      window.location.replace('login.html');
      return;
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra phiên xác thực (bỏ qua nếu mất kết nối mạng tạm thời):', err);
  }

  // Bind token and filter to Excel export link
  updateExportExcelLink();

  initDashboard();
  setupEventListeners();
});

function getActiveDateRange() {
  const period = document.getElementById('filter-period')?.value || 'all';
  const now = new Date();
  
  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  let startDate = null;
  let endDate = null;
  let labelText = 'Toàn bộ thời gian';

  if (period === '7days') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    startDate = formatDate(start);
    endDate = formatDate(now);
    labelText = `7 ngày qua (${startDate} đến ${endDate})`;
  } else if (period === '30days') {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    startDate = formatDate(start);
    endDate = formatDate(now);
    labelText = `30 ngày qua (${startDate} đến ${endDate})`;
  } else if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = formatDate(start);
    endDate = formatDate(now);
    labelText = `Tháng ${now.getMonth() + 1}/${now.getFullYear()} (${startDate} đến ${endDate})`;
  } else if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    startDate = formatDate(start);
    endDate = formatDate(end);
    labelText = `Tháng ${start.getMonth() + 1}/${start.getFullYear()} (${startDate} đến ${endDate})`;
  } else if (period === 'this_quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
    startDate = formatDate(start);
    endDate = formatDate(now);
    labelText = `Quý ${currentQuarter + 1}/${now.getFullYear()} (${startDate} đến ${endDate})`;
  } else if (period === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    startDate = formatDate(start);
    endDate = formatDate(now);
    labelText = `Năm ${now.getFullYear()} (${startDate} đến ${endDate})`;
  } else if (period === 'custom') {
    const customStart = document.getElementById('filter-start-date')?.value || '';
    const customEnd = document.getElementById('filter-end-date')?.value || '';
    startDate = customStart || null;
    endDate = customEnd || null;
    if (startDate && endDate) {
      labelText = `Từ ${startDate} đến ${endDate}`;
    } else if (startDate) {
      labelText = `Từ ngày ${startDate}`;
    } else if (endDate) {
      labelText = `Đến ngày ${endDate}`;
    } else {
      labelText = 'Khoảng ngày tùy chọn (Chưa chọn ngày)';
    }
  }

  return { period, startDate, endDate, labelText };
}

function updateExportExcelLink() {
  const exportBtn = document.getElementById('btn-export-excel');
  if (exportBtn) {
    const token = getAdminToken();
    const dept = document.getElementById('filter-department')?.value || 'all';
    const { startDate, endDate, period } = getActiveDateRange();
    let url = `/api/export-excel?department=${encodeURIComponent(dept)}&token=${encodeURIComponent(token)}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    if (period) url += `&period=${encodeURIComponent(period)}`;
    exportBtn.href = url;
  }
}

/**
 * Cập nhật số lượng nhân viên y tế mục tiêu lên toàn bộ giao diện một cách đồng bộ
 */
function applyTargetToDom(targetVal, currentCount, pct) {
  const targetTotal = parseInt(targetVal, 10);
  if (isNaN(targetTotal) || targetTotal <= 0) return;

  // 1. Nhãn quy mô trên navbar
  const brandTarget = document.getElementById('brand-target-label');
  if (brandTarget) brandTarget.innerText = targetTotal;

  // 2. Tiêu đề thanh tiến độ
  const targetTitle = document.getElementById('target-title-text');
  if (targetTitle) targetTitle.innerText = `Tiến Độ Thu Thập Phiếu Khảo Sát (Mục tiêu: ${targetTotal} NV)`;

  // 3. Đơn vị trong KPI Card
  const kpiTargetUnit = document.getElementById('kpi-target-unit');
  if (kpiTargetUnit) kpiTargetUnit.innerText = `/ ${targetTotal} NV`;

  // 4. Ô nhập trong Modal (nếu người dùng không đang tự gõ)
  const targetInput = document.getElementById('target-input');
  if (targetInput && document.activeElement !== targetInput) {
    targetInput.value = targetTotal;
  }

  // 5. Cập nhật nhãn số phiếu nộp nếu có
  const countLabel = document.getElementById('target-count-label');
  if (countLabel) {
    if (currentCount !== null && currentCount !== undefined) {
      countLabel.innerText = `${currentCount} / ${targetTotal} Phiếu`;
    } else {
      const match = countLabel.innerText.match(/^(\d+)/);
      const curr = match ? match[1] : '0';
      countLabel.innerText = `${curr} / ${targetTotal} Phiếu`;
    }
  }

  // 6. Cập nhật thanh tiến độ %
  if (pct !== null && pct !== undefined) {
    const fill = document.getElementById('target-fill');
    const pctLabel = document.getElementById('target-pct-label');
    if (fill) fill.style.width = `${pct}%`;
    if (pctLabel) pctLabel.innerText = `${pct}% Mục tiêu`;
  }
}

/**
 * Tự động đồng bộ số mục tiêu lên máy chủ nếu phát hiện máy chủ vừa bị reset/cold-start
 */
async function syncTargetToServer(targetVal) {
  try {
    const token = getAdminToken();
    if (!token) return;
    await fetch('/api/admin/target-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ target: targetVal })
    });
  } catch (_) {}
}

async function initDashboard() {
  await loadSystemConfig();
  await loadDashboardStats();
  await loadResponsesTable(1);
}

let currentQrMode = 'local'; // Mặc định là 'local' (IP mạng Wi-Fi thực tế của máy tính)

// 1. Load System Config & QR Code
async function loadSystemConfig() {
  try {
    const cachedTarget = localStorage.getItem('admin_target_respondents') || '';
    const configUrl = '/api/config' + (cachedTarget ? `?target=${encodeURIComponent(cachedTarget)}` : '');
    const res = await fetch(configUrl, {
      headers: {
        'X-Target-Respondents': cachedTarget
      }
    });
    systemConfig = await res.json();

    if (systemConfig && systemConfig.target) {
      if (!localStorage.getItem('admin_target_respondents')) {
        localStorage.setItem('admin_target_respondents', systemConfig.target);
      }
    }

    updateQrDisplay();
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

// Hàm cập nhật chế độ hiển thị mã QR
function updateQrDisplay() {
  if (!systemConfig) return;
  const hasTunnel = Boolean(systemConfig.tunnelUrl);
  const isTunnel = currentQrMode === 'tunnel' && hasTunnel;
  const activeUrl = isTunnel 
    ? systemConfig.tunnelUrl 
    : (systemConfig.networkUrl || systemConfig.localUrl || window.location.origin);

  const qrInput = document.getElementById('qr-survey-url-input');
  if (qrInput) qrInput.value = activeUrl;

  const btnTunnel = document.getElementById('btn-mode-tunnel');
  const btnLocal = document.getElementById('btn-mode-local');
  const noteBox = document.getElementById('qr-connection-note');
  const label = document.getElementById('qr-url-label');

  if (btnTunnel) {
    btnTunnel.style.display = hasTunnel ? 'inline-block' : 'none';
  }

  if (noteBox) noteBox.style.display = 'none';
  const urlBox = document.getElementById('qr-url-box');
  if (urlBox) urlBox.style.display = 'none';

  if (systemConfig.isServerless) {
    if (btnTunnel) btnTunnel.style.display = 'none';
    if (btnLocal) btnLocal.style.display = 'none';
  } else if (isTunnel) {
    if (btnTunnel) { btnTunnel.className = 'btn-action-primary'; }
    if (btnLocal) { btnLocal.className = 'btn-outline'; }
  } else {
    if (btnTunnel) { btnTunnel.className = 'btn-outline'; }
    if (btnLocal) { btnLocal.className = 'btn-action-primary'; }
  }


  renderQrCode(activeUrl);
}


// Hàm kết xuất mã QR chuẩn độ tương phản cao cho camera điện thoại & Zalo
function renderQrCode(url) {
  const qrContainer = document.getElementById('qrcode-container');
  if (qrContainer && window.QRCode) {
    qrContainer.innerHTML = '';
    qrCodeInstance = new QRCode(qrContainer, {
      text: url,
      width: 230,
      height: 230,
      colorDark: '#000000',               // Đen tuyền 100%: Bắt nét camera cực nhanh
      colorLight: '#ffffff',              // Nền trắng tinh khiết
      correctLevel: QRCode.CorrectLevel.M // Mức sửa lỗi M tối ưu quét màn hình & in ấn
    });
  }
}

// 2. Load Analytics & Statistics
async function loadDashboardStats() {
  const deptFilter = document.getElementById('filter-department')?.value || 'all';
  const { period, startDate, endDate, labelText } = getActiveDateRange();

  // Cập nhật nhãn thông tin giai đoạn đang xem
  const periodLabelEl = document.getElementById('period-text-label');
  if (periodLabelEl) {
    periodLabelEl.innerText = labelText;
  }

  // Đồng bộ đường dẫn xuất Excel
  updateExportExcelLink();

  const cachedTarget = localStorage.getItem('admin_target_respondents') || '';
  let url = `/api/stats?department=${encodeURIComponent(deptFilter)}`;
  if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
  if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
  if (period) url += `&period=${encodeURIComponent(period)}`;
  if (cachedTarget) url += `&target=${encodeURIComponent(cachedTarget)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + getAdminToken(),
        'X-Target-Respondents': cachedTarget
      }
    });
    if (res.status === 401) {
      sessionStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token');
      window.location.replace('login.html');
      return;
    }
    const stats = await res.json();

    updateKpiCards(stats);
    updateRadarChart(stats.groupScores);
    updateCriteriaBarChart(stats.questionScores);
    updateRoleDoughnut(stats.byRole);
    updateCommitmentDoughnut(stats.commitment);
    updatePriorityMatrix(stats.topStrengths, stats.topConcerns);
    updateDepartmentTable(stats.byDepartment);
    updateFeedbackWall(stats.suggestions);
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// 3. Update KPI Cards & Progress
function updateKpiCards(stats) {
  // Lấy target từ stats, nếu stats không có hoặc stats là 500 mặc định trong khi localStorage có số khác 500 thì ưu tiên số gần nhất
  const cachedTarget = parseInt(localStorage.getItem('admin_target_respondents'), 10);
  let targetTotal = parseInt(stats.target, 10);

  if (isNaN(targetTotal) || targetTotal <= 0) {
    targetTotal = (!isNaN(cachedTarget) && cachedTarget > 0) ? cachedTarget : 350;
  } else if (targetTotal === 500 && !isNaN(cachedTarget) && cachedTarget > 0 && cachedTarget !== 500) {
    targetTotal = cachedTarget;
    syncTargetToServer(cachedTarget);
  }

  // Luôn lưu lại vào localStorage để lần F5 tiếp theo vẫn giữ nguyên 100%
  localStorage.setItem('admin_target_respondents', targetTotal);

  const currentCount = stats.totalCount || 0;
  const pct = targetTotal > 0 ? Math.min(100, Number(((currentCount / targetTotal) * 100).toFixed(1))) : 0;

  // Áp dụng ngay vào toàn bộ giao diện
  applyTargetToDom(targetTotal, currentCount, pct);

  // KPI 1: Total
  const kpiTotal = document.getElementById('kpi-total-responses');
  if (kpiTotal) kpiTotal.innerText = currentCount;

  // KPI 2: CSI %
  const kpiCsi = document.getElementById('kpi-csi-score');
  const badgeCsi = document.getElementById('badge-csi');
  if (kpiCsi) kpiCsi.innerText = stats.csi || 0;
  if (badgeCsi) {
    if (stats.csi >= 85) {
      badgeCsi.className = 'kpi-badge badge-excellent';
      badgeCsi.innerText = 'Xuất sắc';
    } else if (stats.csi >= 75) {
      badgeCsi.className = 'kpi-badge badge-good';
      badgeCsi.innerText = 'Khá';
    } else if (stats.csi >= 60) {
      badgeCsi.className = 'kpi-badge badge-warning';
      badgeCsi.innerText = 'Trung bình';
    } else {
      badgeCsi.className = 'kpi-badge badge-danger';
      badgeCsi.innerText = 'Cần cải thiện';
    }
  }

  // KPI 3: Overall 1-10 mean
  const kpiOverall = document.getElementById('kpi-overall-score');
  if (kpiOverall) kpiOverall.innerText = stats.overallMean || 0;

  // KPI 4: eNPS
  const kpiEnps = document.getElementById('kpi-enps-score');
  const badgeEnps = document.getElementById('badge-enps');
  if (kpiEnps) {
    kpiEnps.innerText = (stats.enps?.score > 0 ? '+' : '') + (stats.enps?.score || 0);
  }
  if (badgeEnps) {
    const score = stats.enps?.score || 0;
    if (score >= 50) {
      badgeEnps.className = 'kpi-badge badge-excellent';
      badgeEnps.innerText = 'Rất cao';
    } else if (score >= 20) {
      badgeEnps.className = 'kpi-badge badge-good';
      badgeEnps.innerText = 'Tốt';
    } else if (score >= 0) {
      badgeEnps.className = 'kpi-badge badge-warning';
      badgeEnps.innerText = 'Ổn định';
    } else {
      badgeEnps.className = 'kpi-badge badge-danger';
      badgeEnps.innerText = 'Cần chú ý';
    }
  }
}

// 4. Radar Chart: 5 Bộ Y tế dimensions
function updateRadarChart(groupScores) {
  const ctx = document.getElementById('radarGroupChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  const labels = (groupScores || []).map(g => `Nhóm ${g.code}: ${g.name}`);
  const dataValues = (groupScores || []).map(g => g.meanScore);

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels.length ? labels : ['Nhóm A', 'Nhóm B', 'Nhóm C', 'Nhóm D', 'Nhóm E'],
      datasets: [{
        label: 'Điểm trung bình (Thang 1-5)',
        data: dataValues.length ? dataValues : [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(13, 148, 136, 0.22)',
        borderColor: '#0d9488',
        borderWidth: 2.5,
        pointBackgroundColor: '#0f766e',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4.5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, backdropColor: 'transparent', font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.06)' },
          angleLines: { color: 'rgba(0,0,0,0.08)' },
          pointLabels: {
            font: { size: 11.5, weight: '600', family: "'Plus Jakarta Sans', sans-serif" },
            color: '#334155'
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// 5. Horizontal Bar Chart: 23 individual criteria
function updateCriteriaBarChart(questionScores) {
  const ctx = document.getElementById('barCriteriaChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  const sorted = [...(questionScores || [])].sort((a, b) => b.meanScore - a.meanScore);
  const labels = sorted.map(q => `${q.id.toUpperCase()}: ${q.text.length > 40 ? q.text.slice(0, 38) + '...' : q.text}`);
  const dataValues = sorted.map(q => q.meanScore);
  const backgroundColors = dataValues.map(v => {
    if (v >= 4.0) return '#10b981'; // Green
    if (v >= 3.6) return '#0284c7'; // Blue
    if (v >= 3.3) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  });

  if (barCriteriaChartInstance) {
    barCriteriaChartInstance.destroy();
  }

  barCriteriaChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Điểm hài lòng trung bình',
        data: dataValues,
        backgroundColor: backgroundColors,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 1,
          max: 5,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }, color: '#1e293b' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Điểm TB: ${ctx.raw} / 5.0 (CSI: ${(ctx.raw / 5 * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });
}

// 6. Role Breakdown Doughnut
function updateRoleDoughnut(byRole) {
  const ctx = document.getElementById('roleDoughnutChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  const roleNameMap = {
    bacsi: 'Bác sĩ',
    dieuduong: 'Điều dưỡng / HS',
    kythuatvien: 'Kỹ thuật viên',
    duocsi: 'Dược sĩ',
    quanly_hanhchinh: 'Hành chính / QL',
    hotro: 'Hộ lý / Hỗ trợ'
  };

  const labels = Object.keys(byRole || {}).map(k => roleNameMap[k] || k);
  const data = Object.values(byRole || {}).map(v => v.count);

  if (roleDoughnutInstance) {
    roleDoughnutInstance.destroy();
  }

  roleDoughnutInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Chưa có dữ liệu'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: ['#0d9488', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      cutout: '65%'
    }
  });
}

// 7. Commitment Doughnut
function updateCommitmentDoughnut(commitmentStats) {
  const ctx = document.getElementById('commitmentDoughnutChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  const commitMap = {
    chac_chan: 'Chắc chắn gắn bó lâu dài',
    co_the: 'Có thể gắn bó',
    phan_van: 'Đang phân vân',
    du_dinh_chuyen: 'Dự định chuyển nơi khác'
  };

  const labels = Object.keys(commitmentStats || {}).map(k => commitMap[k] || k);
  const data = Object.values(commitmentStats || {});

  if (commitmentDoughnutInstance) {
    commitmentDoughnutInstance.destroy();
  }

  commitmentDoughnutInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Chưa có dữ liệu'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      cutout: '65%'
    }
  });
}

// 8. Priority Action Matrix (Top 5 Strengths & Concerns)
function updatePriorityMatrix(topStrengths, topConcerns) {
  const strengthsContainer = document.getElementById('matrix-strengths-list');
  const concernsContainer = document.getElementById('matrix-concerns-list');

  if (strengthsContainer) {
    if (!topStrengths || topStrengths.length === 0) {
      strengthsContainer.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Chưa có dữ liệu khảo sát.</p>';
    } else {
      strengthsContainer.innerHTML = topStrengths.map((q, idx) => `
        <div class="matrix-item">
          <div class="matrix-item-left">
            <span class="matrix-rank">${idx + 1}</span>
            <div>
              <div class="text">${q.text}</div>
              <div class="sub">Mã: ${q.id.toUpperCase()} • Nhóm ${q.groupCode}: ${q.groupName}</div>
            </div>
          </div>
          <span class="matrix-score-pill pill-green">${q.meanScore} / 5</span>
        </div>
      `).join('');
    }
  }

  if (concernsContainer) {
    if (!topConcerns || topConcerns.length === 0) {
      concernsContainer.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Chưa có dữ liệu khảo sát.</p>';
    } else {
      concernsContainer.innerHTML = topConcerns.map((q, idx) => `
        <div class="matrix-item">
          <div class="matrix-item-left">
            <span class="matrix-rank" style="background:#fee2e2; color:#b91c1c;">${idx + 1}</span>
            <div>
              <div class="text">${q.text}</div>
              <div class="sub">Mã: ${q.id.toUpperCase()} • Nhóm ${q.groupCode}: ${q.groupName}</div>
            </div>
          </div>
          <span class="matrix-score-pill pill-red">${q.meanScore} / 5</span>
        </div>
      `).join('');
    }
  }
}

// 9. Department Benchmark Table
function updateDepartmentTable(byDepartment) {
  const tbody = document.getElementById('dept-table-body');
  if (!tbody) return;

  const deptNames = {
    noi: 'Khối Lâm sàng Nội',
    ngoai: 'Khối Lâm sàng Ngoại',
    capcuu: 'Khối Khám bệnh & Cấp cứu',
    canlamsang: 'Khối Cận lâm sàng',
    hanhchinh: 'Khối Phòng ban chức năng'
  };

  const rows = Object.entries(byDepartment || {}).map(([key, item]) => {
    const name = deptNames[key] || key;
    const badgeClass = item.csi >= 80 ? 'badge-excellent' : item.csi >= 70 ? 'badge-good' : 'badge-warning';
    return `
      <tr>
        <td><strong>${name}</strong></td>
        <td>${item.count} phiếu</td>
        <td><span style="font-weight:700; color:#0f766e;">${item.avgScore}</span> / 5.0</td>
        <td><span class="kpi-badge ${badgeClass}">${item.csi}%</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Chưa có dữ liệu phân loại.</td></tr>';
}

// 10. Staff Suggestions Feedback Wall
function updateFeedbackWall(suggestions) {
  const container = document.getElementById('feedback-wall');
  if (!container) return;

  const roleNames = {
    bacsi: 'Bác sĩ',
    dieuduong: 'Điều dưỡng',
    kythuatvien: 'Kỹ thuật viên',
    duocsi: 'Dược sĩ',
    quanly_hanhchinh: 'Hành chính',
    hotro: 'Hộ lý / Y công'
  };
  const deptNames = {
    noi: 'Khoa Nội',
    ngoai: 'Khoa Ngoại',
    capcuu: 'Cấp cứu',
    canlamsang: 'Cận lâm sàng',
    hanhchinh: 'Hành chính'
  };

  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8; font-size:13.5px; padding:16px;">Chưa có ý kiến góp ý nào được gửi.</p>';
    return;
  }

  container.innerHTML = suggestions.slice(0, 6).map(s => `
    <div class="feedback-card">
      <div class="feedback-quote">"${escapeHtml(s.text)}"</div>
      <div class="feedback-meta">
        <span>${escapeHtml(roleNames[s.role] || 'Nhân viên')} • ${escapeHtml(deptNames[s.department] || '')}</span>
        <span style="font-weight:700; color:#0d9488;">Đánh giá: ${escapeHtml(String(s.score || '8'))}/10</span>
      </div>
    </div>
  `).join('');
}

// 11. Load Paginated Responses Table
async function loadResponsesTable(page = 1) {
  const search = document.getElementById('table-search-input')?.value || '';
  const dept = document.getElementById('filter-department')?.value || 'all';
  const { startDate, endDate } = getActiveDateRange();

  let url = `/api/responses?page=${page}&limit=10&search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}`;
  if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
  if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + getAdminToken() }
    });
    if (res.status === 401) {
      sessionStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token');
      window.location.replace('login.html');
      return;
    }
    const data = await res.json();

    const tbody = document.getElementById('responses-table-body');
    if (tbody) {
      if (data.items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Không tìm thấy bản ghi khảo sát nào trong giai đoạn này.</td></tr>';
      } else {
        const roleMap = { bacsi: 'Bác sĩ', dieuduong: 'Điều dưỡng', kythuatvien: 'KTV', duocsi: 'Dược sĩ', quanly_hanhchinh: 'Hành chính', hotro: 'Hộ lý / Y công' };
        const deptMap = { noi: 'Lâm sàng Nội', ngoai: 'Lâm sàng Ngoại', capcuu: 'Khám bệnh - Cấp cứu', canlamsang: 'Cận lâm sàng', hanhchinh: 'Hành chính' };

        tbody.innerHTML = data.items.map(item => `
          <tr>
            <td><strong style="color:#0f766e;">${escapeHtml(item.id)}</strong></td>
            <td>${new Date(item.submittedAt).toLocaleDateString('vi-VN')}</td>
            <td>${escapeHtml(deptMap[item.demographics?.department] || item.demographics?.department || '')}</td>
            <td>${escapeHtml(roleMap[item.demographics?.role] || item.demographics?.role || '')}</td>
            <td><span class="kpi-badge badge-good">${escapeHtml(String(item.overall?.score || 8))} / 10</span></td>
            <td><span style="font-size:12px; color:#475569;">${item.overall?.suggestions ? escapeHtml(item.overall.suggestions.slice(0, 35)) + (item.overall.suggestions.length > 35 ? '...' : '') : '<em style="color:#94a3b8">Không có</em>'}</span></td>
          </tr>
        `).join('');
      }
    }

    // Pagination controls
    const pageLabel = document.getElementById('table-page-info');
    if (pageLabel) {
      pageLabel.innerText = `Trang ${data.page} / ${data.totalPages || 1} (Tổng ${data.total} phiếu)`;
    }

    const prevBtn = document.getElementById('table-prev-btn');
    const nextBtn = document.getElementById('table-next-btn');
    if (prevBtn) prevBtn.disabled = data.page <= 1;
    if (nextBtn) nextBtn.disabled = data.page >= data.totalPages;

    // Store current page
    tbody?.setAttribute('data-current-page', data.page);
  } catch (err) {
    console.error('Error loading responses:', err);
  }
}

// 12. Setup UI Event Listeners
function setupEventListeners() {
  // Department filter change
  document.getElementById('filter-department')?.addEventListener('change', () => {
    updateExportExcelLink();
    loadDashboardStats();
    loadResponsesTable(1);
  });

  // Period filter change
  document.getElementById('filter-period')?.addEventListener('change', (e) => {
    const isCustom = e.target.value === 'custom';
    const customContainer = document.getElementById('custom-date-container');
    if (customContainer) {
      customContainer.style.display = isCustom ? 'inline-flex' : 'none';
    }
    if (!isCustom) {
      updateExportExcelLink();
      loadDashboardStats();
      loadResponsesTable(1);
    }
  });

  // Custom date inputs change
  document.getElementById('filter-start-date')?.addEventListener('change', () => {
    updateExportExcelLink();
    loadDashboardStats();
    loadResponsesTable(1);
  });

  document.getElementById('filter-end-date')?.addEventListener('change', () => {
    updateExportExcelLink();
    loadDashboardStats();
    loadResponsesTable(1);
  });

  // Table search
  document.getElementById('table-search-input')?.addEventListener('input', () => {
    loadResponsesTable(1);
  });

  // Pagination buttons
  document.getElementById('table-prev-btn')?.addEventListener('click', () => {
    const tbody = document.getElementById('responses-table-body');
    const cur = parseInt(tbody?.getAttribute('data-current-page') || 1, 10);
    if (cur > 1) loadResponsesTable(cur - 1);
  });

  document.getElementById('table-next-btn')?.addEventListener('click', () => {
    const tbody = document.getElementById('responses-table-body');
    const cur = parseInt(tbody?.getAttribute('data-current-page') || 1, 10);
    loadResponsesTable(cur + 1);
  });

  // Refresh button
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    loadDashboardStats();
    loadResponsesTable(1);
  });

  // Clear data button
  document.getElementById('btn-clear-data')?.addEventListener('click', async () => {
    if (confirm('LƯU Ý: Thao tác này sẽ xóa toàn bộ phiếu khảo sát hiện có trong cơ sở dữ liệu để bắt đầu đợt mới. Bạn có chắc chắn không?')) {
      const btn = document.getElementById('btn-clear-data');
      if (btn) btn.disabled = true;
      try {
        const res = await fetch('/api/clear-data', { 
          method: 'POST',
          headers: getAuthHeaders()
        });
        if (res.status === 401) {
          window.location.replace('login.html');
          return;
        }
        const json = await res.json();
        if (res.ok && json.success) {
          alert(json.message || 'Đã làm mới dữ liệu thành công!');
          await loadDashboardStats();
          await loadResponsesTable(1);
        } else {
          alert(json.message || 'Lỗi khi xóa dữ liệu.');
        }
      } catch (e) {
        alert('Lỗi kết nối khi xóa dữ liệu: ' + (e.message || e));
      } finally {
        if (btn) btn.disabled = false;
      }
    }
  });

  // Logout button
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi phiên Quản trị viên?')) {
      const token = getAdminToken();
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ token })
        });
      } catch (_) {}
      sessionStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token');
      window.location.replace('login.html');
    }
  });

  // QR Modal Open/Close
  const qrModal = document.getElementById('qr-modal');
  document.getElementById('btn-open-qr')?.addEventListener('click', () => {
    if (qrModal) qrModal.classList.add('active');
  });

  document.getElementById('btn-close-qr')?.addEventListener('click', () => {
    if (qrModal) qrModal.classList.remove('active');
  });

  qrModal?.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.remove('active');
  });

  // Toggle QR Mode (Cloudflare Tunnel vs LAN IP)
  document.getElementById('btn-mode-tunnel')?.addEventListener('click', () => {
    currentQrMode = 'tunnel';
    updateQrDisplay();
  });

  document.getElementById('btn-mode-local')?.addEventListener('click', () => {
    currentQrMode = 'local';
    updateQrDisplay();
  });

  // Copy QR URL button
  document.getElementById('btn-copy-qr-url')?.addEventListener('click', async () => {
    const urlInput = document.getElementById('qr-survey-url-input');
    const url = urlInput?.value || window.location.origin;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
    } catch (_) {
      const tempInput = document.createElement('input');
      tempInput.value = url;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }

    const toast = document.getElementById('copy-toast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }
  });

  // Open Direct URL in new tab
  document.getElementById('btn-open-direct-url')?.addEventListener('click', () => {
    const urlInput = document.getElementById('qr-survey-url-input');
    const url = urlInput ? urlInput.value : window.location.origin;
    window.open(url, '_blank');
  });

  // Print QR poster
  document.getElementById('btn-print-qr')?.addEventListener('click', () => {
    document.body.classList.add('printing-qr');
    window.print();
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-qr');
    }, { once: true });
  });

  // ==========================================
  // GOOGLE SHEETS CLOUD SYNC CONTROLLER
  // ==========================================
  setupGoogleSheetSyncEvents();

  // ==========================================
  // TARGET RESPONDENTS CUSTOM CONTROLLER
  // ==========================================
  setupTargetModalEvents();

  // ==========================================
  // ADMIN PASSWORD CHANGE CONTROLLER
  // ==========================================
  setupPasswordModalEvents();
}

function setupTargetModalEvents() {
  const targetModal = document.getElementById('target-modal');
  const btnEditTarget = document.getElementById('btn-edit-target');
  const btnCloseTarget = document.getElementById('btn-close-target');
  const btnCancelTarget = document.getElementById('btn-cancel-target');
  const btnSaveTarget = document.getElementById('btn-save-target');
  const targetInput = document.getElementById('target-input');
  const targetAlert = document.getElementById('target-alert-box');

  function showTargetAlert(msg, isSuccess = true) {
    if (!targetAlert) return;
    targetAlert.style.display = 'block';
    targetAlert.style.background = isSuccess ? '#ecfdf5' : '#fef2f2';
    targetAlert.style.color = isSuccess ? '#065f46' : '#991b1b';
    targetAlert.style.border = isSuccess ? '1px solid #a7f3d0' : '1px solid #fecaca';
    targetAlert.innerHTML = (isSuccess ? '✅ ' : '⚠️ ') + msg;
  }

  function hideTargetAlert() {
    if (targetAlert) targetAlert.style.display = 'none';
  }

  btnEditTarget?.addEventListener('click', () => {
    hideTargetAlert();
    const saved = localStorage.getItem('admin_target_respondents');
    if (targetInput) {
      targetInput.value = (saved && parseInt(saved, 10) > 0) 
        ? saved 
        : (systemConfig?.target || 350);
    }
    if (targetModal) targetModal.classList.add('active');
  });

  btnCloseTarget?.addEventListener('click', () => {
    if (targetModal) targetModal.classList.remove('active');
  });

  btnCancelTarget?.addEventListener('click', () => {
    if (targetModal) targetModal.classList.remove('active');
  });

  targetModal?.addEventListener('click', (e) => {
    if (e.target === targetModal) targetModal.classList.remove('active');
  });

  // Preset buttons
  document.querySelectorAll('.target-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      if (targetInput) targetInput.value = val;
    });
  });

  btnSaveTarget?.addEventListener('click', async () => {
    const val = parseInt(targetInput?.value, 10);
    if (isNaN(val) || val <= 0) {
      showTargetAlert('Vui lòng nhập số lượng nhân viên hợp lệ (lớn hơn 0).', false);
      return;
    }

    btnSaveTarget.disabled = true;
    btnSaveTarget.innerText = 'Đang lưu...';
    try {
      const res = await fetch('/api/admin/target-config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ target: val })
      });
      const data = await res.json();
      if (data.success) {
        showTargetAlert(data.message, true);
        // Lưu vĩnh viễn vào localStorage của trình duyệt
        localStorage.setItem('admin_target_respondents', data.target);
        if (systemConfig) systemConfig.target = data.target;
        applyTargetToDom(data.target);

        setTimeout(() => {
          if (targetModal) targetModal.classList.remove('active');
          loadDashboardStats();
        }, 800);
      } else {
        showTargetAlert(data.message || 'Lỗi khi lưu mục tiêu.', false);
      }
    } catch (err) {
      showTargetAlert('Lỗi kết nối khi lưu: ' + err.message, false);
    } finally {
      btnSaveTarget.disabled = false;
      btnSaveTarget.innerText = '💾 Lưu Mục Tiêu Mới';
    }
  });
}

function setupPasswordModalEvents() {
  const pwdModal = document.getElementById('pwd-modal');
  const btnOpenPwd = document.getElementById('btn-open-pwd');
  const btnClosePwd = document.getElementById('btn-close-pwd');
  const btnCancelPwd = document.getElementById('btn-cancel-pwd');
  const btnSavePwd = document.getElementById('btn-save-pwd');
  const pwdCurrent = document.getElementById('pwd-current');
  const pwdNew = document.getElementById('pwd-new');
  const pwdConfirm = document.getElementById('pwd-confirm');
  const pwdAlert = document.getElementById('pwd-alert-box');

  function showPwdAlert(msg, isSuccess = true) {
    if (!pwdAlert) return;
    pwdAlert.style.display = 'block';
    pwdAlert.style.background = isSuccess ? '#ecfdf5' : '#fef2f2';
    pwdAlert.style.color = isSuccess ? '#065f46' : '#991b1b';
    pwdAlert.style.border = isSuccess ? '1px solid #a7f3d0' : '1px solid #fecaca';
    pwdAlert.innerHTML = (isSuccess ? '✅ ' : '⚠️ ') + msg;
  }

  function hidePwdAlert() {
    if (pwdAlert) pwdAlert.style.display = 'none';
  }

  function clearPwdInputs() {
    if (pwdCurrent) pwdCurrent.value = '';
    if (pwdNew) pwdNew.value = '';
    if (pwdConfirm) pwdConfirm.value = '';
    hidePwdAlert();
  }

  btnOpenPwd?.addEventListener('click', () => {
    clearPwdInputs();
    if (pwdModal) pwdModal.classList.add('active');
    setTimeout(() => pwdCurrent?.focus(), 100);
  });

  btnClosePwd?.addEventListener('click', () => {
    if (pwdModal) pwdModal.classList.remove('active');
  });

  btnCancelPwd?.addEventListener('click', () => {
    if (pwdModal) pwdModal.classList.remove('active');
  });

  pwdModal?.addEventListener('click', (e) => {
    if (e.target === pwdModal) pwdModal.classList.remove('active');
  });

  btnSavePwd?.addEventListener('click', async () => {
    const currentPassword = pwdCurrent?.value || '';
    const newPassword = pwdNew?.value || '';
    const confirmPassword = pwdConfirm?.value || '';

    if (!currentPassword) {
      showPwdAlert('Vui lòng nhập mật khẩu hiện tại.', false);
      pwdCurrent?.focus();
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showPwdAlert('Mật khẩu mới phải có tối thiểu 6 ký tự.', false);
      pwdNew?.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      showPwdAlert('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.', false);
      pwdConfirm?.focus();
      return;
    }

    btnSavePwd.disabled = true;
    btnSavePwd.innerText = 'Đang lưu...';

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        showPwdAlert(data.message, true);
        setTimeout(() => {
          if (pwdModal) pwdModal.classList.remove('active');
          clearPwdInputs();
        }, 1500);
      } else {
        showPwdAlert(data.message || 'Đổi mật khẩu thất bại.', false);
      }
    } catch (err) {
      showPwdAlert('Lỗi kết nối khi đổi mật khẩu: ' + err.message, false);
    } finally {
      btnSavePwd.disabled = false;
      btnSavePwd.innerText = '💾 Lưu Mật Khẩu';
    }
  });
}


function setupGoogleSheetSyncEvents() {
  const gsheetModal = document.getElementById('gsheet-modal');
  const btnOpenGSheet = document.getElementById('btn-open-gsheet');
  const btnCloseGSheet = document.getElementById('btn-close-gsheet');
  const gsheetInput = document.getElementById('gsheet-webhook-input');
  const statusBadge = document.getElementById('gsheet-status-badge');
  const alertBox = document.getElementById('gsheet-alert-box');
  const btnSave = document.getElementById('btn-save-gsheet');
  const btnTest = document.getElementById('btn-test-gsheet');
  const btnSyncAll = document.getElementById('btn-sync-all-gsheet');
  const btnCopyScript = document.getElementById('btn-copy-script');

  function showAlert(msg, isSuccess = true) {
    if (!alertBox) return;
    alertBox.style.display = 'block';
    alertBox.style.background = isSuccess ? '#ecfdf5' : '#fef2f2';
    alertBox.style.border = isSuccess ? '1px solid #a7f3d0' : '1px solid #fecaca';
    alertBox.style.color = isSuccess ? '#065f46' : '#991b1b';
    alertBox.innerHTML = (isSuccess ? '✅ ' : '⚠️ ') + msg;
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = 'none';
  }

  async function loadGSheetConfig() {
    hideAlert();
    if (statusBadge) {
      statusBadge.style.background = '#f1f5f9';
      statusBadge.style.color = '#64748b';
      statusBadge.innerText = '⏳ Đang kiểm tra...';
    }

    try {
      const res = await fetch('/api/admin/google-sheet-config', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        if (gsheetInput) gsheetInput.value = data.webhookUrl || '';
        if (statusBadge) {
          if (data.configured) {
            statusBadge.style.background = '#ecfdf5';
            statusBadge.style.color = '#047857';
            statusBadge.innerText = '✓ Đang hoạt động';
          } else {
            statusBadge.style.background = '#fef2f2';
            statusBadge.style.color = '#b91c1c';
            statusBadge.innerText = '⚠️ Chưa kết nối';
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi tải cấu hình Google Sheet:', err);
    }
  }

  btnOpenGSheet?.addEventListener('click', () => {
    if (gsheetModal) gsheetModal.classList.add('active');
    loadGSheetConfig();
  });

  btnCloseGSheet?.addEventListener('click', () => {
    if (gsheetModal) gsheetModal.classList.remove('active');
  });

  gsheetModal?.addEventListener('click', (e) => {
    if (e.target === gsheetModal) gsheetModal.classList.remove('active');
  });

  // Lưu cấu hình URL Webhook
  btnSave?.addEventListener('click', async () => {
    const webhookUrl = (gsheetInput?.value || '').trim();
    hideAlert();
    btnSave.disabled = true;
    btnSave.innerText = 'Đang lưu...';

    try {
      const res = await fetch('/api/admin/google-sheet-config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ webhookUrl })
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Đã lưu cấu hình Google Sheet Webhook thành công!', true);
        if (statusBadge) {
          if (data.configured) {
            statusBadge.style.background = '#ecfdf5';
            statusBadge.style.color = '#047857';
            statusBadge.innerText = '✓ Đang hoạt động';
          } else {
            statusBadge.style.background = '#fef2f2';
            statusBadge.style.color = '#b91c1c';
            statusBadge.innerText = '⚠️ Chưa kết nối';
          }
        }
      } else {
        showAlert(data.message || 'Lỗi khi lưu cấu hình.', false);
      }
    } catch (err) {
      showAlert('Lỗi kết nối máy chủ khi lưu cấu hình.', false);
    } finally {
      btnSave.disabled = false;
      btnSave.innerText = '💾 Lưu Cấu Hình';
    }
  });

  // Kiểm tra kết nối Webhook (Test Ping)
  btnTest?.addEventListener('click', async () => {
    const webhookUrl = (gsheetInput?.value || '').trim();
    if (!webhookUrl) {
      showAlert('Vui lòng dán liên kết Google Apps Script Webhook URL trước khi kiểm tra.', false);
      return;
    }

    hideAlert();
    btnTest.disabled = true;
    btnTest.innerText = '⏳ Đang kiểm tra...';

    try {
      const res = await fetch('/api/admin/test-google-sheet', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ webhookUrl })
      });
      const data = await res.json();
      if (data.success) {
        const detailMsg = data.data?.sheetName ? ` (${data.data.sheetName})` : '';
        showAlert(`Kết nối thành công tới Google Sheet${detailMsg}! Dịch vụ hoạt động hoàn hảo.`, true);
        if (statusBadge) {
          statusBadge.style.background = '#ecfdf5';
          statusBadge.style.color = '#047857';
          statusBadge.innerText = '✓ Kết nối tốt';
        }
      } else {
        showAlert(data.message || 'Kiểm tra thất bại. Vui lòng kiểm tra lại URL.', false);
      }
    } catch (err) {
      showAlert('Lỗi khi kiểm tra kết nối tới Google Sheet: ' + err.message, false);
    } finally {
      btnTest.disabled = false;
      btnTest.innerText = '🧪 Kiểm Tra Kết Nối';
    }
  });

  // Đồng bộ toàn bộ dữ liệu khảo sát sang Google Sheet
  btnSyncAll?.addEventListener('click', async () => {
    const webhookUrl = (gsheetInput?.value || '').trim();
    if (!webhookUrl) {
      showAlert('Vui lòng dán và lưu Webhook URL trước khi đồng bộ dữ liệu.', false);
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn đẩy toàn bộ phiếu khảo sát hiện có sang Google Sheet?')) {
      return;
    }

    hideAlert();
    btnSyncAll.disabled = true;
    btnSyncAll.innerText = '⏳ Đang đồng bộ...';

    try {
      const res = await fetch('/api/admin/sync-google-sheet', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showAlert(`Đã đồng bộ thành công ${data.count || 0} phiếu sang Google Sheet!`, true);
      } else {
        showAlert(data.message || 'Lỗi khi đồng bộ dữ liệu.', false);
      }
    } catch (err) {
      showAlert('Lỗi máy chủ khi đồng bộ: ' + err.message, false);
    } finally {
      btnSyncAll.disabled = false;
      btnSyncAll.innerText = '🚀 Đồng Bộ Toàn Bộ Phiếu Ngay';
    }
  });

  // Sao chép mã Google Apps Script
  btnCopyScript?.addEventListener('click', async () => {
    btnCopyScript.disabled = true;
    btnCopyScript.innerText = '⏳ Đang tải mã...';

    try {
      const res = await fetch('/api/admin/google-sheet-script', {
        headers: getAuthHeaders()
      });
      const code = await res.text();
      await navigator.clipboard.writeText(code);
      btnCopyScript.innerText = '✓ Đã sao chép!';
      showAlert('Đã sao chép mã Google Script vào bộ nhớ tạm. Giờ bạn chỉ cần mở Google Sheet ➔ Tiện ích mở rộng ➔ Apps Script và DÁN vào!', true);
    } catch (err) {
      console.warn('Lỗi sao chép qua clipboard API:', err);
      showAlert('Không thể tự động sao chép. Bạn có thể mở file GOOGLE_SHEET_APPS_SCRIPT.js trong thư mục để sao chép.', false);
      btnCopyScript.innerText = '📋 Thử lại';
    } finally {
      setTimeout(() => {
        btnCopyScript.disabled = false;
        btnCopyScript.innerText = '📋 Sao chép mã Google Script';
      }, 3000);
    }
  });
}
