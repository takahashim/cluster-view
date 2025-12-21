import { useSignal } from "@preact/signals";

interface ReportSummary {
  id: string;
  title: string;
  shareToken: string;
  createdAt: string;
}

interface ReportsListProps {
  initialReports: ReportSummary[];
}

export default function ReportsList({ initialReports }: ReportsListProps) {
  const reports = useSignal(initialReports);
  const deletingId = useSignal<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("このレポートを削除しますか?")) return;

    deletingId.value = id;

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        reports.value = reports.value.filter((r) => r.id !== id);
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("削除に失敗しました");
    } finally {
      deletingId.value = null;
    }
  };

  if (reports.value.length === 0) {
    return (
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body text-center text-base-content/60">
          <p>レポートがありません</p>
          <a href="/" class="btn btn-primary btn-sm mt-4">
            新しいレポートを作成
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-4">
      {reports.value.map((report) => (
        <div key={report.id} class="card bg-base-100 shadow-sm">
          <div class="card-body flex-row items-center justify-between gap-4">
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold truncate">{report.title}</h3>
              <p class="text-sm text-base-content/60">
                {new Date(report.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <a
                href={`/share/${report.shareToken}`}
                class="btn btn-primary btn-sm"
              >
                開く
              </a>
              <button
                type="button"
                class={`btn btn-error btn-outline btn-sm ${
                  deletingId.value === report.id ? "loading" : ""
                }`}
                onClick={() =>
                  handleDelete(report.id)}
                disabled={deletingId.value !== null}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
