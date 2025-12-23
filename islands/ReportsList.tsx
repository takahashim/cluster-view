import { useSignal } from "@preact/signals";
import type { ReportsPageStrings } from "@/lib/i18n/index.ts";
import type { Locale } from "@/lib/i18n/types.ts";

interface ReportSummary {
  id: string;
  title: string;
  shareToken: string;
  createdAt: string;
}

interface ReportsListProps {
  initialReports: ReportSummary[];
  strings: ReportsPageStrings;
  locale: Locale;
}

export default function ReportsList(
  { initialReports, strings, locale }: ReportsListProps,
) {
  const reports = useSignal(initialReports);
  const deletingId = useSignal<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(strings.reports.confirmDelete)) return;

    deletingId.value = id;

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        reports.value = reports.value.filter((r) => r.id !== id);
      } else {
        alert(strings.reports.deleteFailed);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert(strings.reports.deleteFailed);
    } finally {
      deletingId.value = null;
    }
  };

  // Date format options based on locale
  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (reports.value.length === 0) {
    return (
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body text-center text-base-content/60">
          <p>{strings.reports.empty}</p>
          <a href="/" class="btn btn-primary btn-sm mt-4">
            {strings.reports.createNew}
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
                {new Date(report.createdAt).toLocaleDateString(
                  locale === "ja" ? "ja-JP" : "en-US",
                  dateFormatOptions,
                )}
              </p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <a
                href={`/share/${report.shareToken}`}
                class="btn btn-primary btn-sm"
              >
                {strings.common.open}
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
                {strings.common.delete}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
