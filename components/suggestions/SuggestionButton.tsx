"use client";

import { useState } from "react";
import Portal from "@/components/common/Portal";
import SuggestionModal from "./SuggestionModal";

export default function SuggestionButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        건의함
      </button>

      {open && (
        <Portal>
          <SuggestionModal onClose={() => setOpen(false)} />
        </Portal>
      )}
    </>
  );
}
