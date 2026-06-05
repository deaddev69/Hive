"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "../utils/cn";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        document.body.style.overflow = "hidden";
      }
    } else {
      if (dialog.open) {
        dialog.close();
        document.body.style.overflow = "";
      }
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  // Click on backdrop handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm rounded-3xl border border-hive-border bg-white text-hive-text shadow-2xl p-0 outline-none w-full max-w-lg overflow-hidden",
        className
      )}
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-hive-border/60">
          <h2 className="text-lg font-bold text-hive-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-hive-cream transition-colors text-hive-text-muted hover:text-hive-text"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </dialog>
  );
};
