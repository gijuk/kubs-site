/**
 * 경영대학 3개 건물(경영본관·LG-POSCO경영관·현대자동차경영관)의 층별 구조.
 *
 * 출처: 고려대학교 경영대학 공식 홈페이지
 *   - https://biz.korea.ac.kr/introduce/major_campus.html (경영본관)
 *   - https://biz.korea.ac.kr/introduce/lg_posco_campus.html (LG-POSCO경영관)
 *   - https://biz.korea.ac.kr/introduce/hyundai_car_campus.html (현대자동차경영관)
 *   - https://biz.korea.ac.kr/introduce/kubs_campus.html
 *   - https://biz.korea.ac.kr/news/news_view?no=28 (LG-POSCO 2층 연결문 개방시간)
 *   - 나무위키 "고려대학교/학부/경영대학" (건물 간 연결 통로, 학생회실 호실 등 보충 정보)
 *
 * 프린터/소파 등 세부 편의시설과 정확한 건물별 운영시간은 공개된 자료가 없어
 * 아직 반영하지 못했습니다. 확인되는 대로 이 파일에 추가해주세요.
 */

export type BuildingId = "main" | "lgposco" | "hyundai";

export interface CampusFloor {
  /** 표시용 층 라벨, 예: "5F", "B1" */
  floor: string;
  /** 위에서부터 정렬하기 위한 값 (클수록 위층) */
  order: number;
  facilities: string[];
  /** 출처가 엇갈리거나 비공식(커뮤니티) 정보일 때 덧붙이는 설명 */
  note?: string;
}

export interface CampusBuilding {
  id: BuildingId;
  name: string;
  builtYear: number;
  size: string;
  description: string;
  /** 건물 전체에 해당하는, 특정 층에 못 박기 어려운 참고사항 */
  note?: string;
  floors: CampusFloor[];
}

export interface FloorRef {
  building: BuildingId;
  floor: string;
}

