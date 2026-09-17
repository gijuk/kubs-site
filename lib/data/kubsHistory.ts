export interface KubsHistoryEntry {
  id: string;
  year: string;
  title: string;
  description: string;
}

/**
 * KUBS History Game에서 랜덤으로 노출되는 고려대학교 경영대학 연혁입니다.
 * 공식 연혁(https://biz.korea.ac.kr/introduce/history.html) 및 120주년 기념 자료를 바탕으로 정리했습니다.
 */
export const kubsHistory: KubsHistoryEntry[] = [
  {
    id: "1905",
    year: "1905",
    title: "보성전문학교 이재학과 개설",
    description:
      "을사늑약으로 국권을 빼앗기던 격변의 해, 교육으로 나라를 다시 세우자는 뜻으로 보성전문학교가 문을 엽니다. 국내 최초의 2년제 이재학과가 오늘날 고려대 경영대학의 뿌리가 되었습니다.",
  },
  {
    id: "1907",
    year: "1907",
    title: "제1회 졸업생 18명 배출",
    description:
      "근대적 상업·경제 교육의 첫 결실로 18명의 졸업생이 세상으로 나갑니다. 한국 근대 경영교육의 첫 걸음이었습니다.",
  },
  {
    id: "1937",
    year: "1937",
    title: "경영경제학 개설",
    description:
      "국내 최초로 독일식 경영학(경영경제학)을 도입하며 학문적 지평을 넓혔습니다.",
  },
  {
    id: "1946",
    year: "1946",
    title: "경상대학 상학과로 승격",
    description:
      "보성전문학교가 고려대학교로 개편되며, 이재학과는 경상대학 상학과로 승격되어 정규 대학 교육의 틀을 갖춥니다.",
  },
  {
    id: "1952",
    year: "1952",
    title: "국내 첫 상학 석사 학위 수여",
    description: "국내 최초로 상학 분야 석사 학위를 수여하며 대학원 교육의 문을 엽니다.",
  },
  {
    id: "1955",
    year: "1955",
    title: "국내 최초 경영학과 개설",
    description:
      "상과대학이 신설되며 국내 최초로 '경영학과'가 문을 엽니다. 연세대학교보다 4년 앞선 국내 경영학 교육의 시작이었습니다.",
  },
  {
    id: "1958",
    year: "1958",
    title: "기업경영연구소 창립",
    description: "산업 현장과 학문을 잇는 기업경영연구소가 설립되며 실증 연구의 토대를 마련합니다.",
  },
  {
    id: "1963",
    year: "1963",
    title: "경영대학원 설립 인가",
    description: "전문 경영인을 양성하기 위한 경영대학원이 설립 인가를 받습니다.",
  },
  {
    id: "1972",
    year: "1972",
    title: "경영본관 준공",
    description:
      "오늘날까지 캠퍼스의 상징으로 남아있는 경영본관이 세워집니다. 이후 반세기 넘게 경영대학의 심장부 역할을 합니다.",
  },
  {
    id: "1976",
    year: "1976",
    title: "상과대학 → 경영대학으로 개명",
    description: "상과대학이 '경영대학'으로 이름을 바꾸며 현재의 정체성을 갖추게 됩니다.",
  },
  {
    id: "1995",
    year: "1995",
    title: "고대경영포럼 창설",
    description: "산학협력과 지식 교류의 장인 고대경영포럼이 창설되어 경영 현장과의 접점을 넓힙니다.",
  },
  {
    id: "2005-building",
    year: "2005",
    title: "LG-POSCO 경영관 준공",
    description:
      "고려대 개교 100주년을 기념해 약 280억 원이 투입된 LG-POSCO 경영관이 세워집니다. 아시아 최고 경영대학으로 도약하기 위한 무대가 마련되었습니다.",
  },
  {
    id: "2005-aacsb",
    year: "2005",
    title: "AACSB 국내 최초 인증",
    description: "미국경영교육인증(AACSB)을 국내 최초로 취득하며 국제적 수준의 경영교육을 공인받습니다.",
  },
  {
    id: "2007",
    year: "2007",
    title: "EQUIS 국내 최초 획득",
    description: "유럽경영교육인증(EQUIS)을 국내 최초로 획득하며 글로벌 경영대학으로서의 위상을 다집니다.",
  },
  {
    id: "2015",
    year: "2015",
    title: "CEMS Global Alliance 정회원 가입",
    description: "세계 명문 비즈니스 스쿨들의 연합인 CEMS Global Alliance에 정회원으로 가입합니다.",
  },
  {
    id: "2021",
    year: "2021",
    title: "EQUIS 3회 연속 재인증",
    description: "5년마다 이루어지는 EQUIS 재인증을 3회 연속으로 통과하며 교육 품질을 다시 한번 입증합니다.",
  },
  {
    id: "2025-anniversary",
    year: "2025",
    title: "개교 120주년 기념식",
    description:
      "1905년 보성전문학교 이재학과에서 시작된 여정이 120년째 이어집니다. LG-POSCO관 SUPEX홀에서 120주년 기념식이 성료되었습니다.",
  },
  {
    id: "2025-qs",
    year: "2025",
    title: "QS 마케팅 분야 세계 28위",
    description: "QS 세계대학평가 마케팅 분야에서 세계 28위, 국내 1위에 오르며 연구 경쟁력을 입증합니다.",
  },
  {
    id: "2025-aacsb",
    year: "2025",
    title: "AACSB 5회 연속 재인증",
    description: "6년 주기로 이루어지는 AACSB 재인증을 5회 연속 성공하며 20년 넘게 국제 인증을 유지하고 있습니다.",
  },
];
