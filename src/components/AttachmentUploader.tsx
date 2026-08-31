import { useState, useRef } from 'react';
import { Paperclip, Trash2, FileText, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EmailAttachment } from '../types';
import { formatBytes } from '../utils';

interface AttachmentUploaderProps {
  attachments: EmailAttachment[];
  onUpdateAttachments: (attachments: EmailAttachment[]) => void;
  isCVMode?: boolean;
}

export function AttachmentUploader({
  attachments,
  onUpdateAttachments,
  isCVMode = false,
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalSize = attachments.reduce((acc, curr) => acc + curr.size, 0);
  const MAX_GMAIL_SIZE = 25 * 1024 * 1024;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const newAttachments: EmailAttachment[] = [];
    let currentTotal = totalSize;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (currentTotal + file.size > MAX_GMAIL_SIZE) {
        setError(`Cannot add "${file.name}". Total attachment size would exceed Gmail's 25 MB limit.`);
        break;
      }

      try {
        const base64 = await readFileAsBase64(file);
        newAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataBase64: base64,
          uploadedAt: new Date().toISOString(),
        });
        currentTotal += file.size;
      } catch (err) {
        console.error('Error reading file:', err);
        setError(`Failed to read file ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      onUpdateAttachments([...attachments, ...newAttachments]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to Base64'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    onUpdateAttachments(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
          <span>CV / Resume Attachment</span>
        </label>
        {attachments.length > 0 && (
          <span className="text-[11px] text-emerald-400 font-medium">
            Saved
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex items-center justify-center gap-2">
          <Upload className="w-4 h-4 text-indigo-400" />
          <p className="text-xs text-slate-300">
            <span className="text-indigo-400 font-semibold">Upload CV</span> or drag & drop (PDF, DOCX)
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">{file.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({formatBytes(file.size)})</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(file.id);
                }}
                className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                title="Remove attachment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
