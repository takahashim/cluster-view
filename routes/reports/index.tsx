import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
import { getReportsByOwner, type User } from "@/lib/repository.ts";
import ReportsList from "@/islands/ReportsList.tsx";
import Header from "@/components/Header.tsx";

interface ReportSummary {
  id: string;
  title: string;
  shareToken: string;
  createdAt: string;
}

export const handler = define.handlers({
  async GET(ctx) {
    const user = await getCurrentUser(ctx.req);

    if (!user) {
      // Redirect to home with login prompt
      return new Response(null, {
        status: 303,
        headers: { Location: "/?login=required" },
      });
    }

    const reports = await getReportsByOwner(user.id);

    return {
      data: {
        user,
        reports: reports.map((r) => ({
          id: r.id,
          title: r.title,
          shareToken: r.shareToken,
          createdAt: r.createdAt,
        })),
      },
    };
  },
});

export default define.page<typeof handler>(function ReportsPage({ data }) {
  const { user, reports } = data as { user: User; reports: ReportSummary[] };

  return (
    <>
      <Head>
        <title>マイレポート - Cluster View</title>
      </Head>
      <div class="min-h-screen bg-base-200">
        <Header user={user} showReportsLink={false} />

        <main class="max-w-4xl mx-auto p-4 md:p-6">
          <h1 class="text-2xl font-bold mb-6">マイレポート</h1>
          <ReportsList initialReports={reports} />
        </main>
      </div>
    </>
  );
});
