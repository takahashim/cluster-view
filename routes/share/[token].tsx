import { Head } from "fresh/runtime";
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

    if (!report) {
      return ctx.render(undefined);
    }

    if (!report.shareEnabled) {
      return ctx.render(undefined);
    }

    return ctx.render({
      data: report.data,
      title: report.title || "分析結果",
      shareToken: report.shareToken,
    });
  },
});

export default define.page<PageData | undefined>(function SharePage(ctx) {
  if (!ctx.data) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-base-200">
        <Head>
          <title>レポートが見つかりません</title>
        </Head>
        <div class="text-center">
          <h1 class="text-7xl font-bold text-base-content/20">404</h1>
          <p class="text-lg text-base-content/60 mt-4 mb-6">レポートが見つかりません</p>
          <a href="/" class="btn btn-primary">トップページに戻る</a>
        </div>
      </div>
    );
  }

  const { data, title, shareToken } = ctx.data;

  return (
    <>
      <Head>
        <title>{title} - Broadlistening</title>
        <meta name="description" content={data.overview.slice(0, 160)} />
        <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
      </Head>
      <ReportView data={data} title={title} shareToken={shareToken} />
    </>
  );
});
