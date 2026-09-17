"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
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

      {open && <PhotoUploadModal onClose={() => setOpen(false)} />}
    </>
  );
}
