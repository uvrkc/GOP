const msal = require('@azure/msal-node');
const { getState, saveState } = require('./store');

let msalClient = null;

function getMsalClient(settings) {
  if (msalClient && msalClient._tenantId === settings.azureTenantId) {
    return msalClient;
  }

  const msalConfig = {
    auth: {
      clientId: settings.azureClientId || '00000000-0000-0000-0000-000000000000',
      authority: `https://login.microsoftonline.com/${settings.azureTenantId || 'common'}`
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message) {
          console.log('[MSAL]', message);
        },
        piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Info
      }
    }
  };

  msalClient = new msal.PublicClientApplication(msalConfig);
  msalClient._tenantId = settings.azureTenantId;
  return msalClient;
}

const SCOPES = [
  'User.Read',
  'Files.ReadWrite',
  'Sites.ReadWrite.All'
];

async function getAuthUrl() {
  const state = getState();
  const settings = state.settings;

  if (settings.authMode === 'mock') {
    return {
      mode: 'mock',
      url: null,
      message: 'Running in Local/Mock SSO Mode for testing. You can switch personas instantly.'
    };
  }

  const client = getMsalClient(settings);
  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: settings.azureRedirectUri || 'http://localhost:49152/auth/callback'
  };

  const authUrl = await client.getAuthCodeUrl(authCodeUrlParameters);
  return {
    mode: 'azure-sso',
    url: authUrl,
    message: 'Redirecting to Microsoft Entra ID Login'
  };
}

async function acquireTokenByCode(authCode) {
  const state = getState();
  const settings = state.settings;
  const client = getMsalClient(settings);

  const tokenRequest = {
    code: authCode,
    scopes: SCOPES,
    redirectUri: settings.azureRedirectUri || 'http://localhost:49152/auth/callback'
  };

  const response = await client.acquireTokenByCode(tokenRequest);
  
  // Update current user in store
  state.currentUser = {
    id: response.account.homeAccountId,
    name: response.account.name || response.account.username,
    email: response.account.username,
    role: 'team_member', // Can be mapped via Azure AD app roles or Line Manager directory
    lineManagerEmail: state.settings.lineManagerSharePoint.managerEmail,
    department: 'Corporate Operations',
    accessToken: response.accessToken,
    idToken: response.idToken
  };
  saveState(state);

  return state.currentUser;
}

function switchMockPersona(userId) {
  const state = getState();
  const found = state.teamMembers.find(m => m.id === userId);
  if (found) {
    state.currentUser = { ...found };
    saveState(state);
    return state.currentUser;
  }
  return state.currentUser;
}

module.exports = {
  getAuthUrl,
  acquireTokenByCode,
  switchMockPersona
};
