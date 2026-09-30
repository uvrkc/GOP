const Notifications = {
  socket: null,

  init(state) {
    this.renderList(state.notifications || []);
    this.setupSocket(state.currentUser);
    this.attachEventListeners();
  },

  setupSocket(user) {
    if (typeof io === 'undefined') return;

    this.socket = io();

    this.socket.on('connect', () => {
      console.log('[Client] Connected to real-time notification socket');
      this.socket.emit('register-client', {
        email: user.email,
        role: user.role,
        lineManagerEmail: user.lineManagerEmail
      });
    });

    this.socket.on('push-notification', (notif) => {
      console.log('[Client] Received push notification:', notif);
      this.handleIncomingPush(notif);
    });
  },

  handleIncomingPush(notif) {
    // 1. Add to in-memory notifications list
    if (App.state && App.state.notifications) {
      App.state.notifications.unshift(notif);
    }

    // 2. Re-render UI list
    this.renderList(App.state.notifications);

    // 3. Trigger Native Windows Action Center Push Notification
    if (window.electronAPI && window.electronAPI.showNotification) {
      window.electronAPI.showNotification(
        notif.title || 'Team Operations Hub',
        `${notif.senderName}: ${notif.message}`,
        notif.category
      );
    } else if (Notification.permission === 'granted') {
      new Notification(notif.title, { body: `${notif.senderName}: ${notif.message}` });
    }
  },

  renderList(notifications) {
    const container = document.getElementById('notificationList');
    if (!container) return;
    container.innerHTML = '';

    const unreadCount = (notifications || []).filter(n => !n.read).length;
    this.updateBadges(unreadCount);

    if (!notifications.length) {
      container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-dim);">No notifications in feed.</div>`;
      return;
    }

    notifications.forEach(n => {
      let iconColor = 'icon-blue';
      let iconClass = 'fa-solid fa-bell';
      if (n.category === 'reminder') {
        iconColor = 'icon-amber';
        iconClass = 'fa-solid fa-clock-rotate-left';
      } else if (n.category === 'request') {
        iconColor = 'icon-emerald';
        iconClass = 'fa-solid fa-file-circle-check';
      }

      const item = document.createElement('div');
      item.className = `notif-item ${!n.read ? 'unread' : ''}`;
      item.innerHTML = `
        <div class="notif-icon ${iconColor}">
          <i class="${iconClass}"></i>
        </div>
        <div class="notif-content">
          <div class="notif-header">
            <span class="notif-title">${n.title}</span>
            <span class="notif-time">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p class="notif-body">${n.message}</p>
          <span class="notif-sender"><i class="fa-solid fa-user-circle"></i> From: ${n.senderName} (${n.senderEmail})</span>
        </div>
      `;

      item.addEventListener('click', () => {
        this.markAsRead(n.id);
      });

      container.appendChild(item);
    });
  },

  updateBadges(count) {
    const navBadge = document.getElementById('navNotifBadge');
    const bellBadge = document.getElementById('bellCounter');

    if (navBadge) {
      navBadge.textContent = count;
      navBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (bellBadge) {
      bellBadge.textContent = count;
      bellBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  async markAsRead(id) {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success && App.state) {
        App.state.notifications = data.notifications;
        this.renderList(data.notifications);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  },

  attachEventListeners() {
    document.getElementById('btnTestNativePush')?.addEventListener('click', () => {
      const testTitle = 'Windows Desktop Push Test';
      const testBody = 'Your Team Operations Hub desktop alerts are active and running in background.';

      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification(testTitle, testBody, 'info');
      } else {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') new Notification(testTitle, { body: testBody });
          });
        } else if (Notification.permission === 'granted') {
          new Notification(testTitle, { body: testBody });
        } else {
          alert('Notification: ' + testBody);
        }
      }
    });

    // Handle Nudge Form submission
    document.getElementById('formNudge')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetEmail = document.getElementById('nudgeTarget').value;
      const title = document.getElementById('nudgeTitle').value;
      const message = document.getElementById('nudgeMessage').value;

      try {
        const res = await fetch('/api/notifications/nudge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderName: App.state.currentUser.name,
            senderEmail: App.state.currentUser.email,
            targetEmail: targetEmail,
            title: title,
            message: message
          })
        });

        const data = await res.json();
        if (data.success) {
          document.getElementById('modalNudge').classList.remove('open');
          alert('Push notification sent successfully to team members!');
        }
      } catch (err) {
        alert('Error sending nudge: ' + err.message);
      }
    });
  }
};
