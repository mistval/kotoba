const NUM_AVATARS = 11;

class AvatarPool {
  constructor() {
    this.availableAvatars = [];
    for (let i = 1; i <= NUM_AVATARS; i += 1) {
      this.availableAvatars.push(i);
    }
  }

  getAvailableAvatar() {
    const index = Math.floor(Math.random() * this.availableAvatars.length);
    return this.availableAvatars.splice(index, 1)[0];
  }

  markAvatarAvailable(avatar) {
    this.availableAvatars.push(avatar);
  }

  tryRecoverAvatar(avatar) {
    const availableIndex = this.availableAvatars.indexOf(avatar);
    if (availableIndex === -1) {
      return this.getAvailableAvatar();
    }

    this.availableAvatars.splice(availableIndex, 1);
    return avatar;
  }
}

module.exports = AvatarPool;
