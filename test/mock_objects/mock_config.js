class MockConfig {
  constructor(serverAdminRole, botAdminIds) {
    this.botAdminIds = botAdminIds;
    this.serverAdminRoleName = serverAdminRole;
    this.genericErrorMessage = 'Error';
  }
}

module.exports = MockConfig;
