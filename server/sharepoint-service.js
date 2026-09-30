const fs = require('fs');
const path = require('path');
const { getState } = require('./store');
let graph = null;
try {
  graph = require('@microsoft/microsoft-graph-client');
  require('isomorphic-fetch');
} catch (e) {
  // handled in runtime
}

const LOCAL_SP_STORAGE = path.join(__dirname, '../data/sharepoint_storage');

function ensureLocalStorage() {
  if (!fs.existsSync(LOCAL_SP_STORAGE)) {
    fs.mkdirSync(LOCAL_SP_STORAGE, { recursive: true });
  }
}

async function uploadReportToSharePoint({ fileName, buffer, managerEmail }) {
  const state = getState();
  const spConfig = state.settings.lineManagerSharePoint;
  const isMock = state.settings.authMode === 'mock' || !state.currentUser.accessToken;

  if (isMock) {
    // Simulated SharePoint Upload for local development & testing
    ensureLocalStorage();
    const folderName = (spConfig.documentLibraryFolder || 'TeamReports').replace(/[\\/]/g, '_');
    const targetFolder = path.join(LOCAL_SP_STORAGE, folderName);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const localFilePath = path.join(targetFolder, fileName);
    fs.writeFileSync(localFilePath, buffer);

    return {
      success: true,
      mode: 'mock',
      fileName: fileName,
      localFilePath: localFilePath,
      sharePointUrl: `${spConfig.siteUrl}/${spConfig.documentLibraryFolder}/${fileName}`,
      folder: spConfig.documentLibraryFolder,
      managerEmail: spConfig.managerEmail,
      message: `Report successfully uploaded to Line Manager SharePoint library (${spConfig.documentLibraryFolder})`
    };
  }

  // Live Microsoft Graph API implementation
  try {
    const client = graph.Client.init({
      authProvider: (done) => {
        done(null, state.currentUser.accessToken);
      }
    });

    // 1. Resolve site ID if not cached
    let siteId = spConfig.siteId;
    if (!siteId && spConfig.siteUrl) {
      const urlObj = new URL(spConfig.siteUrl);
      const host = urlObj.hostname;
      const sitePath = urlObj.pathname;
      const siteRes = await client.api(`/sites/${host}:${sitePath}`).get();
      siteId = siteRes.id;
    }

    // 2. Upload file to target folder
    const targetFolder = spConfig.documentLibraryFolder || 'Shared Documents/Reports';
    const uploadEndpoint = `/sites/${siteId}/drive/root:/${targetFolder}/${fileName}:/content`;

    const uploadRes = await client.api(uploadEndpoint).put(buffer);

    return {
      success: true,
      mode: 'live',
      fileName: fileName,
      sharePointUrl: uploadRes.webUrl || `${spConfig.siteUrl}/${targetFolder}/${fileName}`,
      folder: targetFolder,
      managerEmail: spConfig.managerEmail,
      message: `File uploaded to SharePoint via Microsoft Graph API`
    };
  } catch (err) {
    console.error('Error uploading to Microsoft Graph / SharePoint:', err);
    throw new Error(`SharePoint Upload Failed: ${err.message || err}`);
  }
}

function listSharePointReports() {
  const state = getState();
  const spConfig = state.settings.lineManagerSharePoint;
  ensureLocalStorage();

  const folderName = (spConfig.documentLibraryFolder || 'TeamReports').replace(/[\\/]/g, '_');
  const targetFolder = path.join(LOCAL_SP_STORAGE, folderName);

  if (!fs.existsSync(targetFolder)) {
    return [];
  }

  const files = fs.readdirSync(targetFolder);
  return files.map(f => {
    const stats = fs.statSync(path.join(targetFolder, f));
    return {
      name: f,
      size: `${(stats.size / 1024).toFixed(1)} KB`,
      modified: stats.mtime.toISOString(),
      webUrl: `${spConfig.siteUrl}/${spConfig.documentLibraryFolder}/${f}`,
      localPath: path.join(targetFolder, f)
    };
  }).reverse();
}

module.exports = {
  uploadReportToSharePoint,
  listSharePointReports
};
