import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
import { isAdmin } from "@/lib/admin.ts";
import { getReportsByOwner, type User } from "@/lib/repository.ts";
import type { Locale, TranslationsData } from "@/lib/i18n/index.ts";
import ReportsList from "@/islands/ReportsList.tsx";
import Header from "@/components/Header.tsx";

interface ReportSummary {
  id: string;
  title: string;
  shareToken: string;
  createdAt: string;
}

type PageStrings = Pick<TranslationsData, "common" | "reports">;
interface PageData {
  user: User;
  reports: ReportSummary[];
  locale: Locale;
  strings: PageStrings;
  isAdmin: boolean;
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
    const { common, reports: reportsStrings } = ctx.state.translations;
    const userIsAdmin = isAdmin(user.email);

    return {
      data: {
        user,
        reports: reports.map((r) => ({
          id: r.id,
          title: r.title,
          shareToken: r.shareToken,
          createdAt: r.createdAt,
        })),
        locale: ctx.state.locale,
        strings: { common, reports: reportsStrings },
        isAdmin: userIsAdmin,
      },
    };
  },
});

export default define.page<typeof handler>(function ReportsPage({ data }) {
  const { user, reports, locale, strings, isAdmin: userIsAdmin } =
    data as PageData;
  const { common, reports: reportsStrings } = strings;

  return (
    <>
      <Head>
        <title>{reportsStrings.pageTitle}</title>
      </Head>
      <div class="min-h-screen bg-base-200">
        <Header
          user={user}
          showReportsLink={false}
          isAdmin={userIsAdmin}
          strings={{ common }}
          locale={locale}
        />

        <main class="max-w-4xl mx-auto p-4 md:p-6">
          <h1 class="text-2xl font-bold mb-6">{reportsStrings.title}</h1>
          <ReportsList
            initialReports={reports}
            strings={strings}
            locale={locale}
          />
        </main>
      </div>
    </>
  );
});
