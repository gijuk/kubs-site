export type ScheduleCategory = "academic" | "council" | "event";

export interface ScheduleItem {
  id: string;
  title: string;
  category: ScheduleCategory;
  date: string; // ISO date, e.g. "2026-09-22"
  endDate?: string; // for multi-day items
  location?: string;
  description: string;
  organizer?: string;
}

export interface Photo {
  id: string;
  src: string;
  date: string;
  eventName: string;
  photographer: string;
  alt: string;
}

export type PhotoStatus = "pending" | "approved";

export interface AdminPhoto extends Photo {
  status: PhotoStatus;
  storagePath: string | null;
}

export type FaqCategory = "학사" | "장학/등록" | "학생회" | "시설" | "교환/유학";

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export interface CampusFacility {
  id: string;
  name: string;
  building: string;
  floor: string;
  description: string;
}

export const CATEGORY_LABEL: Record<ScheduleCategory, string> = {
  academic: "학사 일정",
  council: "학생회 사업",
  event: "학교 행사",
};

export type PromotionCategory = "club" | "event" | "ilhof" | "recruit" | "etc";

export interface Promotion {
  id: string;
  category: PromotionCategory;
  title: string;
  content: string;
  author: string;
  link?: string;
  imageSrc?: string;
  createdAt: string;
}

export type PromotionStatus = "pending" | "approved";

export interface AdminPromotion extends Promotion {
  status: PromotionStatus;
  storagePath: string | null;
}

export const PROMOTION_CATEGORY_LABEL: Record<PromotionCategory, string> = {
  club: "동아리 홍보",
  event: "행사 홍보",
  ilhof: "일일호프",
  recruit: "리크루팅",
  etc: "기타",
};
