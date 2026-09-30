const ReportStudio = {
  currentReportData: [],

  init(state) {
    this.setupDateDefaults();
    this.populateMemberFilter(state);
    this.attachEventListeners();
    this.generateReport();
    this.fetchSharePointFiles();
  },

  setupDateDefaults() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startInput = document.getElementById('filterStartDate');
    const endInput = document.getElementById('filterEndDate');
    
    if (startInput && !startInput.value) {
      startInput.value = firstDay.toISOString().split('T')[0];
    }
    if (endInput && !endInput.value) {
      endInput.value = today.toISOString().split('T')[0];
    }
  },

  populateMemberFilter(state) {
    const select = document.getElementById('filterMember');
    if (!select) return;

    select.innerHTML = '<option value="all">All Team Members</option>';
    (state.teamMembers || []).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });
  },

  attachEventListeners() {
    document.getElementById('btnGenerateReport')?.addEventListener('click', () => {
      this.generateReport();
    });

    document.getElementById('btnExportExcel')?.addEventListener('click', () => {
      this.exportExcel();
    });

    document.getElementById('btnUploadToSharePoint')?.addEventListener('click', () => {
      this.uploadToSharePoint();
    });

    document.getElementById('btnRefreshSpFiles')?.addEventListener('click', () => {
      this.fetchSharePointFiles();
    });
  },

  async generateReport() {
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    const memberId = document.getElementById('filterMember')?.value;
    const project = document.getElementById('filterProject')?.value;

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, memberId, project })
      });
      const data = await res.json();
      this.currentReportData = data.data || [];

      // Update Summary Cards
      document.getElementById('reportTotalHours').textContent = `${(data.summary.totalHours || 0).toFixed(1)} hrs`;
      document.getElementById('reportEntryCount').textContent = `${data.summary.entriesCount || 0} records`;
      
      const spFolder = App.state.settings.lineManagerSharePoint.documentLibraryFolder;
      document.getElementById('reportSpTargetFolder').textContent = spFolder;

      this.renderTable(this.currentReportData);
    } catch (err) {
      console.error('Error generating report:', err);
    }
  },

  renderTable(rows) {
    const tbody = document.getElementById('reportResultsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);">No time bookings match the selected filters.</td></tr>`;
      return;
    }

    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${r.date}</code></td>
        <td><strong>${r.userName}</strong></td>
        <td><span style="color:var(--primary); font-weight:600;">${r.project}</span></td>
        <td>${r.task}</td>
        <td><strong>${r.hours} hrs</strong></td>
        <td><span class="status-pill status-submitted">${r.status}</span></td>
        <td><small style="color:var(--text-dim);">${r.notes || '-'}</small></td>
      `;
      tbody.appendChild(tr);
    });
  },

  async exportExcel() {
    if (!this.currentReportData.length) {
      alert('Please generate a report first before exporting.');
      return;
    }

    try {
      const res = await fetch('/api/reports/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: this.currentReportData,
          reportTitle: `Team_Timesheet_Report_${new Date().toISOString().split('T')[0]}`
        })
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Team_Timesheet_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  },

  async uploadToSharePoint() {
    if (!this.currentReportData.length) {
      alert('Please generate a report first before uploading.');
      return;
    }

    const btn = document.getElementById('btnUploadToSharePoint');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading to SharePoint...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/reports/upload-sharepoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: this.currentReportData,
          reportTitle: `Sprint_Operations_Report_${new Date().toISOString().split('T')[0]}`
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Success! File "${data.fileName}" has been stored into Line Manager's SharePoint folder: "${data.folder}".`);
        this.fetchSharePointFiles();
      } else {
        alert(`SharePoint Upload Notice: ${data.message || 'Error occurred'}`);
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  async fetchSharePointFiles() {
    try {
      const res = await fetch('/api/reports/sharepoint-files');
      const files = await res.json();
      this.renderSharePointFiles(files);
      
      const spCountEl = document.getElementById('kpiSpCount');
      if (spCountEl) {
        spCountEl.textContent = `${files.length} Reports`;
      }
    } catch (err) {
      console.error('Error fetching SharePoint files:', err);
    }
  },

  renderSharePointFiles(files) {
    const tbody = document.getElementById('sharepointFilesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!files.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-dim);">No reports currently stored in this Line Manager's library folder.</td></tr>`;
      return;
    }

    files.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-file-excel" style="color:var(--accent-emerald);"></i>
            <strong>${f.name}</strong>
          </div>
        </td>
        <td>${f.size}</td>
        <td>${new Date(f.modified).toLocaleString()}</td>
        <td><code>${f.webUrl}</code></td>
        <td>
          <button class="btn btn-sm btn-outline btn-open-sp" data-path="${f.localPath}" data-url="${f.webUrl}">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-open-sp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        if (window.electronAPI) {
          window.electronAPI.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      });
    });
  }
};
