const { google } = require('googleapis');

class GoogleDriveService {
  driveClient
  constructor(clientId, clientSecret, redirectUri, refreshToken) {
    this.driveClient = this.createDriveClient(clientId, clientSecret, redirectUri, refreshToken);
  }

  createDriveClient(clientId, clientSecret, redirectUri, refreshToken) {
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    client.setCredentials({ refresh_token: refreshToken });

    return google.drive({
      version: 'v3',
      auth: client,
    });
  }

  async getFile(fileName) {
    const response = await this.driveClient.files.list({
      q: `name contains '${fileName}'`,
      fields: 'nextPageToken, files(id, name, webContentLink, webViewLink)'
    })

    return response?.data?.files[0];
  }
}

module.exports = GoogleDriveService;
