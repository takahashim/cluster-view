import { Head } from "fresh/runtime";
import { HttpError } from "fresh";
import { define } from "@/utils.ts";
import { getReportByToken } from "@/lib/repository.ts";
import type { Report } from "@/lib/types.ts";
import ReportView from "@/islands/ReportView.tsx";
import Overview from "@/components/Overview.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const report = await getReportByToken(ctx.params.token);

    if (!report || !report.data) {
      throw new HttpError(404, "Report not found");
    }

    const { common, reportView } = ctx.state.translations;

    return {
      data: {
        report,
        locale: ctx.state.locale,
        strings: { common, reportView },
      },
    };
  },
});

export default define.page<typeof handler>(function SharePage({ data }) {
  const report: Report = data.report;
  const reportData = report.data!; // Guaranteed by handler check
  const commentCount = reportData.comment_num ||
    Object.keys(reportData.comments).length;
  const { common } = data.strings;

  return (
    <>
      <Head>
        <title>{report.title} - Cluster View</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content={reportData.overview.slice(0, 160)} />
        <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
      </Head>
      <ReportView
        data={reportData}
        shareToken={report.shareToken}
        strings={data.strings}
        locale={data.locale}
      >
        <Overview
          title={report.title}
          commentCount={commentCount}
          overview={reportData.overview}
          strings={{ common }}
        />
      </ReportView>
    </>
  );
});
