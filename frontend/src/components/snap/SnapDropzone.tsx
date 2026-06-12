import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, UploadCloud } from "lucide-react";

import { FieldError } from "@/components/ui/FieldError";
import { PDF_MIME, SNAP_MIME_EXT } from "@/constants/snap";

type Props = {
  onSelect: (file: File) => void;
  // i18n error KEY from the parent's validation (wrong type / too large /
  // bytes don't match the declared type / PDF conversion failed).
  errorKey?: string;
  // True while the parent validates, converts a PDF, or uploads.
  isBusy?: boolean;
};

const ACCEPT = [...Object.keys(SNAP_MIME_EXT), PDF_MIME].join(",");

// The snap upload picker: click or drag-and-drop a Snap Insights screenshot
// (PNG/JPEG/WebP) or PDF export. Validation (MIME + magic bytes + size), the
// client-side PDF→PNG conversion, and the upload all live in the parent/hooks
// — this component only emits the chosen File (the AvatarDropzone pattern).
export function SnapDropzone({ onSelect, errorKey, isBusy = false }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function emitFirstFile(files: FileList | null): void {
    const file = files?.[0];
    if (file) onSelect(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setIsDragging(false);
    if (isBusy) return;
    emitFirstFile(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    if (!isBusy) setIsDragging(true);
  }

  return (
    <div>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center gap-3 rounded-lg border border-dashed bg-surface-secondary px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 ${
          isDragging ? "border-accent bg-accent-muted" : "border-border-muted"
        }`}
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-light text-accent">
          {isBusy ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : (
            <UploadCloud className="size-6" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">
            {t(isBusy ? "snap.upload.busy" : "snap.upload.prompt")}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">{t("snap.upload.hint")}</p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          emitFirstFile(event.target.files);
          // Reset so re-picking the same file still fires onChange.
          event.target.value = "";
        }}
      />

      <FieldError message={errorKey ? t(errorKey) : undefined} />
    </div>
  );
}
