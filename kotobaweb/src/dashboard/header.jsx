import React from 'react';
import defaultAvatar from '../img/discord_default_avatar.png';
import DiscordLoginButton from '../controls/discord_login_button';

export function DashboardHeader({ user }) {
  if (user) {
    const avatarUri = user.discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${user.discordUser.id}/${user.discordUser.avatar}`
      : defaultAvatar;

    return (
      <header className="w-100 bg-light d-flex justify-content-center">
        <img src={avatarUri} className="my-5 rounded-circle" alt="user avatar" width="128" height="128" />
        <div className="d-flex flex-column justify-content-center ml-4">
          <h2>{user.discordUser.username}</h2>
          <a href="/api/logout">Logout</a>
        </div>
      </header>
    );
  }

  return (
    <header className="d-flex bg-light flex-column align-items-center py-5">
      <p>Discord users can login via Discord to manage Kotoba bot.</p>
      <DiscordLoginButton />
    </header>
  );
}

export default DashboardHeader;
