const App = {
  state: null,

  async init() {
    console.log('[App] Initializing Team Operations Hub...');
    await this.loadState();
    this.setupNavigation();
    this.setupModals();
    this.setupPersonaSwitcher();
    this.setupBookTimeForm();

    // Initialize feature modules
    Dashboard.render(this.state);
    ReportStudio.init(this.state);
    Notifications.init(this.state);
    Settings.init(this.state);
  },

  async loadState() {
    try {
      const res = await fetch('/api/state');
      this.state = await res.json();
      this.updateUserCard(this.state.currentUser);
    } catch (err) {
      console.error('Failed to load application state:', err);
    }
  },

  updateUserCard(user) {
    if (!user) return;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').src = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
    
    const roleBadge = document.getElementById('userRole');
    if (user.role === 'line_manager') {
      roleBadge.textContent = 'Line Manager';
      roleBadge.style.color = '#10b981';
      roleBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      document.getElementById('managerTeamBoardCard').style.display = 'block';
    } else {
      roleBadge.textContent = 'Team Member';
      roleBadge.style.color = '#38bdf8';
      roleBadge.style.background = 'rgba(56, 189, 248, 0.15)';
      // Member can still view status board or focus on their bookings
    }
  },

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const tab = item.getAttribute('data-tab');
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        const targetPane = document.getElementById(`tab-${tab}`);
        if (targetPane) targetPane.classList.add('active');

        // Update titles
        const titles = {
          dashboard: { title: 'Operations Dashboard', sub: 'Real-time team time booking, approvals & SharePoint sync' },
          reports: { title: 'Report Studio', sub: 'Custom reports, Excel export and Line Manager SharePoint storage' },
          notifications: { title: 'Team Push Notifications', sub: 'Real-time time booking nudges and manager announcements' },
          sharepoint: { title: 'Line Manager SharePoint Hub', sub: 'Team document libraries and synchronized timesheet reports' },
          settings: { title: 'Configuration & Single Sign-On', sub: 'Configure Microsoft Entra ID (SSO) and team SharePoint links' }
        };

        if (titles[tab]) {
          document.getElementById('pageTitle').textContent = titles[tab].title;
          document.getElementById('pageSubtitle').textContent = titles[tab].sub;
        }
      });
    });

    // Topbar bell click opens notifications tab
    document.getElementById('topbarBell')?.addEventListener('click', () => {
      document.querySelector('.nav-item[data-tab="notifications"]')?.click();
    });
  },

  setupModals() {
    // Book Time Modal
    const modalBook = document.getElementById('modalBookTime');
    document.getElementById('btnBookTimeModal')?.addEventListener('click', () => {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('bookDate').value = today;
      modalBook.classList.add('open');
    });
    document.getElementById('btnCloseBookTime')?.addEventListener('click', () => modalBook.classList.remove('open'));
    document.getElementById('btnCancelBookTime')?.addEventListener('click', () => modalBook.classList.remove('open'));

    // Nudge Modal
    const modalNudge = document.getElementById('modalNudge');
    document.getElementById('btnNudgeModal')?.addEventListener('click', () => {
      this.openNudgeModal('all', 'Entire Team');
    });
    document.getElementById('btnNudgeAllMissing')?.addEventListener('click', () => {
      this.openNudgeModal('all', 'All Team Members with Missing Bookings');
    });
    document.getElementById('btnCloseNudge')?.addEventListener('click', () => modalNudge.classList.remove('open'));
    document.getElementById('btnCancelNudge')?.addEventListener('click', () => modalNudge.classList.remove('open'));

    // Refresh bookings button
    document.getElementById('btnRefreshBookings')?.addEventListener('click', async () => {
      await this.loadState();
      Dashboard.render(this.state);
    });
  },

  openNudgeModal(targetEmail, targetName) {
    const modalNudge = document.getElementById('modalNudge');
    const select = document.getElementById('nudgeTarget');
    select.innerHTML = '<option value="all">Entire Team Under Line Manager</option>';

    (this.state.teamMembers || []).forEach(m => {
      if (m.role !== 'line_manager') {
        const opt = document.createElement('option');
        opt.value = m.email;
        opt.textContent = `${m.name} (${m.email})`;
        if (m.email === targetEmail) opt.selected = true;
        select.appendChild(opt);
      }
    });

    if (targetEmail === 'all') {
      select.value = 'all';
    }

    modalNudge.classList.add('open');
  },

  setupPersonaSwitcher() {
    const selector = document.getElementById('personaSelector');
    if (!selector) return;

    selector.addEventListener('change', async (e) => {
      const userId = e.target.value;
      try {
        const res = await fetch('/api/sso/switch-persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const data = await res.json();
        if (data.success) {
          this.state.currentUser = data.user;
          this.updateUserCard(data.user);
          Dashboard.render(this.state);
          // Re-register socket with new persona
          Notifications.setupSocket(data.user);
        }
      } catch (err) {
        console.error('Error switching persona:', err);
      }
    });
  },

  setupBookTimeForm() {
    document.getElementById('formBookTime')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const project = document.getElementById('bookProject').value;
      const date = document.getElementById('bookDate').value;
      const hours = parseFloat(document.getElementById('bookHours').value);
      const task = document.getElementById('bookTask').value;
      const notes = document.getElementById('bookNotes').value;

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project, date, hours, task, notes })
        });

        const data = await res.json();
        if (data.success) {
          document.getElementById('modalBookTime').classList.remove('open');
          document.getElementById('bookTask').value = '';
          document.getElementById('bookNotes').value = '';

          await this.loadState();
          Dashboard.render(this.state);
          ReportStudio.generateReport();
          alert('Time booking submitted successfully!');
        }
      } catch (err) {
        alert('Error submitting time booking: ' + err.message);
      }
    });
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
