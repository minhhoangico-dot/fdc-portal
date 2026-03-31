/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, Image, File as FileIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressFiles } from '@/lib/compress-image';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ACCEPT_STRING = ALLOWED_TYPES.join(',');

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <FileIcon className="w-5 h-5 text-gray-500" />;
};

/** Per-file metadata showing compression savings. */
interface FileMeta {
  originalSize: number;
  wasCompressed: boolean;
}

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUpload({ files, onChange, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [fileMetas, setFileMetas] = useState<FileMeta[]>([]);

  const validateAndAdd = useCallback(
    async (newFiles: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(newFiles);

      if (files.length + incoming.length > MAX_FILES) {
        setError(`Tối đa ${MAX_FILES} tệp đính kèm.`);
        return;
      }

      // Validate types before compression
      for (const file of incoming) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`Định dạng "${file.name}" không được hỗ trợ. Chấp nhận: ảnh, PDF, Word, Excel.`);
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`Tệp "${file.name}" vượt quá 10 MB.`);
          return;
        }
      }

      // Compress images (non-images pass through unchanged)
      setCompressing(true);
      try {
        const results = await compressFiles(incoming);

        const compressedFiles = results.map((r) => r.file);
        const newMetas = results.map((r) => ({
          originalSize: r.originalSize,
          wasCompressed: r.wasCompressed,
        }));

        onChange([...files, ...compressedFiles]);
        setFileMetas((prev) => [...prev, ...newMetas]);
      } catch {
        // If compression fails, use originals
        onChange([...files, ...incoming]);
        setFileMetas((prev) => [
          ...prev,
          ...incoming.map((f) => ({ originalSize: f.size, wasCompressed: false })),
        ]);
      } finally {
        setCompressing(false);
      }
    },
    [files, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || compressing) return;
      validateAndAdd(e.dataTransfer.files);
    },
    [disabled, compressing, validateAndAdd],
  );

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setFileMetas((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !compressing) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !compressing && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50',
          (disabled || compressing) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {compressing ? (
          <>
            <Loader2 className="w-8 h-8 text-indigo-500 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-600">Đang tối ưu ảnh...</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Kéo thả hoặc <span className="text-indigo-600 font-medium">chọn tệp</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Ảnh, PDF, Word, Excel — tối đa 10 MB / tệp, {MAX_FILES} tệp
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">
              Ảnh tự động nén &amp; thay đổi kích thước
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          className="hidden"
          disabled={disabled || compressing}
          onChange={(e) => {
            if (e.target.files) validateAndAdd(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => {
            const meta = fileMetas[idx];
            const saved = meta?.wasCompressed
              ? Math.round((1 - file.size / meta.originalSize) * 100)
              : 0;

            return (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    {meta?.wasCompressed && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        giảm {saved}% ({formatFileSize(meta.originalSize)} &rarr; {formatFileSize(file.size)})
                      </span>
                    )}
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
