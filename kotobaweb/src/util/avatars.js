const avatars = require.context('./../img/user_avatars');

export function getAvatar(avatarName) {
  return avatars(`./${avatarName}.png`).default;
}
