"use client";

import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Button from "@/shared/ui/Button";
import GlassPanel from "@/shared/ui/GlassPanel";

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.html,.htm,.csv";
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/html",
  "application/xhtml+xml",
  "text/csv",
]);
const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "solar:file-pdf-broken";
  if (ext === "doc" || ext === "docx") return "solar:file-text-broken";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "solar:file-check-broken";
  return "solar:file-broken";
}

export default function DocumentRunForm({
  isRunning,
  onRun,
  mode,
}: {
  isRunning: boolean;
  onRun: (file: File) => void;
  mode?: "light" | "dark";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = (f: File): string | null => {
    if (!ACCEPTED_MIME_TYPES.has(f.type) && f.type !== "") {
      return `Unsupported file type. Upload a PDF, DOCX, XLSX or HTML file.`;
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `File is too large (${formatBytes(f.size)}). Maximum size is ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const pick = (f: File) => {
    const err = validate(f);
    setValidationError(err);
    setFile(err ? null : f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pick(f);
    // reset so the same file can be re-selected after clearing
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pick(f);
  };

  const handleRemove = () => {
    setFile(null);
    setValidationError(null);
  };

  return (
    <GlassPanel mode={mode} className="flex flex-col gap-3 rounded-lg p-3">
      <p className="text-xs text-text-lo">
        Upload a document to extract tender data — PDF, DOCX, XLSX, HTML or CSV, up to {MAX_SIZE_MB} MB.
      </p>

      {/* Drop zone — hidden once a file is selected */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 transition-colors ${
            dragOver
              ? "border-brand-500 bg-brand-500/5"
              : "border-app-border hover:border-text-lo"
          }`}
        >
          <Icon icon="solar:upload-minimalistic-broken" width={32} className="text-text-lo" />
          <p className="text-sm text-text-hi">
            Drop file here or{" "}
            <span className="text-brand-500 hover:underline">browse</span>
          </p>
          <p className="text-xs text-text-lo">PDF · DOCX · XLSX · HTML · CSV</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-md bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
          <Icon icon="solar:danger-triangle-broken" width={15} />
          {validationError}
        </div>
      )}

      {/* Selected file card */}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-app-border bg-canvas px-3 py-2.5">
          <Icon icon={fileIcon(file.name)} width={22} className="shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-hi">{file.name}</p>
            <p className="text-xs text-text-lo">{formatBytes(file.size)}</p>
          </div>
          <button
            onClick={handleRemove}
            className="shrink-0 rounded p-1 text-text-lo hover:text-status-danger transition-colors"
            aria-label="Remove file"
          >
            <Icon icon="solar:close-circle-broken" width={16} />
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => file && onRun(file)} disabled={isRunning || !file}>
          <Icon
            icon={isRunning ? "mdi:loading" : "solar:play-circle-broken"}
            width={15}
            className={isRunning ? "animate-spin" : ""}
          />
          {isRunning ? "Parsing…" : "Parse Document"}
        </Button>
      </div>
    </GlassPanel>
  );
}
