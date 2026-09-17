import { Instagram, Mail, MessageCircleMore, Lock } from "lucide-react";

const SNS_LINKS = [
  {
    label: "Instagram",
    href: "https://instagram.com/kubs.student.council",
    icon: Instagram,
  },
  {
    label: "카카오톡 채널",
    href: "https://pf.kakao.com/",
    icon: MessageCircleMore,
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-ivory-line bg-ivory-soft">
      <div className="mx-auto max-w-editorial px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="font-serif text-xl font-semibold text-ink">
              KUBS, in one place
            </p>
            <p className="mt-3 max-w-[26ch] text-sm leading-relaxed text-ink-faint">
              고려대학교 경영대학 학생들이 직접 만들고 채워가는 비공식
              정보 허브입니다.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">학생회 채널</p>
            <ul className="mt-4 space-y-3">
              {SNS_LINKS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-crimson"
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">문의</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:kubs.council@example.com"
                  className="flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-crimson"
                >
                  <Mail size={16} strokeWidth={1.75} />
                  kubs.council@example.com
                </a>
              </li>
              <li>
                <a
                  id="admin"
                  href="/admin"
                  className="flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-crimson"
                >
                  <Lock size={16} strokeWidth={1.75} />
                  관리자 페이지
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-ivory-line pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>본 사이트는 고려대학교 경영대학 학생들이 운영하는 비공식 웹사이트입니다.</p>
          <p>© 2026 KUBS Student Council. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
