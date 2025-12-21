import { Head } from "fresh/runtime";
import { HttpError } from "fresh";
import { define } from "@/utils.ts";
import { getReportByToken } from "@/lib/repository.ts";
import type { Report } from "@/lib/types.ts";
import ReportView from "@/islands/ReportView.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const report = await getReportByToken(ctx.params.token);

    if (!report) {
      throw new HttpError(404, "Report not found");
    }

    return { data: report };
  },
});

export default define.page<typeof handler>(function SharePage({ data }) {
  const report: Report = data;

  return (
    <>
      <Head>
        <title>{report.title} - Broadlistening</title>
        <meta name="description" content={report.data.overview.slice(0, 160)} />
        <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
      </Head>
      <ReportView
        data={report.data}
        title={report.title}
        shareToken={report.shareToken}
      />
    </>
  );
});
