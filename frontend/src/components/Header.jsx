import { useAuth, useLogout } from '../hooks/useAuth.js';

const DISCORD_CDN = 'https://cdn.discordapp.com';

function Avatar({ user }) {
  const src = user.avatar
    ? `${DISCORD_CDN}/avatars/${user.id}/${user.avatar}.png?size=32`
    : `${DISCORD_CDN}/embed/avatars/0.png`;
  return (
    <img src={src} alt={user.username} className="w-8 h-8 rounded-full" />
  );
}

export default function Header() {
  const { data: user } = useAuth();
  const logout = useLogout();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-white">MudaeOrga</span>
        <span className="text-xs text-gray-400 mt-1">harem manager</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <span className="text-sm text-gray-300">{user.username}</span>
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
