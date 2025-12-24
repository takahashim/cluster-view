import type { AdminReportSummary } from "@/lib/repository.ts";
import type { Locale, TranslationsData } from "@/lib/i18n/index.ts";

interface AdminReportTableProps {
  reports: AdminReportSummary[];
  strings: Pick<TranslationsData, "admin">;
  locale: Locale;
}

export default function AdminReportTable(
  { reports, strings, locale }: AdminReportTableProps,
) {
  const { admin } = strings;

  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (reports.length === 0) {
    return (
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body text-center text-base-content/60">
          <p>{admin.noReports}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="overflow-x-auto bg-base-100 rounded-lg shadow-sm">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>{admin.columns.title}</th>
            <th>{admin.columns.owner}</th>
            <th>{admin.columns.createdAt}</th>
            <th class="text-right">{admin.columns.commentCount}</th>
            <th>{admin.columns.status}</th>
            <th>{admin.columns.shareUrl}</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td class="font-medium max-w-xs truncate" title={report.title}>
                {report.title}
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm">{report.ownerName}</span>
                  <span class="text-xs text-base-content/60">
                    {report.ownerEmail}
                  </span>
                </div>
              </td>
              <td class="text-sm">
                {new Date(report.createdAt).toLocaleDateString(
                  locale === "ja" ? "ja-JP" : "en-US",
                  dateFormatOptions,
                )}
              </td>
              <td class="text-right">{report.commentCount}</td>
              <td>
                {report.shareEnabled
                  ? (
                    <span class="badge badge-success badge-sm">
                      {admin.enabled}
                    </span>
                  )
                  : (
                    <span class="badge badge-ghost badge-sm">
                      {admin.disabled}
                    </span>
                  )}
              </td>
              <td>
                <a
                  href={report.shareUrl}
                  class="link link-primary text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {report.shareUrl}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
