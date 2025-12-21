import { useSignal } from "@preact/signals";
import { useCallback } from "preact/hooks";
import type { User } from "@/lib/repository.ts";

interface FileUploaderProps {
  user: User | null;
}

export default function FileUploader({ user }: FileUploaderProps) {
  const isDragging = useSignal(false);
  const isUploading = useSignal(false);
  const errorMessage = useSignal<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".json")) {
      errorMessage.value = "JSONファイルを選択してください";
      return;
    }

    isUploading.value = true;
    errorMessage.value = null;

    try {
      const text = await file.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("JSONのパースに失敗しました");
      }

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("ログインが必要です");
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "アップロードに失敗しました");
      }

      const result = await response.json();
      if (result.shareUrl) {
        globalThis.location.href = result.shareUrl;
      }
    } catch (error) {
      errorMessage.value = error instanceof Error
        ? error.message
        : "エラーが発生しました";
    } finally {
      isUploading.value = false;
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    isDragging.value = false;
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    isDragging.value = true;
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    isDragging.value = false;
  }, []);

  const handleInputChange = useCallback((e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Show login prompt when not logged in
  if (!user) {
    return (
      <div class="w-full max-w-md mx-auto">
        <div class="border-2 border-dashed rounded-2xl p-12 text-center border-base-content/20 bg-base-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-12 w-12 mx-auto mb-4 text-base-content/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          <p class="font-medium text-base-content mb-2">
            ログインが必要です
          </p>
          <p class="text-base-content/60 text-sm mb-4">
            レポートを作成するにはログインしてください
          </p>
          <a href="/api/auth/google" class="btn btn-primary">
            Googleでログイン
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="w-full max-w-md mx-auto">
      <div
        class={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${
          isDragging.value
            ? "border-primary bg-primary/10"
            : "border-base-content/20 bg-base-100"
        }
          ${
          isUploading.value
            ? "opacity-50 cursor-wait"
            : "hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading.value
          ? (
            <div class="flex flex-col items-center gap-4">
              <span class="loading loading-spinner loading-lg text-primary">
              </span>
              <p class="text-base-content">アップロード中...</p>
            </div>
          )
          : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-12 w-12 mx-auto mb-4 text-base-content/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p class="font-medium text-base-content mb-2">
                hierarchical_result.json をドラッグ&ドロップ
              </p>
              <p class="text-base-content/60 text-sm mb-4">または</p>
              <label class="btn btn-primary">
                ファイルを選択
                <input
                  type="file"
                  accept=".json"
                  onChange={handleInputChange}
                  class="hidden"
                />
              </label>
            </>
          )}
      </div>

      {errorMessage.value && (
        <div class="alert alert-error mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" stroke-width="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke-width="2" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2" />
          </svg>
          <span>{errorMessage.value}</span>
        </div>
      )}
    </div>
  );
}
