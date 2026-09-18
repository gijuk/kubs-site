"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminSupabaseClient } from "@/lib/supabase/adminClient";
import { readSubmitterInfo } from "@/lib/submitterInfo";
import type { PromotionCategory } from "@/lib/types";

export interface PromotionUploadState {
  error?: string;
  success?: boolean;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "promotions";
const VALID_CATEGORIES: PromotionCategory[] = [
  "club",
  "event",
  "ilhof",
  "recruit",
  "etc",
];

function refreshPromotionCaches() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function uploadPromotionAction(
  _prev: PromotionUploadState,
  formData: FormData
): Promise<PromotionUploadState> {
  try {
    const category = String(formData.get("category") ?? "") as PromotionCategory;
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const author = String(formData.get("author") ?? "").trim();
    const link = String(formData.get("link") ?? "").trim();
    const file = formData.get("image");

    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error("카테고리를 선택해주세요.");
    }
    if (!title || !content || !author) {
      throw new Error("제목, 내용, 작성자(동아리/단체명)는 필수입니다.");
    }
    if (link && !/^https?:\/\//.test(link)) {
      throw new Error("링크는 http:// 또는 https:// 로 시작해야 합니다.");
    }
    const submitter = readSubmitterInfo(formData);

    const supabase = getAdminSupabaseClient();

    let imageSrc: string | null = null;
    let storagePath: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("이미지는 jpg, png, webp, gif 형식만 가능합니다.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("이미지 크기는 8MB 이하만 가능합니다.");
      }

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
      imageSrc = publicUrl;
      storagePath = path;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("promotions")
      .insert({
        category,
        title,
        content,
        author,
        link: link || null,
        image_src: imageSrc,
        storage_path: storagePath,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    // 선택 입력된 연락처/신상은 공개되지 않는 별도 테이블에 저장합니다.
    // 저장에 실패하면 방금 만든 게시물/이미지를 되돌려서, 정보가 조용히 사라지지 않게 합니다.
    if (submitter.phone || submitter.info) {
      const { error: submitterError } = await supabase
        .from("promotion_submitters")
        .insert({
          promotion_id: inserted.id,
          phone: submitter.phone,
          info: submitter.info,
        });
      if (submitterError) {
        await supabase.from("promotions").delete().eq("id", inserted.id);
        if (storagePath) {
          await supabase.storage.from(BUCKET).remove([storagePath]);
        }
        throw new Error(submitterError.message);
      }
    }

    refreshPromotionCaches();
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "등록에 실패했습니다.",
    };
  }
}

/**
 * 승인 대기 중인 홍보물을 승인해 방문자에게 노출합니다. (관리자 전용 페이지에서만 호출)
 */
export async function approvePromotionAction(id: string) {
  const supabase = getAdminSupabaseClient();
  const { error } = await supabase
    .from("promotions")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  refreshPromotionCaches();
}

/**
 * 홍보물을 삭제합니다. Storage에 업로드된 이미지가 있으면 함께 삭제합니다.
 * (관리자 전용 페이지에서만 호출)
 */
export async function deletePromotionAction(
  id: string,
  storagePath: string | null
) {
  const supabase = getAdminSupabaseClient();

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refreshPromotionCaches();
}
