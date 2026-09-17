"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";

export interface PhotoUploadState {
  error?: string;
  success?: boolean;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "photos";

function todayLabel() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}.${mm}.${dd}`;
}

function refreshPhotoCaches() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function uploadPhotoAction(
  _prev: PhotoUploadState,
  formData: FormData
): Promise<PhotoUploadState> {
  try {
    const file = formData.get("file");
    const eventName = String(formData.get("eventName") ?? "").trim();
    const photographer = String(formData.get("photographer") ?? "").trim();
    const alt = String(formData.get("alt") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("사진 파일을 선택해주세요.");
    }
    if (!eventName || !photographer) {
      throw new Error("행사명과 촬영자는 필수입니다.");
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("jpg, png, webp, gif 형식의 이미지만 업로드할 수 있어요.");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("파일 크기는 8MB 이하만 가능합니다.");
    }

    const supabase = getAdminSupabaseClient();

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
      });
    if (uploadError) throw new Error(uploadError.message);

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: insertError } = await supabase.from("photos").insert({
      src: publicUrl,
      storage_path: path,
      date: todayLabel(),
      event_name: eventName,
      photographer,
      alt: alt || eventName,
    });
    if (insertError) throw new Error(insertError.message);

    refreshPhotoCaches();
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "업로드에 실패했습니다.",
    };
  }
}

/**
 * 승인 대기 중인 사진을 승인해 방문자에게 노출합니다. (관리자 전용 페이지에서만 호출)
 */
export async function approvePhotoAction(id: string) {
  const supabase = getAdminSupabaseClient();
  const { error } = await supabase
    .from("photos")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  refreshPhotoCaches();
}

/**
 * 사진을 삭제합니다. Storage에 업로드된 파일이 있으면 함께 삭제합니다.
 * (관리자 전용 페이지에서만 호출)
 */
export async function deletePhotoAction(id: string, storagePath: string | null) {
  const supabase = getAdminSupabaseClient();

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refreshPhotoCaches();
}
