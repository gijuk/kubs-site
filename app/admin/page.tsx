import { LogOut } from "lucide-react";
import { getAllSchedules } from "@/lib/data/schedules";
import { getAllPhotosForAdmin } from "@/lib/data/photos";
import { logoutAction } from "./login/actions";
import AdminScheduleManager from "./AdminScheduleManager";
import AdminPhotoManager from "./AdminPhotoManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "관리자 · KUBS, IN ONE PLACE",
};

export default async function AdminPage() {
  const [items, photos] = await Promise.all([
    getAllSchedules(),
    getAllPhotosForAdmin(),
  ]);

  return (
    <main className="min-h-screen bg-ivory px-6 py-16 md:px-10">
      <div className="mx-auto max-w-editorial">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-crimson">관리자</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">
              일정 관리
            </h1>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
            >
              <LogOut size={15} strokeWidth={1.75} />
              로그아웃
            </button>
          </form>
        </div>

        <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-ink-faint">
          여기서 등록·수정·삭제한 내용은 즉시 메인 페이지와 전체 일정
          페이지에 반영됩니다.
        </p>

        <div className="mt-10">
          <AdminScheduleManager items={items} />
        </div>

        <div className="mt-16 border-t border-ivory-line pt-10">
          <h2 className="font-serif text-xl font-semibold text-ink">
            사진 아카이브 관리
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink-faint">
            방문자가 업로드한 사진은 승인 전까지 메인 페이지에 노출되지
            않습니다. 아래에서 승인하거나 삭제할 수 있습니다.
          </p>
          <div className="mt-6">
            <AdminPhotoManager items={photos} />
          </div>
        </div>
      </div>
    </main>
  );
}
