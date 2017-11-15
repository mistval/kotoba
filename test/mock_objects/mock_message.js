class MockMessage {
  constructor(channelId, authorId, authorUsername, guildRoles, authorRoles, content, authorPermissions) {
    this.member = {};
    this.content = content;
    this.author = {
      id: authorId,
      username: authorUsername,
    };
    this.channel = {
      id: channelId,
      createMessage(text) {
        this.sentMessage = new MockMessage('channel', 'authorId', 'authorName', [], []);
        return Promise.resolve(this.sentMessage);
      }
    };
    if (guildRoles) {
      this.channel.guild = {};
      this.channel.guild.roles = [];
      this.channel.guild.id = 'guild1';
      for (let i = 0; i < guildRoles.length; ++i) {
        this.channel.guild.roles.push({id: i, name: guildRoles[i]});
      }
    }
    if (authorRoles) {
      this.member.roles = [];
      for (let authorRoleName of authorRoles) {
        let guildRoleId = this.channel.guild.roles.findIndex(guildRole => {
          return guildRole.name === authorRoleName;
        });
        this.member.roles.push(guildRoleId);
      }
    }
    this.member.permission = {};
    this.member.permission.json = {};
    authorPermissions = authorPermissions || [];
    for (let authorPermission of authorPermissions) {
      this.member.permission.json[authorPermission] = true;
    }
  }

  delete() {
    this.deleted = true;
  }
}

module.exports = MockMessage;
