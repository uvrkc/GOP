const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'app_state.json');

const DEFAULT_STATE = {
  settings: {
    authMode: 'mock', // 'mock' (for dev/offline testing) or 'azure-sso'
    azureTenantId: '',
    azureClientId: '',
    azureRedirectUri: 'http://localhost:49152/auth/callback',
    // SharePoint Configuration per Line Manager
    lineManagerSharePoint: {
      managerEmail: 'manager.ops@company.com',
      managerName: 'Sarah Jenkins (Ops Lead)',
      siteUrl: 'https://company.sharepoint.com/sites/Global-Operations',
      siteId: '',
      driveId: '',
      documentLibraryFolder: 'TeamReports/WeeklyTimesheets',
      autoSyncReports: true
    },
    // Notification schedule config
    notifications: {
      enableDesktopPush: true,
      enableSound: true,
      dailyReminderTime: '16:30', // 4:30 PM
      fridayDeadlineTime: '15:00', // 3:00 PM
      allowManagerNudges: true
    }
  },
  currentUser: {
    id: 'user_001',
    name: 'Alex Rivera',
    email: 'alex.rivera@company.com',
    role: 'line_manager', // 'line_manager' or 'team_member'
    lineManagerEmail: 'manager.ops@company.com',
    department: 'Digital Operations & Infrastructure',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
  },
  teamMembers: [
    {
      id: 'user_001',
      name: 'Sarah Jenkins',
      email: 'manager.ops@company.com',
      role: 'line_manager',
      lineManagerEmail: 'vp.operations@company.com',
      title: 'Operations Line Manager',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'user_002',
      name: 'Alex Rivera',
      email: 'alex.rivera@company.com',
      role: 'team_member',
      lineManagerEmail: 'manager.ops@company.com',
      title: 'Senior Systems Specialist',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'user_003',
      name: 'Priya Patel',
      email: 'priya.patel@company.com',
      role: 'team_member',
      lineManagerEmail: 'manager.ops@company.com',
      title: 'Process Automation Engineer',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'user_004',
      name: 'Marcus Vance',
      email: 'marcus.vance@company.com',
      role: 'team_member',
      lineManagerEmail: 'manager.ops@company.com',
      title: 'Cloud Infrastructure Associate',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'user_005',
      name: 'Elena Rostova',
      email: 'elena.rostova@company.com',
      role: 'team_member',
      lineManagerEmail: 'manager.ops@company.com',
      title: 'Quality & Compliance Analyst',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80'
    }
  ],
  timeBookings: [
    {
      id: 'tb_101',
      userId: 'user_002',
      userName: 'Alex Rivera',
      lineManagerEmail: 'manager.ops@company.com',
      date: new Date().toISOString().split('T')[0],
      project: 'PRJ-801 Core Migration',
      task: 'Database cluster failover configuration',
      hours: 7.5,
      status: 'Approved',
      notes: 'Completed automated failover tests with staging nodes.'
    },
    {
      id: 'tb_102',
      userId: 'user_003',
      userName: 'Priya Patel',
      lineManagerEmail: 'manager.ops@company.com',
      date: new Date().toISOString().split('T')[0],
      project: 'PRJ-802 RPA Workflows',
      task: 'SAP invoice extraction bot update',
      hours: 8.0,
      status: 'Submitted',
      notes: 'Updated field selectors for latest portal patch.'
    },
    {
      id: 'tb_103',
      userId: 'user_004',
      userName: 'Marcus Vance',
      lineManagerEmail: 'manager.ops@company.com',
      date: new Date().toISOString().split('T')[0],
      project: 'PRJ-803 Security Audit',
      task: 'Access reviews for cloud buckets',
      hours: 4.0,
      status: 'Draft',
      notes: 'In progress, need clarification on shared drives.'
    }
  ],
  notifications: [
    {
      id: 'notif_001',
      senderName: 'Sarah Jenkins (Line Manager)',
      senderEmail: 'manager.ops@company.com',
      targetEmail: 'all',
      title: 'Weekly Time Booking Reminder',
      message: 'Kindly submit all project hours for this sprint by 4:00 PM today.',
      category: 'reminder',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false
    },
    {
      id: 'notif_002',
      senderName: 'Priya Patel',
      senderEmail: 'priya.patel@company.com',
      targetEmail: 'manager.ops@company.com',
      title: 'Timesheet Submitted for Approval',
      message: 'Submitted 40.0 hours for Project RPA Workflows.',
      category: 'request',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      read: true
    }
  ]
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2), 'utf-8');
  }
}

function getState() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading app state, reinitializing default:', err);
    return DEFAULT_STATE;
  }
}

function saveState(newState) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(newState, null, 2), 'utf-8');
}

function updateSettings(patch) {
  const state = getState();
  state.settings = { ...state.settings, ...patch };
  if (patch.lineManagerSharePoint) {
    state.settings.lineManagerSharePoint = {
      ...state.settings.lineManagerSharePoint,
      ...patch.lineManagerSharePoint
    };
  }
  saveState(state);
  return state.settings;
}

function addTimeBooking(entry) {
  const state = getState();
  const newEntry = {
    id: 'tb_' + Date.now(),
    date: entry.date || new Date().toISOString().split('T')[0],
    userId: entry.userId || state.currentUser.id,
    userName: entry.userName || state.currentUser.name,
    lineManagerEmail: entry.lineManagerEmail || state.currentUser.lineManagerEmail,
    project: entry.project,
    task: entry.task,
    hours: parseFloat(entry.hours) || 0,
    status: entry.status || 'Submitted',
    notes: entry.notes || ''
  };
  state.timeBookings.unshift(newEntry);
  saveState(state);
  return newEntry;
}

function addNotification(notif) {
  const state = getState();
  const item = {
    id: 'notif_' + Date.now(),
    senderName: notif.senderName || state.currentUser.name,
    senderEmail: notif.senderEmail || state.currentUser.email,
    targetEmail: notif.targetEmail || 'all',
    title: notif.title || 'Notification',
    message: notif.message,
    category: notif.category || 'general',
    timestamp: new Date().toISOString(),
    read: false
  };
  state.notifications.unshift(item);
  saveState(state);
  return item;
}

function markNotificationAsRead(id) {
  const state = getState();
  const found = state.notifications.find(n => n.id === id);
  if (found) {
    found.read = true;
    saveState(state);
  }
  return state.notifications;
}

module.exports = {
  getState,
  saveState,
  updateSettings,
  addTimeBooking,
  addNotification,
  markNotificationAsRead
};
