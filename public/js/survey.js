/**
 * SURVEY INTERACTION CONTROLLER (SURVEY.JS)
 */

document.addEventListener('DOMContentLoaded', () => {
  const LOCAL_STORAGE_KEY = 'khao_sat_hai_long_nvyt_draft_v1';
  let currentStep = 1;
  const totalSteps = 4;

  // State object
  const state = {
    demographics: {
      department: '',
      role: '',
      experience: '',
      gender: '',
      degree: ''
    },
    answers: {},
    overall: {
      score: null,
      commitment: '',
      enps: null,
      suggestions: ''
    }
  };

  // Render question groups into the respective sections
  renderSections();
  loadDraft();
  updateProgress();
  setupEventListeners();

  function renderSections() {
    // 1. Render Demographics (Step 1)
    const demoContainer = document.getElementById('demographics-container');
    if (demoContainer) {
      demoContainer.innerHTML = `
        <div class="form-grid">
          <div class="form-group">
            <label for="demo-dept">Khối / Đơn vị công tác <span class="req">*</span></label>
            <select id="demo-dept" class="form-select" required>
              <option value="">-- Chọn Khối / Khoa phòng --</option>
              ${SURVEY_CONFIG.demographics[0].options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="demo-role">Vị trí chức danh chuyên môn <span class="req">*</span></label>
            <select id="demo-role" class="form-select" required>
              <option value="">-- Chọn Vị trí chức danh --</option>
              ${SURVEY_CONFIG.demographics[1].options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="demo-exp">Thâm niên công tác tại bệnh viện <span class="req">*</span></label>
            <select id="demo-exp" class="form-select" required>
              <option value="">-- Chọn Thâm niên --</option>
              ${SURVEY_CONFIG.demographics[2].options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="demo-degree">Trình độ đào tạo chuyên môn cao nhất <span class="req">*</span></label>
            <select id="demo-degree" class="form-select" required>
              <option value="">-- Chọn Trình độ --</option>
              ${SURVEY_CONFIG.demographics[4].options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-top: 10px;">
          <label>Giới tính <span class="req">*</span></label>
          <div class="radio-pill-group">
            ${SURVEY_CONFIG.demographics[3].options.map(o => `
              <label class="radio-pill-label" data-gender="${o.value}">
                <input type="radio" name="gender" value="${o.value}">
                <span>${o.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 2. Render Step 2: Groups A & B
    const step2Container = document.getElementById('step-2-content');
    if (step2Container) {
      step2Container.innerHTML = `
        ${renderGroupBlock(SURVEY_CONFIG.groups[0])}
        ${renderGroupBlock(SURVEY_CONFIG.groups[1])}
      `;
    }

    // 3. Render Step 3: Groups C & D
    const step3Container = document.getElementById('step-3-content');
    if (step3Container) {
      step3Container.innerHTML = `
        ${renderGroupBlock(SURVEY_CONFIG.groups[2])}
        ${renderGroupBlock(SURVEY_CONFIG.groups[3])}
      `;
    }

    // 4. Render Step 4: Group E & Overall
    const step4Container = document.getElementById('step-4-content');
    if (step4Container) {
      step4Container.innerHTML = `
        ${renderGroupBlock(SURVEY_CONFIG.groups[4])}
        ${renderOverallBlock()}
      `;
    }
  }

  function renderGroupBlock(group) {
    return `
      <div class="card section-intro-card">
        <span class="section-badge">${group.icon} Nhóm ${group.code}</span>
        <h2 class="section-title">${group.name}</h2>
        <p class="section-desc">${group.desc}</p>
      </div>

      <div class="questions-list">
        ${group.questions.map(q => `
          <div class="question-card" id="q-card-${q.id}" data-qid="${q.id}">
            <div class="question-header">
              <span class="q-code-badge">${q.id.toUpperCase()}</span>
              <p class="q-text">${q.text} <span class="req" style="color:#ef4444">*</span></p>
            </div>
            <div class="likert-scale-grid">
              ${SURVEY_CONFIG.likertScale.map(scale => `
                <div class="likert-btn" data-qid="${q.id}" data-val="${scale.value}" title="${scale.label}">
                  <span class="emoji">${scale.emoji}</span>
                  <span class="label">${scale.shortLabel}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderOverallBlock() {
    return `
      <div class="card section-intro-card" style="border-left-color: #0284c7;">
        <span class="section-badge" style="background:#e0f2fe; color:#0369a1;">⭐ Đánh giá chung & Gắn kết</span>
        <h2 class="section-title">Chỉ số Hài lòng & Gắn bó Bệnh viện</h2>
        <p class="section-desc">Đánh giá tổng quan mức độ hài lòng, ý định cống hiến và tâm tư nguyện vọng của nhân viên</p>
      </div>

      <!-- Question: Overall Score (1 - 10) -->
      <div class="question-card" id="q-card-overall-score">
        <div class="question-header">
          <span class="q-code-badge" style="background:#e0f2fe; color:#0369a1;">CSI</span>
          <p class="q-text">1. Đánh giá mức độ hài lòng chung đối với Bệnh viện hiện nay (Thang điểm 1 - 10) <span style="color:#ef4444">*</span></p>
        </div>
        <div class="scale10-grid" id="scale-overall-score">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
            <div class="scale-btn" data-type="overall-score" data-val="${n}">${n}</div>
          `).join('')}
        </div>
        <div class="scale-labels-row">
          <span>1 - Rất thất vọng</span>
          <span>10 - Tuyệt đối hài lòng</span>
        </div>
      </div>

      <!-- Question: Commitment -->
      <div class="question-card" id="q-card-commitment">
        <div class="question-header">
          <span class="q-code-badge" style="background:#e0f2fe; color:#0369a1;">CAM KẾT</span>
          <p class="q-text">2. Bạn có dự định tiếp tục gắn bó làm việc tại bệnh viện trong 3 - 5 năm tới? <span style="color:#ef4444">*</span></p>
        </div>
        <div class="commitment-card-grid">
          ${SURVEY_CONFIG.overallQuestions[1].options.map(opt => `
            <div class="commitment-item" data-val="${opt.value}">
              <span class="emoji">${opt.icon || '📌'}</span>
              <span>${opt.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Question: eNPS (0 - 10) -->
      <div class="question-card" id="q-card-enps">
        <div class="question-header">
          <span class="q-code-badge" style="background:#e0f2fe; color:#0369a1;">eNPS</span>
          <p class="q-text">3. Mức độ sẵn lòng giới thiệu Bệnh viện là nơi làm việc tốt cho đồng nghiệp / người thân trong ngành y (0 - 10) <span style="color:#ef4444">*</span></p>
        </div>
        <div class="scale10-grid" id="scale-enps">
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
            <div class="scale-btn" data-type="enps" data-val="${n}">${n}</div>
          `).join('')}
        </div>
        <div class="scale-labels-row">
          <span>0 - Hoàn toàn không</span>
          <span>10 - Rất nhiệt tình</span>
        </div>
      </div>

      <!-- Question: Suggestions -->
      <div class="question-card">
        <div class="question-header">
          <span class="q-code-badge" style="background:#fef3c7; color:#b45309;">Ý KIẾN</span>
          <p class="q-text">4. Ý kiến đóng góp, tâm tư hoặc đề xuất giải pháp cụ thể gửi tới Ban Giám đốc (Không bắt buộc)</p>
        </div>
        <textarea id="overall-suggestions" class="form-textarea" placeholder="Ví dụ: Kiến nghị về trang thiết bị tại khoa, cải tiến chế độ phụ cấp trực gác, cải thiện nhà ăn/phòng nghỉ, nâng cấp phần mềm HIS..."></textarea>
      </div>
    `;
  }

  function setupEventListeners() {
    // Demographics selects
    document.getElementById('demo-dept')?.addEventListener('change', (e) => {
      state.demographics.department = e.target.value;
      saveDraft();
      updateProgress();
    });

    document.getElementById('demo-role')?.addEventListener('change', (e) => {
      state.demographics.role = e.target.value;
      saveDraft();
      updateProgress();
    });

    document.getElementById('demo-exp')?.addEventListener('change', (e) => {
      state.demographics.experience = e.target.value;
      saveDraft();
      updateProgress();
    });

    document.getElementById('demo-degree')?.addEventListener('change', (e) => {
      state.demographics.degree = e.target.value;
      saveDraft();
      updateProgress();
    });

    // Gender radio
    document.querySelectorAll('.radio-pill-label[data-gender]').forEach(label => {
      label.addEventListener('click', () => {
        const val = label.getAttribute('data-gender');
        state.demographics.gender = val;
        document.querySelectorAll('.radio-pill-label[data-gender]').forEach(l => l.classList.remove('active'));
        label.classList.add('active');
        saveDraft();
        updateProgress();
      });
    });

    // Likert button clicks
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.likert-btn');
      if (btn) {
        const qid = btn.getAttribute('data-qid');
        const val = parseInt(btn.getAttribute('data-val'), 10);
        state.answers[qid] = val;

        const parentCard = document.getElementById(`q-card-${qid}`);
        if (parentCard) {
          parentCard.classList.add('answered');
          parentCard.querySelectorAll('.likert-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }

        saveDraft();
        updateProgress();
      }
    });

    // Scale 1-10 overall score
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.scale-btn[data-type="overall-score"]');
      if (btn) {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        state.overall.score = val;
        document.querySelectorAll('.scale-btn[data-type="overall-score"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('q-card-overall-score')?.classList.add('answered');
        saveDraft();
        updateProgress();
      }
    });

    // Commitment selection
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.commitment-item');
      if (item) {
        const val = item.getAttribute('data-val');
        state.overall.commitment = val;
        document.querySelectorAll('.commitment-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('q-card-commitment')?.classList.add('answered');
        saveDraft();
        updateProgress();
      }
    });

    // eNPS scale
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.scale-btn[data-type="enps"]');
      if (btn) {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        state.overall.enps = val;
        document.querySelectorAll('.scale-btn[data-type="enps"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('q-card-enps')?.classList.add('answered');
        saveDraft();
        updateProgress();
      }
    });

    // Suggestions textarea
    document.addEventListener('input', (e) => {
      if (e.target.id === 'overall-suggestions') {
        state.overall.suggestions = e.target.value;
        saveDraft();
      }
    });

    // Navigation buttons
    document.getElementById('btn-prev')?.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      }
    });

    document.getElementById('btn-submit')?.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        submitSurvey();
      }
    });

    // Step tabs in progress card
    document.querySelectorAll('.step-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetStep = parseInt(tab.getAttribute('data-step'), 10);
        if (targetStep < currentStep) {
          goToStep(targetStep);
        } else if (targetStep > currentStep) {
          if (validateStep(currentStep)) {
            goToStep(targetStep);
          }
        }
      });
    });
  }

  function goToStep(step) {
    currentStep = step;

    // Show/hide sections
    for (let i = 1; i <= totalSteps; i++) {
      const section = document.getElementById(`step-${i}`);
      const tab = document.querySelector(`.step-tab[data-step="${i}"]`);
      if (section) {
        section.classList.toggle('active', i === currentStep);
      }
      if (tab) {
        tab.classList.toggle('active', i === currentStep);
      }
    }

    // Toggle navigation buttons
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');

    if (btnPrev) btnPrev.style.display = currentStep > 1 ? 'inline-flex' : 'none';
    if (btnNext) btnNext.style.display = currentStep < totalSteps ? 'inline-flex' : 'none';
    if (btnSubmit) btnSubmit.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateProgress();
  }

  function validateStep(step) {
    if (step === 1) {
      const { department, role, experience, gender, degree } = state.demographics;
      if (!department || !role || !experience || !gender || !degree) {
        alert('Vui lòng hoàn thành đầy đủ thông tin phân loại nhân khẩu học để tiếp tục.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      // Must answer all questions in Groups A & B
      const missing = [];
      [...SURVEY_CONFIG.groups[0].questions, ...SURVEY_CONFIG.groups[1].questions].forEach(q => {
        if (!state.answers[q.id]) missing.push(q.id);
      });
      if (missing.length > 0) {
        alert(`Bạn còn ${missing.length} câu hỏi chưa trả lời trong phần này. Vui lòng chọn điểm đánh giá cho tất cả câu hỏi.`);
        const firstMissing = document.getElementById(`q-card-${missing[0]}`);
        if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
      return true;
    }

    if (step === 3) {
      // Must answer all questions in Groups C & D
      const missing = [];
      [...SURVEY_CONFIG.groups[2].questions, ...SURVEY_CONFIG.groups[3].questions].forEach(q => {
        if (!state.answers[q.id]) missing.push(q.id);
      });
      if (missing.length > 0) {
        alert(`Bạn còn ${missing.length} câu hỏi chưa trả lời trong phần này. Vui lòng chọn điểm đánh giá cho tất cả câu hỏi.`);
        const firstMissing = document.getElementById(`q-card-${missing[0]}`);
        if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
      return true;
    }

    if (step === 4) {
      // Must answer Group E and Overall score, commitment, eNPS
      const missingE = [];
      SURVEY_CONFIG.groups[4].questions.forEach(q => {
        if (!state.answers[q.id]) missingE.push(q.id);
      });
      if (missingE.length > 0) {
        alert(`Bạn còn ${missingE.length} câu hỏi trong Nhóm E chưa trả lời.`);
        const firstMissing = document.getElementById(`q-card-${missingE[0]}`);
        if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }

      if (state.overall.score === null) {
        alert('Vui lòng cho điểm đánh giá mức độ hài lòng chung đối với Bệnh viện (Thang điểm 1-10).');
        document.getElementById('q-card-overall-score')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }

      if (!state.overall.commitment) {
        alert('Vui lòng chọn dự định gắn bó với bệnh viện trong 3-5 năm tới.');
        document.getElementById('q-card-commitment')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }

      if (state.overall.enps === null) {
        alert('Vui lòng chọn mức độ sẵn lòng giới thiệu bệnh viện (Thang điểm 0-10).');
        document.getElementById('q-card-enps')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }

      return true;
    }

    return true;
  }

  function updateProgress() {
    let answered = 0;
    // Total questions: 5 demographics + 23 Likert + 3 required overall = 31 items
    const totalRequired = 5 + 23 + 3;

    if (state.demographics.department) answered++;
    if (state.demographics.role) answered++;
    if (state.demographics.experience) answered++;
    if (state.demographics.gender) answered++;
    if (state.demographics.degree) answered++;

    Object.keys(state.answers).forEach(k => {
      if (state.answers[k]) answered++;
    });

    if (state.overall.score !== null) answered++;
    if (state.overall.commitment) answered++;
    if (state.overall.enps !== null) answered++;

    const pct = Math.min(100, Math.round((answered / totalRequired) * 100));

    const fill = document.getElementById('progress-fill');
    const pctLabel = document.getElementById('progress-pct');
    if (fill) fill.style.width = `${pct}%`;
    if (pctLabel) pctLabel.innerText = `${pct}% hoàn thành (${answered}/${totalRequired} mục)`;
  }

  function saveDraft() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const statusEl = document.getElementById('draft-status');
      if (statusEl) {
        statusEl.innerHTML = `<span class="dot"></span> Tự động lưu nháp lúc ${timeStr}`;
      }
    } catch (e) {
      console.warn('Cannot save draft:', e);
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const loaded = JSON.parse(raw);
      if (loaded.demographics) Object.assign(state.demographics, loaded.demographics);
      if (loaded.answers) Object.assign(state.answers, loaded.answers);
      if (loaded.overall) Object.assign(state.overall, loaded.overall);

      // Populate UI with restored data
      if (state.demographics.department) {
        const el = document.getElementById('demo-dept');
        if (el) el.value = state.demographics.department;
      }
      if (state.demographics.role) {
        const el = document.getElementById('demo-role');
        if (el) el.value = state.demographics.role;
      }
      if (state.demographics.experience) {
        const el = document.getElementById('demo-exp');
        if (el) el.value = state.demographics.experience;
      }
      if (state.demographics.degree) {
        const el = document.getElementById('demo-degree');
        if (el) el.value = state.demographics.degree;
      }
      if (state.demographics.gender) {
        const radio = document.querySelector(`.radio-pill-label[data-gender="${state.demographics.gender}"]`);
        if (radio) radio.classList.add('active');
      }

      // Restore Likert buttons
      Object.keys(state.answers).forEach(qid => {
        const val = state.answers[qid];
        const btn = document.querySelector(`.likert-btn[data-qid="${qid}"][data-val="${val}"]`);
        if (btn) {
          btn.classList.add('active');
          document.getElementById(`q-card-${qid}`)?.classList.add('answered');
        }
      });

      // Restore overall
      if (state.overall.score !== null) {
        const btn = document.querySelector(`.scale-btn[data-type="overall-score"][data-val="${state.overall.score}"]`);
        if (btn) {
          btn.classList.add('active');
          document.getElementById('q-card-overall-score')?.classList.add('answered');
        }
      }
      if (state.overall.commitment) {
        const item = document.querySelector(`.commitment-item[data-val="${state.overall.commitment}"]`);
        if (item) {
          item.classList.add('active');
          document.getElementById('q-card-commitment')?.classList.add('answered');
        }
      }
      if (state.overall.enps !== null) {
        const btn = document.querySelector(`.scale-btn[data-type="enps"][data-val="${state.overall.enps}"]`);
        if (btn) {
          btn.classList.add('active');
          document.getElementById('q-card-enps')?.classList.add('answered');
        }
      }
      if (state.overall.suggestions) {
        const txt = document.getElementById('overall-suggestions');
        if (txt) txt.value = state.overall.suggestions;
      }
    } catch (e) {
      console.warn('Error loading draft:', e);
    }
  }

  async function submitSurvey() {
    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Đang gửi phiếu...';
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      const data = await res.json();

      if (data.success) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        showSuccessScreen(data.id);
      } else {
        alert(data.message || 'Có lỗi xảy ra khi gửi phiếu. Vui lòng thử lại.');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerText = 'Gửi Phiếu Khảo Sát';
        }
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!');
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Gửi Phiếu Khảo Sát';
      }
    }
  }

  function showSuccessScreen(receiptId) {
    // Hide form steps and bottom bar
    for (let i = 1; i <= totalSteps; i++) {
      const sec = document.getElementById(`step-${i}`);
      if (sec) sec.style.display = 'none';
    }
    const bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar) bottomBar.style.display = 'none';
    const progressSticky = document.querySelector('.progress-sticky-wrapper');
    if (progressSticky) progressSticky.style.display = 'none';

    // Show success view
    const successView = document.getElementById('success-view');
    if (successView) {
      successView.style.display = 'block';
      const receiptSpan = document.getElementById('receipt-id');
      if (receiptSpan) receiptSpan.innerText = receiptId;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
