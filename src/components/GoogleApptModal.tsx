import React, { useEffect } from "react";
import { X } from "lucide-react";

interface GoogleApptModalProps {
  apptUrl: string;
  open: boolean;
  onClose: () => void;
  title?: string;
}

export function GoogleApptModal({
  apptUrl,
  open,
  onClose,
  title = "Pick Your Appointment Time",
}: GoogleApptModalProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-appt-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 flex h-[min(95dvh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl ring-1 ring-black/5"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-b from-gray-50/90 to-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2
              id="google-appt-modal-title"
              className="truncate text-lg font-semibold tracking-tight text-gray-900 sm:text-xl"
            >
              {title}
            </h2>
            <p className="mt-0.5 hidden text-xs text-gray-500 sm:block">
              Choose a time below — scroll inside the calendar if needed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Embed: flex-1 + min-h-0 so the iframe gets a real height and is not clipped by footer */}
        <div className="relative min-h-0 flex-1 bg-gray-100/80">
          <iframe
            src={apptUrl}
            className="absolute inset-0 h-full w-full border-0"
            title="Google Appointment Schedule"
            allow="camera; microphone; geolocation"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-600 sm:text-sm sm:max-w-[65%]">
              When you&apos;re done booking, close this window to return and finish on BBIT.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 sm:py-2"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
