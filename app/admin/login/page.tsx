import { loginAction } from "./actions";

const ERROR_MESSAGE: Record<string, string> = {
  wrong: "비밀번호가 올바르지 않습니다.",
  noconfig:
    "관리자 비밀번호가 아직 설정되지 않았습니다. .env.local의 ADMIN_PASSWORD를 확인하세요.",
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessage = searchParams.error
    ? ERROR_MESSAGE[searchParams.error] ?? "로그인에 실패했습니다."
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-6">
      <div className="w-full max-w-sm">
        <p className="text-sm text-crimson">KUBS</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">
          관리자 로그인
        </h1>

        <form action={loginAction} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs text-ink-faint"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full rounded-md border border-ivory-line bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-crimson focus:outline-none"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-crimson">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-crimson py-2.5 text-sm font-medium text-ivory transition-colors hover:bg-crimson-deep"
          >
            로그인
          </button>
        </form>
      </div>
    </main>
  );
}
