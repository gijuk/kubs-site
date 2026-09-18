"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import SuggestionModal from "./SuggestionModal";

export default function SuggestionButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {children ?? (
          <>
            <MessageSquareText size={15} strokeWidth={1.75} />
            건의함
          </>
        )}
      </button>

      {open && <SuggestionModal onClose={() => setOpen(false)} />}
    </>
  );
}
