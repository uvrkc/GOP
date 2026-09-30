const cron = require('node-cron');
const { getState, addNotification } = require('./store');

let ioInstance = null;
let cronJobs = [];

function initNotificationService(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Join team rooms based on user & manager email
    socket.on('register-client', (userData) => {
      if (!userData) return;
      socket.join(`user_${userData.email}`);
      if (userData.lineManagerEmail) {
        socket.join(`team_${userData.lineManagerEmail}`);
      }
      if (userData.role === 'line_manager') {
        socket.join(`manager_${userData.email}`);
      }
      console.log(`[Socket] Registered ${userData.email} (${userData.role}) to rooms.`);
    });

    // Manager sending targeted nudge or team broadcast
    socket.on('send-team-nudge', (payload) => {
      handleTeamNudge(payload);
    });

    // Member sending time booking submission / request to manager
    socket.on('submit-time-request', (payload) => {
      handleTimeRequest(payload);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  setupAutomatedSchedules();
}

function handleTeamNudge(payload) {
  const { senderName, senderEmail, targetEmail, title, message } = payload;
  const notif = addNotification({
    senderName,
    senderEmail,
    targetEmail,
    title: title || 'Time Booking Action Required',
    message,
    category: 'reminder'
  });

  if (targetEmail === 'all') {
    // Broadcast to entire team under this manager
    ioInstance.to(`team_${senderEmail}`).emit('push-notification', notif);
  } else {
    // Send to specific member
    ioInstance.to(`user_${targetEmail}`).emit('push-notification', notif);
  }

  return notif;
}

function handleTimeRequest(payload) {
  const { senderName, senderEmail, lineManagerEmail, title, message, hours, project } = payload;
  const notif = addNotification({
    senderName,
    senderEmail,
    targetEmail: lineManagerEmail,
    title: title || 'Time Booking Submitted',
    message: `${senderName} logged ${hours}h for ${project}: "${message}"`,
    category: 'request'
  });

  // Notify the manager
  ioInstance.to(`manager_${lineManagerEmail}`).emit('push-notification', notif);
  return notif;
}

function setupAutomatedSchedules() {
  // Clear any existing jobs
  cronJobs.forEach(job => job.stop());
  cronJobs = [];

  const state = getState();
  const notifConfig = state.settings.notifications;
  if (!notifConfig.enableDesktopPush) return;

  // 1. Daily End-of-Day Check (Default 16:30 / 4:30 PM, Monday to Friday)
  const dailyJob = cron.schedule('30 16 * * 1-5', () => {
    console.log('[Cron] Triggering daily time booking reminder...');
    if (ioInstance) {
      const notif = addNotification({
        senderName: 'System Automation',
        senderEmail: 'system@company.com',
        targetEmail: 'all',
        title: 'Daily Timesheet Reminder',
        message: 'Friendly reminder to log your daily project hours before clocking out.',
        category: 'reminder'
      });
      ioInstance.emit('push-notification', notif);
    }
  });
  cronJobs.push(dailyJob);

  // 2. Friday sprint deadline check (Default 15:00 / 3:00 PM)
  const fridayJob = cron.schedule('0 15 * * 5', () => {
    console.log('[Cron] Triggering Friday weekly deadline reminder...');
    if (ioInstance) {
      const notif = addNotification({
        senderName: 'Line Manager Automation',
        senderEmail: 'system@company.com',
        targetEmail: 'all',
        title: 'Sprint Time Closure Approaching',
        message: 'Please review and submit all weekly hours for Line Manager approval by 5:00 PM.',
        category: 'reminder'
      });
      ioInstance.emit('push-notification', notif);
    }
  });
  cronJobs.push(fridayJob);
}

module.exports = {
  initNotificationService,
  handleTeamNudge,
  handleTimeRequest,
  setupAutomatedSchedules
};
