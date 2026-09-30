# Enterprise Team Operations Hub 🚀

> **Independent Desktop Application** with Single Sign-On (Microsoft Entra ID / Azure AD SSO), Line Manager SharePoint Document Integration, Interactive Report Studio, and Native Windows Push Notifications for Time Booking.

---

## 🌟 Key Capabilities

### 1. Single Sign-On (SSO)
- Native Microsoft Entra ID (Azure AD / Office 365) authentication using **MSAL (`@azure/msal-node`)** with Proof Key for Code Exchange (PKCE).
- Built-in **Dev / Mock Persona Switcher**: Test as Line Manager (*Sarah Jenkins*) or Team Member (*Alex Rivera*, *Priya Patel*) without needing active Azure credentials right away.

### 2. Line Manager Team SharePoint Configuration
- Every Line Manager has their own dedicated SharePoint Site and Document Library path configured (e.g., `https://company.sharepoint.com/sites/Global-Operations/TeamReports/WeeklyTimesheets`).
- In **Report Studio**, one click generates and saves `.xlsx` reports directly to the Line Manager’s SharePoint folder via **Microsoft Graph API**.

### 3. Dashboard & Time Booking
- **KPI Metrics**: Real-time team compliance %, sprint hours logged vs. 40h target, pending approvals, and SharePoint archive counts.
- **Line Manager Team Board**: Displays all team members reporting to this Line Manager, their daily booking status (Approved, Submitted, Missing), and instant "Nudge" triggers.
- **Quick Booking Logger**: Fast submission for project hours, tasks, and notes.

### 4. Real-Time Team Push Notifications
- Native **Windows Action Center / Desktop Notifications** via Electron's `Notification` API.
- **Manager-to-Team**: Nudge individual members or broadcast to the entire team (e.g., *"Please submit today's hours before 5:00 PM"*).
- **Member-to-Manager**: Instant desktop alert whenever a member submits a timesheet.
- **Automated Cron Jobs**: Scheduled end-of-day reminders (4:30 PM) and Friday sprint closure reminders (3:00 PM).

---

## 📂 Architecture & Directory Structure

```
enterprise-team-hub/
├── package.json                 # Independent dependencies & electron-builder config
├── main.js                      # Electron main process (tray, native Windows notifications, IPC)
├── preload.js                   # Secure contextBridge IPC bridge
├── README.md                    # Setup & deployment manual
├── server/
│   ├── server.js                # Local Express REST API & Socket.io server
│   ├── sso-auth.js              # Microsoft Entra ID MSAL SSO flow + Mock SSO fallback
│   ├── sharepoint-service.js    # Microsoft Graph API client for SharePoint document libraries
│   ├── notification-service.js  # Real-time notification broadcaster & cron scheduler
│   └── store.js                 # Persistent local JSON data store (state, team, bookings, settings)
└── src/
    ├── index.html               # Modern desktop GUI layout (Dashboard, Report Studio, Alerts, Settings)
    ├── css/
    │   └── styles.css           # Premium enterprise dark theme with Glassmorphism
    └── js/
        ├── app.js               # Application coordinator & tab navigation
        ├── dashboard.js         # KPIs, Manager Team Board, and Recent Bookings
        ├── report-studio.js     # Custom date/project filters, Excel export, SharePoint uploads
        ├── notifications.js     # Push notification receiver, tray badges, nudge modal
        └── settings.js          # Line Manager SharePoint & Azure AD config management
```

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies
Navigate into the `enterprise-team-hub` directory:
```bash
cd enterprise-team-hub
npm install
```

### Step 2: Run in Development Mode
You can launch the full desktop application:
```bash
npm start
```
Or run just the local web server to test in your browser at `http://localhost:49152`:
```bash
npm run server
```

---

## 🏢 Deploying on Your Company Laptop

### 1. Moving to Company Laptop
You can copy the entire `enterprise-team-hub` folder directly onto your company laptop or open it as a separate workspace in your IDE (`File` -> `Open Folder...`). It is 100% self-contained and does not depend on any outside files.

### 2. Packaging as a Windows `.exe` Installer
To generate a standalone Windows installer (`.exe`) that employees can double-click to install:
```bash
npm run build:win
```
This produces an installer inside the `dist/` directory:
```
dist/Team Operations Hub Setup 1.0.0.exe
```

### 3. Configuring Live Azure AD SSO (In Company Tenant)
1. In the **Azure Portal**, go to **Microsoft Entra ID** $\rightarrow$ **App registrations** $\rightarrow$ **New registration**.
2. **Redirect URI**: Select **Public client/native (mobile & desktop)** or Web with `http://localhost:49152/auth/callback`.
3. **API Permissions**: Add Delegated permissions for **Microsoft Graph**:
   - `User.Read`
   - `Files.ReadWrite`
   - `Sites.ReadWrite.All`
4. Copy the **Application (Client) ID** and **Directory (Tenant) ID** into the app's **Config & SSO** tab, and toggle Authentication Mode to **Live Microsoft Entra ID**.

### 4. Configuring Team SharePoint for Each Line Manager
In the **Config & SSO** tab:
1. Enter the **Line Manager's Email** (e.g. `manager.ops@company.com`).
2. Enter the **Team SharePoint Site URL** (e.g. `https://yourcompany.sharepoint.com/sites/Team-Operations`).
3. Enter the **Document Library Folder** (e.g. `TeamReports/WeeklyTimesheets`).
4. Click **Save Configuration**.

All timesheet reports exported from the **Report Studio** will now automatically stream directly into that specific Line Manager's SharePoint team library!
