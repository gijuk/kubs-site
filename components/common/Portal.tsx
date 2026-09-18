"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 자식을 <body> 바로 아래로 옮겨 렌더링합니다.
 * 스크롤 등장 애니메이션(.reveal)이나 z-index 스택 컨텍스트 안에서 열린 모달의
 * position: fixed 가 화면이 아닌 부모 요소 기준으로 잘리거나 헤더 뒤로 가려지는 걸 막습니다.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
