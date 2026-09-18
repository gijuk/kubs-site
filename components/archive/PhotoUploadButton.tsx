"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import Portal from "@/components/common/Portal";
import PhotoUploadModal from "./PhotoUploadModal";

export default function PhotoUploadButton({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        <Upload size={15} strokeWidth={1.75} />
        사진 업로드
      </button>

      {open && (
        <Portal>
          <PhotoUploadModal onClose={() => setOpen(false)} />
        </Portal>
      )}
    </>
  );
}
