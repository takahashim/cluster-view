import type { User } from "@/lib/repository.ts";

interface HeaderProps {
  user: User | null;
  showReportsLink?: boolean;
}

export default function Header(
  { user, showReportsLink = true }: HeaderProps,
) {
  return (
    <header class="navbar bg-base-100 shadow-sm sticky top-0 z-50 px-4 md:px-6">
      <div class="flex-1">
        <a
          href="/"
          class="flex items-center gap-2 text-base-content font-semibold hover:text-primary transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Cluster View</span>
        </a>
      </div>
      <div class="flex-none flex items-center gap-4">
        {user
          ? (
            <>
              {showReportsLink && (
                <a href="/reports" class="btn btn-ghost btn-sm">
                  マイレポート
                </a>
              )}
              <div class="flex items-center gap-2">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    class="w-8 h-8 rounded-full"
                    referrerpolicy="no-referrer"
                  />
                )}
                <span class="text-sm hidden md:inline">{user.name}</span>
              </div>
              <a href="/api/auth/logout" class="btn btn-outline btn-sm">
                ログアウト
              </a>
            </>
          )
          : (
            <a href="/api/auth/google" class="btn btn-primary btn-sm">
              Googleでログイン
            </a>
          )}
      </div>
    </header>
  );
}