export interface FloorConnection {
  a: FloorRef;
  b: FloorRef;
  note?: string;
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  {
    id: "main",
    name: "경영본관",
    builtYear: 1972,
    size: "지상 5층",
    description:
      "1972년 준공된 고려대학교 최초의 단과대학 건물입니다. 현재는 강의실 대신 행정·교수 연구 공간이 주로 들어서 있습니다.",
    floors: [
      {
        floor: "5F",
        order: 5,
        facilities: ["교수 연구실", "박사과정 연구실", "피트니스 센터"],
      },
      {
        floor: "4F",
        order: 4,
        facilities: [
          "교수 연구실",
          "경영대 학생회실 (401호, 424호)",
          "여학생 휴게실",
        ],
      },
      {
        floor: "3F",
        order: 3,
        facilities: ["국제실", "경력개발센터", "행정사무공간"],
        note: "커뮤니티(비공식) 정보로는 CPA 준비반 '정진초', 행정고시반 '탁마정'도 이 층에 있다고 알려져 있습니다. 중앙도서관·사범대학 방향 구름다리도 이 층에서 이어집니다.",
      },
      {
        floor: "2F",
        order: 2,
        facilities: [
          "창업지원센터 (일진창업지원센터 · KUBS 스타트업 스테이션)",
        ],
      },
      {
        floor: "1F",
        order: 1,
        facilities: ["학장실", "부학장실", "부원장실", "행정실", "교수 휴게실"],
      },
    ],
  },
  {
    id: "lgposco",
    name: "LG-POSCO경영관",
    builtYear: 2003,
    size: "지상 6층",
    description:
      "고려대학교 개교 100주년(2005년)을 앞두고 지어진 건물로, 연구·산학협동·국제교류 기능을 지원합니다.",
    note: "건물 내에 수당학술정보관(경영전문도서관)과 디지털라운지도 있는데, 정확한 층수는 아직 확인하지 못했습니다.",
    floors: [
      {
        floor: "6F",
        order: 6,
        facilities: [],
        note: "현대자동차경영관 4층과 연결되는 통로가 있습니다.",
      },
      {
        floor: "5F",
        order: 5,
        facilities: ["박현주 라운지"],
        note: "경영본관 4층과 연결되는 통로가 있습니다. 일부 자료는 SUPEX홀 입구를 이 층으로 안내하기도 합니다.",
      },
      {
        floor: "4F",
        order: 4,
        facilities: ["SUPEX HALL (첨단 음향·동시통역 시설)"],
      },
      {
        floor: "3F",
        order: 3,
        facilities: ["주 로비", "강의실", "건물 안내데스크"],
      },
      {
        floor: "2F",
        order: 2,
        facilities: ["이명박 라운지", "측면 출입구"],
        note: "라이시움(법학관) 방향 연결문은 평일 08:00~20:00 개방됩니다.",
      },
      {
        floor: "1F",
        order: 1,
        facilities: ["강의실", "중앙광장 연결 출입구", "ATM"],
      },
    ],
  },
  {
    id: "hyundai",
    name: "현대자동차경영관",
    builtYear: 2013,
    size: "지상 5층 · 지하 4층 (15,470㎡)",
    description:
      "2013년 9월 준공된 경영대학의 세 번째 건물입니다. 교수연구실 28개, 강의실 16개, 그룹 스터디룸 51개가 있으며, 스터디룸은 학생증(ID카드) 예약 시스템으로 누구나 이용할 수 있습니다.",
    floors: [
      {
        floor: "5F",
        order: 5,
        facilities: [],
        note: "세부 시설 정보를 아직 확인하지 못했습니다.",
      },
      {
        floor: "4F",
        order: 4,
        facilities: ["남영 라운지", "그룹 스터디룸", "락커"],
      },
      {
        floor: "3F",
        order: 3,
        facilities: ["황예식·조예행 갤러리", "그룹 스터디룸", "락커"],
      },
      {
        floor: "2F",
        order: 2,
        facilities: ["그룹 스터디룸", "락커"],
        note: "락커는 2~4층에 걸쳐 총 1,032개가 있습니다.",
      },
      {
        floor: "1F",
        order: 1,
        facilities: ["메인 로비", "경영대학 역사관"],
      },
      {
        floor: "B1",
        order: 0,
        facilities: [
          "카페 (블루팟)",
          "편의점 (이마트24)",
          "마더스 밥",
          "KCC 라운지",
          "제자사랑 라운지",
          "학생 전용 자치공간 (카페테리아·오픈시어터)",
        ],
      },
      {
        floor: "B2",
        order: -1,
        facilities: ["학생 라운지", "남촌 라운지"],
      },
      {
        floor: "B3",
        order: -2,
        facilities: ["이상일·이동섭 홀"],
      },
      {
        floor: "B4",
        order: -3,
        facilities: [],
        note: "세부 시설 정보를 아직 확인하지 못했습니다.",
      },
    ],
  },
];

export const FLOOR_CONNECTIONS: FloorConnection[] = [
  {
    a: { building: "main", floor: "3F" },
    b: { building: "hyundai", floor: "2F" },
  },
  {
    a: { building: "main", floor: "4F" },
    b: { building: "hyundai", floor: "3F" },
  },
  {
    a: { building: "main", floor: "4F" },
    b: { building: "lgposco", floor: "5F" },
  },
  {
    a: { building: "main", floor: "5F" },
    b: { building: "hyundai", floor: "4F" },
  },
  {
    a: { building: "main", floor: "5F" },
    b: { building: "lgposco", floor: "6F" },
  },
  {
    a: { building: "hyundai", floor: "B1" },
    b: { building: "lgposco", floor: "2F" },
    note: "라이시움(법학관) 방향 연결문은 평일 08:00~20:00 개방됩니다.",
  },
];

export function getBuilding(id: BuildingId): CampusBuilding {
  const building = CAMPUS_BUILDINGS.find((b) => b.id === id);
  if (!building) throw new Error(`Unknown building id: ${id}`);
  return building;
}

export function getConnectionsFor(ref: FloorRef): {
  connection: FloorConnection;
  other: FloorRef;
}[] {
  return FLOOR_CONNECTIONS.filter(
    (c) =>
      (c.a.building === ref.building && c.a.floor === ref.floor) ||
      (c.b.building === ref.building && c.b.floor === ref.floor)
  ).map((connection) => ({
    connection,
    other:
      connection.a.building === ref.building && connection.a.floor === ref.floor
        ? connection.b
        : connection.a,
  }));
}
