import type {
  CampusFacility,
  FaqItem,
  Photo,
  ScheduleItem,
} from "./types";

// 날짜는 데모용으로 오늘(빌드 시점) 근처로 채워져 있습니다.
// 실제 운영 시 이 파일을 CMS나 API 응답으로 교체하세요.
export const scheduleItems: ScheduleItem[] = [
  {
    id: "sch-01",
    title: "2026-2학기 수강정정 기간",
    category: "academic",
    date: "2026-09-21",
    endDate: "2026-09-25",
    location: "포털 온라인",
    organizer: "교무처",
    description:
      "정정 기간 동안 시간표 변경이 가능합니다. 정원 초과 과목은 대기 신청 후 자동 승인되니 포털 알림을 확인하세요.",
  },
  {
    id: "sch-02",
    title: "경영대 학생회 '가을 정기 간담회'",
    category: "council",
    date: "2026-09-19",
    location: "LG-POSCO관 대강당",
    organizer: "제55대 경영대 학생회",
    description:
      "학과 운영 전반에 대한 학생 의견을 수렴하는 자리입니다. 사전 질문은 학생회 인스타그램 DM으로 접수받습니다.",
  },
  {
    id: "sch-03",
    title: "KUBS 취업 특강: IB/PE 커리어 세션",
    category: "event",
    date: "2026-09-24",
    location: "SK미래관 국제회의실",
    organizer: "경영대학 취업지원센터",
    description:
      "현직 애널리스트 초청 특강. 선착순 120명, 참석 시 취업역량 마일리지가 부여됩니다.",
  },
  {
    id: "sch-04",
    title: "중간고사 대비 스터디룸 연장 운영",
    category: "council",
    date: "2026-10-05",
    endDate: "2026-10-16",
    location: "경영본관 지하 스터디룸",
    organizer: "제55대 경영대 학생회",
    description: "시험 기간 중 스터디룸을 새벽 1시까지 연장 운영합니다.",
  },
  {
    id: "sch-05",
    title: "2026-2학기 중간고사",
    category: "academic",
    date: "2026-10-19",
    endDate: "2026-10-25",
    organizer: "교무처",
    description: "강의별 시험 일정은 각 course 공지사항을 참고하세요.",
  },
];

export const photos: Photo[] = [
  {
    id: "ph-01",
    src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&q=80",
    date: "2026.03.14",
    eventName: "새내기 배움터",
    photographer: "김도윤",
    alt: "경영대 새내기 배움터 단체 사진",
  },
  {
    id: "ph-02",
    src: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&q=80",
    date: "2026.05.02",
    eventName: "고연전 응원전",
    photographer: "이서연",
    alt: "고연전 응원전 현장",
  },
  {
    id: "ph-03",
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80",
    date: "2026.05.20",
    eventName: "경영대 체육대회",
    photographer: "박지훈",
    alt: "경영대 체육대회 단체전",
  },
  {
    id: "ph-04",
    src: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80",
    date: "2026.06.11",
    eventName: "케이스 스터디 경진대회",
    photographer: "최민서",
    alt: "케이스 스터디 경진대회 발표 장면",
  },
  {
    id: "ph-05",
    src: "https://images.unsplash.com/photo-1560523159-4a9692d222f8?w=900&q=80",
    date: "2026.09.03",
    eventName: "개강총회",
    photographer: "정하늘",
    alt: "2학기 개강총회",
  },
  {
    id: "ph-06",
    src: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&q=80",
    date: "2026.09.12",
    eventName: "가을 캠퍼스 풍경",
    photographer: "한소영",
    alt: "가을 경영대 캠퍼스 풍경",
  },
];

export const faqItems: FaqItem[] = [
  {
    id: "faq-01",
    category: "학사",
    question: "복수전공과 부전공을 동시에 신청할 수 있나요?",
    answer:
      "네, 가능합니다. 다만 졸업 학점 요건이 각각 다르므로 학과 사무실에서 요건표를 반드시 확인한 뒤 포털에서 신청하세요. 신청은 매 학기 정정 기간 종료 후 별도 공지되는 기간에만 가능합니다.",
  },
  {
    id: "faq-02",
    category: "장학/등록",
    question: "성적 우수 장학금은 몇 등까지 지급되나요?",
    answer:
      "학과별로 인원이 배정되며 통상 상위 10% 내외입니다. 정확한 인원과 금액은 매 학기 장학팀 공지사항에서 확인할 수 있고, 재수강 과목은 장학 성적 산정에서 제외됩니다.",
  },
  {
    id: "faq-03",
    category: "학생회",
    question: "학생회비는 어디에 어떻게 쓰이나요?",
    answer:
      "새내기 배움터, 체육대회, 간식 행사, 스터디룸 운영 등에 사용되며 매 학기 말 결산 내역이 학생회 인스타그램과 정기총회를 통해 공개됩니다.",
  },
  {
    id: "faq-04",
    category: "시설",
    question: "스터디룸은 어떻게 예약하나요?",
    answer:
      "경영본관 1층 키오스크 또는 학생회 예약 페이지에서 시간 단위로 예약할 수 있습니다. 시험 기간에는 연장 운영되니 공지사항을 참고하세요.",
  },
  {
    id: "faq-05",
    category: "교환/유학",
    question: "교환학생 지원 시 어학 성적 최소 기준이 있나요?",
    answer:
      "협정 대학마다 기준이 다르며 국제처 공지의 대학별 요건표에서 확인 가능합니다. 일반적으로 영어권 대학은 IBT 90 이상을 권장합니다.",
  },
  {
    id: "faq-06",
    category: "학사",
    question: "전공 필수 과목을 재수강하면 성적은 어떻게 반영되나요?",
    answer:
      "가장 최근에 이수한 성적으로 대체되며, 이전 성적은 성적표에 재수강으로 표기되어 남습니다. GPA 계산에는 최신 성적만 반영됩니다.",
  },
];

export const facilities: CampusFacility[] = [
  {
    id: "fac-01",
    name: "경영본관",
    building: "경영본관",
    floor: "지상 5층 · 지하 2층",
    description: "학과 사무실, 대형 강의실, 지하 스터디룸이 위치합니다.",
  },
  {
    id: "fac-02",
    name: "LG-POSCO경영관",
    building: "LG-POSCO관",
    floor: "지상 6층",
    description: "대강당, 세미나실, 교수 연구실이 있습니다.",
  },
  {
    id: "fac-03",
    name: "SK미래관",
    building: "SK미래관",
    floor: "지상 8층",
    description: "국제회의실과 케이스 스터디 전용 강의실을 운영합니다.",
  },
  {
    id: "fac-04",
    name: "경영대 라운지",
    building: "경영본관 1층",
    floor: "1층",
    description: "휴게 공간, 사물함, 학생회 부스가 위치합니다.",
  },
];
