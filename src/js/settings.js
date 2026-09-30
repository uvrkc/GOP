const Settings = {
  init(state) {
    this.populateForm(state.settings);
    this.attachEventListeners();
  },

  populateForm(settings) {
    if (!settings) return;

    document.getElementById('cfgAuthMode').value = settings.authMode || 'mock';
    document.getElementById('cfgTenantId').value = settings.azureTenantId || '';
    document.getElementById('cfgClientId').value = settings.azureClientId || '';
    document.getElementById('cfgRedirectUri').value = settings.azureRedirectUri || 'http://localhost:49152/auth/callback';

    const sp = settings.lineManagerSharePoint || {};
    document.getElementById('cfgManagerEmail').value = sp.managerEmail || '';
    document.getElementById('cfgSiteUrl').value = sp.siteUrl || '';
    document.getElementById('cfgDocFolder').value = sp.documentLibraryFolder || '';

    // Update banner texts
    document.getElementById('spManagerName').textContent = sp.managerName || sp.managerEmail;
    document.getElementById('spSiteUrlText').textContent = sp.siteUrl || '-';
    document.getElementById('spTargetFolderText').textContent = sp.documentLibraryFolder || '-';
  },

  attachEventListeners() {
    document.getElementById('btnSaveSettings')?.addEventListener('click', async () => {
      const authMode = document.getElementById('cfgAuthMode').value;
      const azureTenantId = document.getElementById('cfgTenantId').value.trim();
      const azureClientId = document.getElementById('cfgClientId').value.trim();
      const managerEmail = document.getElementById('cfgManagerEmail').value.trim();
      const siteUrl = document.getElementById('cfgSiteUrl').value.trim();
      const docFolder = document.getElementById('cfgDocFolder').value.trim();
      const desktopPush = document.getElementById('cfgDesktopPush').checked;

      const payload = {
        authMode,
        azureTenantId,
        azureClientId,
        lineManagerSharePoint: {
          managerEmail,
          siteUrl,
          documentLibraryFolder: docFolder
        },
        notifications: {
          enableDesktopPush: desktopPush
        }
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          App.state.settings = data.settings;
          Settings.populateForm(data.settings);
          document.getElementById('spSidebarFolder').textContent = docFolder;
          alert('Settings successfully updated!');
        }
      } catch (err) {
        alert('Failed to save settings: ' + err.message);
      }
    });

    document.getElementById('btnTestSsoLogin')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/sso/auth-url');
        const data = await res.json();
        if (data.mode === 'mock') {
          alert('Current mode: Local/Mock SSO. Switch personas instantly in the top bar dropdown or configure Azure Client ID/Tenant ID in the form above.');
        } else if (data.url) {
          if (window.electronAPI) {
            window.electronAPI.openExternal(data.url);
          } else {
            window.open(data.url, '_blank');
          }
        }
      } catch (err) {
        alert('SSO Error: ' + err.message);
      }
    });
  }
};
