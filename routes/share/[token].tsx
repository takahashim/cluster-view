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
      <div class="error-page">
        <Head>
          <title>レポートが見つかりません</title>
        </Head>
        <div class="error-content">
          <h1>404</h1>
          <p>レポートが見つかりません</p>
          <a href="/">トップページに戻る</a>
        </div>
        <style>{`
          .error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
          }
          .error-content {
            text-align: center;
          }
          .error-content h1 {
            font-size: 72px;
            font-weight: 700;
            color: #cbd5e1;
            margin: 0;
          }
          .error-content p {
            font-size: 18px;
            color: #64748b;
            margin: 16px 0 24px;
          }
          .error-content a {
            display: inline-block;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
          }
          .error-content a:hover {
            background: #2563eb;
          }
        `}</style>
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
