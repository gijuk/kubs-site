"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import PromotionUploadModal from "./PromotionUploadModal";

export default function PromotionUploadButton({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        <Megaphone size={15} strokeWidth={1.75} />
        홍보물 등록
      </button>

      {open && <PromotionUploadModal onClose={() => setOpen(false)} />}
    </>
  );
}
