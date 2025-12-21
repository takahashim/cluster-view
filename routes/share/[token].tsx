import { Head } from "fresh/runtime";
import { HttpError } from "fresh";
import { define } from "@/utils.ts";
import { getReportByToken } from "@/lib/db.ts";
import type { HierarchicalResult } from "@/lib/types.ts";
import ReportView from "@/islands/ReportView.tsx";

interface PageData {
  data: HierarchicalResult;
  title: string;
  shareToken: string;
}

export const handler = define.handlers({
  async GET(ctx) {
    const token = ctx.params.token;

    const report = await getReportByToken(token);

    if (!report || !report.shareEnabled) {
      throw new HttpError(404, "Report not found");
    }

    return {
      data: {
        data: report.data,
        title: report.title || "分析結果",
        shareToken: report.shareToken,
      } as PageData,
    };
  },
});

export default define.page<typeof handler>(function SharePage({ data }) {
  const { data: reportData, title, shareToken } = data;

  return (
    <>
      <Head>
        <title>{title} - Broadlistening</title>
        <meta name="description" content={reportData.overview.slice(0, 160)} />
        <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
      </Head>
      <ReportView data={reportData} title={title} shareToken={shareToken} />
    </>
  );
});
