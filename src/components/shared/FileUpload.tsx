/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, Image, File as FileIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUpload({ files, onChange, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateAndAdd = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(newFiles);

      if (files.length + incoming.length > MAX_FILES) {
        setError(`Tối đa ${MAX_FILES} tệp đính kèm.`);
        return;
      }

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

      onChange([...files, ...incoming]);
    },
    [files, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      validateAndAdd(e.dataTransfer.files);
    },
    [disabled, validateAndAdd],
  );

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Kéo thả hoặc <span className="text-indigo-600 font-medium">chọn tệp</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Ảnh, PDF, Word, Excel — tối đa 10 MB / tệp, {MAX_FILES} tệp
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          className="hidden"
          disabled={disabled}
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
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
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
          ))}
        </ul>
      )}
    </div>
  );
}
