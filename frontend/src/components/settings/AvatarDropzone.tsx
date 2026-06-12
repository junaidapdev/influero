import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus } from "lucide-react";

import { FieldError } from "@/components/ui/FieldError";
import { AVATAR_MIME_EXT } from "@/constants/storage";

type Props = {
  name?: string | null;
  // Saved avatar from app_users (shown until the user stages a new file).
  currentUrl?: string | null;
  // Local object URL for a freshly picked file (takes precedence over currentUrl).
  previewUrl?: string | null;
  onSelect: (file: File) => void;
  // i18n error KEY from the parent's validation (wrong type / too large).
  errorKey?: string;
  disabled?: boolean;
};

const ACCEPT = Object.keys(AVATAR_MIME_EXT).join(",");

// The avatar picker: click or drag-and-drop an image. Validation, preview-URL
// lifecycle, and upload all live in the parent/hooks — this component only emits
// the chosen File and renders the current/preview/empty state.
export function AvatarDropzone({
  name,
  currentUrl,
  previewUrl,
  onSelect,
  errorKey,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const shownUrl = previewUrl ?? currentUrl ?? null;
  const initial = name?.trim().charAt(0).toUpperCase() || null;

  function emitFirstFile(files: FileList | null): void {
    const file = files?.[0];
    if (file) onSelect(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    emitFirstFile(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex w-full items-center gap-4 rounded-lg border border-dashed bg-surface-secondary p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 ${
          isDragging ? "border-accent bg-accent-muted" : "border-border-muted"
        }`}
      >
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-light text-accent">
          {shownUrl ? (
            <img src={shownUrl} alt="" className="size-full object-cover" />
          ) : initial ? (
            <span className="text-lg font-semibold">{initial}</span>
          ) : (
            <ImagePlus className="size-6" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {t("settings.profile.avatarPrompt")}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("settings.profile.avatarHint")}
          </p>
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
