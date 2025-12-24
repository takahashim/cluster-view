import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
import { isAdmin } from "@/lib/admin.ts";
import {
  type AdminReportSummary,
  getAllReportsForAdmin,
  type User,
} from "@/lib/repository.ts";
import type { Locale, TranslationsData } from "@/lib/i18n/index.ts";
import Header from "@/components/Header.tsx";
import AdminReportTable from "@/components/AdminReportTable.tsx";

type PageStrings = Pick<TranslationsData, "common" | "admin">;
interface PageData {
  user: User;
  reports: AdminReportSummary[];
  locale: Locale;
  strings: PageStrings;
}

export const handler = define.handlers({
  async GET(ctx) {
    const user = await getCurrentUser(ctx.req);

    // Require login
    if (!user) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/?login=required" },
      });
    }

    // Require admin
    if (!isAdmin(user.email)) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/" },
      });
    }

    const reports = await getAllReportsForAdmin();
    const { common, admin } = ctx.state.translations;

    return {
      data: {
        user,
        reports,
        locale: ctx.state.locale,
        strings: { common, admin },
      },
    };
  },
});

export default define.page<typeof handler>(function AdminPage({ data }) {
  const { user, reports, locale, strings } = data as PageData;
  const { common, admin } = strings;

  return (
    <>
      <Head>
        <title>{admin.pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div class="min-h-screen bg-base-200">
        <Header
          user={user}
          showReportsLink
          isAdmin
          strings={{ common }}
          locale={locale}
        />

        <main class="max-w-7xl mx-auto p-4 md:p-6">
          <h1 class="text-2xl font-bold mb-2">{admin.title}</h1>
          <p class="text-base-content/60 mb-6">{admin.reportList}</p>
          <AdminReportTable
            reports={reports}
            strings={{ admin }}
            locale={locale}
          />
        </main>
      </div>
    </>
  );
});
