const Dashboard = {
  render(state) {
    this.updateKpis(state);
    this.renderManagerTeamBoard(state);
    this.renderRecentBookings(state);
  },

  updateKpis(state) {
    const bookings = state.timeBookings || [];
    const members = state.teamMembers || [];

    // 1. Total weekly hours logged by current user (or whole team if manager)
    let totalHours = 0;
    if (state.currentUser.role === 'line_manager') {
      totalHours = bookings.reduce((sum, b) => sum + (b.hours || 0), 0);
      document.getElementById('kpiTargetRate').textContent = `Team Total (All Members)`;
    } else {
      const userBookings = bookings.filter(b => b.userId === state.currentUser.id);
      totalHours = userBookings.reduce((sum, b) => sum + (b.hours || 0), 0);
      document.getElementById('kpiTargetRate').textContent = `Target: 40 hrs/wk (${Math.min(100, Math.round((totalHours / 40) * 100))}% reached)`;
    }
    document.getElementById('kpiWeeklyHours').textContent = `${totalHours.toFixed(1)} hrs`;

    // 2. Team compliance rate
    const nonManagerMembers = members.filter(m => m.role !== 'line_manager');
    const todayStr = new Date().toISOString().split('T')[0];
    const bookedTodayUserIds = new Set(
      bookings.filter(b => b.date === todayStr && b.hours > 0).map(b => b.userId)
    );
    const submittedCount = nonManagerMembers.filter(m => bookedTodayUserIds.has(m.id)).length;
    const rate = nonManagerMembers.length ? Math.round((submittedCount / nonManagerMembers.length) * 100) : 0;
    
    document.getElementById('kpiComplianceRate').textContent = `${rate}%`;
    document.getElementById('kpiComplianceSub').textContent = `${submittedCount} of ${nonManagerMembers.length} Booked Today`;

    // 3. Pending approvals
    const pending = bookings.filter(b => b.status === 'Submitted').length;
    document.getElementById('kpiPendingCount').textContent = pending;

    // 4. SharePoint Archive Count
    const spFolder = state.settings.lineManagerSharePoint.documentLibraryFolder;
    document.getElementById('spSidebarFolder').textContent = spFolder;
  },

  renderManagerTeamBoard(state) {
    const tbody = document.getElementById('teamStatusTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const members = state.teamMembers || [];
    const bookings = state.timeBookings || [];
    const todayStr = new Date().toISOString().split('T')[0];

    members.forEach(member => {
      const memberBookings = bookings.filter(b => b.userId === member.id);
      const todayBooking = memberBookings.find(b => b.date === todayStr);
      const totalSprintHours = memberBookings.reduce((sum, b) => sum + (b.hours || 0), 0);

      let statusBadge = '<span class="status-pill status-missing"><i class="fa-solid fa-circle-exclamation"></i> Missing</span>';
      let hoursText = '0.0 hrs';

      if (todayBooking) {
        hoursText = `${todayBooking.hours} hrs`;
        if (todayBooking.status === 'Approved') {
          statusBadge = '<span class="status-pill status-approved"><i class="fa-solid fa-check"></i> Approved</span>';
        } else if (todayBooking.status === 'Submitted') {
          statusBadge = '<span class="status-pill status-submitted"><i class="fa-solid fa-paper-plane"></i> Submitted</span>';
        } else {
          statusBadge = '<span class="status-pill status-draft"><i class="fa-solid fa-pen"></i> Draft</span>';
        }
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${member.avatar}" class="avatar" style="width:32px; height:32px;">
            <strong>${member.name}</strong>
          </div>
        </td>
        <td>${member.title}</td>
        <td>${hoursText}</td>
        <td><strong>${totalSprintHours.toFixed(1)} hrs</strong></td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline btn-row-nudge" data-email="${member.email}" data-name="${member.name}">
            <i class="fa-solid fa-bell"></i> Nudge
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach row nudge buttons
    document.querySelectorAll('.btn-row-nudge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetEmail = e.currentTarget.getAttribute('data-email');
        const targetName = e.currentTarget.getAttribute('data-name');
        App.openNudgeModal(targetEmail, targetName);
      });
    });
  },

  renderRecentBookings(state) {
    const tbody = document.getElementById('recentBookingsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const bookings = (state.timeBookings || []).slice(0, 8);
    bookings.forEach(b => {
      let statusClass = 'status-submitted';
      if (b.status === 'Approved') statusClass = 'status-approved';
      if (b.status === 'Draft') statusClass = 'status-draft';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${b.date}</code></td>
        <td><strong>${b.userName}</strong></td>
        <td><span style="color:var(--primary); font-weight:600;">${b.project}</span></td>
        <td>
          <div>${b.task}</div>
          <small style="color:var(--text-dim);">${b.notes || ''}</small>
        </td>
        <td><strong>${b.hours} hrs</strong></td>
        <td><span class="status-pill ${statusClass}">${b.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }
};
