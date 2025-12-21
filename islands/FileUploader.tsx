import { useSignal } from "@preact/signals";
import { useCallback } from "preact/hooks";

interface FileUploaderProps {
  onUploadStart?: () => void;
  onUploadComplete?: (shareUrl: string) => void;
  onError?: (error: string) => void;
}

export default function FileUploader({
  onUploadStart,
  onUploadComplete,
  onError,
}: FileUploaderProps) {
  const isDragging = useSignal(false);
  const isUploading = useSignal(false);
  const errorMessage = useSignal<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".json")) {
      const msg = "JSONファイルを選択してください";
      errorMessage.value = msg;
      onError?.(msg);
      return;
    }

    isUploading.value = true;
    errorMessage.value = null;
    onUploadStart?.();

    try {
      // Read file content
      const text = await file.text();

      // Parse JSON to validate it's valid JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("JSONのパースに失敗しました");
      }

      // Upload to API
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "アップロードに失敗しました");
      }

      const result = await response.json();

      // Redirect to share URL
      if (result.shareUrl) {
        onUploadComplete?.(result.shareUrl);
        globalThis.location.href = result.shareUrl;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "エラーが発生しました";
      errorMessage.value = msg;
      onError?.(msg);
    } finally {
      isUploading.value = false;
    }
  }, [onUploadStart, onUploadComplete, onError]);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      isDragging.value = false;

      const file = e.dataTransfer?.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    isDragging.value = true;
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    isDragging.value = false;
  }, []);

  const handleInputChange = useCallback(
    (e: Event) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div class="uploader-container">
      <div
        class={`drop-zone ${isDragging.value ? "dragging" : ""} ${
          isUploading.value ? "uploading" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading.value ? (
          <div class="uploading-state">
            <div class="spinner"></div>
            <p>アップロード中...</p>
          </div>
        ) : (
          <>
            <div class="drop-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p class="drop-text">
              hierarchical_result.json をドラッグ&ドロップ
            </p>
            <p class="drop-subtext">または</p>
            <label class="file-button">
              ファイルを選択
              <input
                type="file"
                accept=".json"
                onChange={handleInputChange}
                hidden
              />
            </label>
          </>
        )}
      </div>

      {errorMessage.value && (
        <div class="error-message">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage.value}</span>
        </div>
      )}

      <style>{`
        .uploader-container {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .drop-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 48px 24px;
          text-align: center;
          transition: all 0.2s ease;
          background: #f8fafc;
          cursor: pointer;
        }

        .drop-zone:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }

        .drop-zone.dragging {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .drop-zone.uploading {
          cursor: wait;
        }

        .drop-icon {
          color: #94a3b8;
          margin-bottom: 16px;
        }

        .drop-text {
          font-size: 16px;
          font-weight: 500;
          color: #334155;
          margin: 0 0 8px;
        }

        .drop-subtext {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 16px;
        }

        .file-button {
          display: inline-block;
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .file-button:hover {
          background: #2563eb;
        }

        .uploading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
