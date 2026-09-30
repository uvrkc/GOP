const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const XLSX = require('xlsx');

const store = require('./store');
const ssoAuth = require('./sso-auth');
const sharepointService = require('./sharepoint-service');
const notificationService = require('./notification-service');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

notificationService.initNotificationService(io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../src')));

// --- API ROUTES ---

// 1. Get entire app state
app.get('/api/state', (req, res) => {
  res.json(store.getState());
});

// 2. SSO Endpoints
app.get('/api/sso/auth-url', async (req, res) => {
  try {
    const data = await ssoAuth.getAuthUrl();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sso/switch-persona', (req, res) => {
  const { userId } = req.body;
  const user = ssoAuth.switchMockPersona(userId);
  res.json({ success: true, user });
});

app.post('/api/sso/token', async (req, res) => {
  const { code } = req.body;
  try {
    const user = await ssoAuth.acquireTokenByCode(code);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Time Booking Endpoints
app.get('/api/bookings', (req, res) => {
  const state = store.getState();
  res.json(state.timeBookings);
});

app.post('/api/bookings', (req, res) => {
  const entry = store.addTimeBooking(req.body);

  // Notify manager
  notificationService.handleTimeRequest({
    senderName: entry.userName,
    senderEmail: entry.userId,
    lineManagerEmail: entry.lineManagerEmail,
    title: 'Time Booking Logged',
    message: `${entry.hours}h logged on ${entry.project}`,
    hours: entry.hours,
    project: entry.project
  });

  res.json({ success: true, entry });
});

// 4. Report Studio Endpoints
app.post('/api/reports/generate', (req, res) => {
  const { startDate, endDate, project, memberId } = req.body;
  const state = store.getState();
  let bookings = state.timeBookings;

  if (startDate) {
    bookings = bookings.filter(b => b.date >= startDate);
  }
  if (endDate) {
    bookings = bookings.filter(b => b.date <= endDate);
  }
  if (project && project !== 'all') {
    bookings = bookings.filter(b => b.project === project);
  }
  if (memberId && memberId !== 'all') {
    bookings = bookings.filter(b => b.userId === memberId);
  }

  const totalHours = bookings.reduce((sum, b) => sum + (b.hours || 0), 0);
  const byProject = {};
  bookings.forEach(b => {
    byProject[b.project] = (byProject[b.project] || 0) + b.hours;
  });

  res.json({
    summary: {
      totalHours,
      entriesCount: bookings.length,
      byProject
    },
    data: bookings
  });
});

app.post('/api/reports/export-excel', (req, res) => {
  const { rows, reportTitle } = req.body;
  const exportData = (rows || []).map(r => ({
    'Date': r.date,
    'Team Member': r.userName,
    'Project': r.project,
    'Task Description': r.task,
    'Hours': r.hours,
    'Status': r.status,
    'Notes': r.notes
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'TimeBookings');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const fileName = `${(reportTitle || 'Team_Operations_Report').replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.post('/api/reports/upload-sharepoint', async (req, res) => {
  const { rows, reportTitle } = req.body;
  const state = store.getState();

  const exportData = (rows || []).map(r => ({
    'Date': r.date,
    'Team Member': r.userName,
    'Project': r.project,
    'Task Description': r.task,
    'Hours': r.hours,
    'Status': r.status,
    'Notes': r.notes
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'TimeBookings');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const fileName = `${(reportTitle || 'Team_Operations_Report').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

  try {
    const result = await sharepointService.uploadReportToSharePoint({
      fileName,
      buffer,
      managerEmail: state.settings.lineManagerSharePoint.managerEmail
    });

    // Notify team/manager about the new report
    notificationService.handleTeamNudge({
      senderName: state.currentUser.name,
      senderEmail: state.currentUser.email,
      targetEmail: state.settings.lineManagerSharePoint.managerEmail,
      title: 'Report Saved to SharePoint',
      message: `File ${fileName} was saved to team library "${result.folder}".`
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/sharepoint-files', (req, res) => {
  const files = sharepointService.listSharePointReports();
  res.json(files);
});

// 5. Notification Endpoints
app.post('/api/notifications/nudge', (req, res) => {
  const notif = notificationService.handleTeamNudge(req.body);
  res.json({ success: true, notif });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const notifs = store.markNotificationAsRead(req.body.id);
  res.json({ success: true, notifications: notifs });
});

// 6. Settings Endpoints
app.post('/api/settings', (req, res) => {
  const updated = store.updateSettings(req.body);
  notificationService.setupAutomatedSchedules();
  res.json({ success: true, settings: updated });
});

const PORT = process.env.PORT || 49152;

function startServer(callback) {
  server.listen(PORT, () => {
    console.log(`[Server] Enterprise Team Operations Hub backend running at http://localhost:${PORT}`);
    if (callback) callback(PORT);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer, PORT };
