import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import FileUploader from "../islands/FileUploader.tsx";

export default define.page(function Home() {
  return (
    <div class="min-h-screen bg-base-200 p-6 md:p-10">
      <Head>
        <title>Cluster View - レポートビューア</title>
        <meta
          name="description"
          content="hierarchical_result.jsonをアップロードして可視化"
        />
      </Head>

      <main class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-bold text-base-content mb-4">
            Cluster View
          </h1>
          <p class="text-lg text-base-content/70">
            <a
              href="https://dd2030.org/kouchou-ai/"
              class="link link-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              広聴AI
            </a>のhierarchical_result.json をアップロードして、
            <br />
            分析結果を可視化・共有できます
          </p>
        </div>

        <FileUploader />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body items-center text-center">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" stroke-width="2" />
                  <circle cx="12" cy="12" r="3" stroke-width="2" />
                </svg>
              </div>
              <h3 class="card-title text-base">
                インタラクティブな可視化
              </h3>
              <p class="text-base-content/60 text-sm">
                スキャッタープロットで意見の分布を確認
              </p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body items-center text-center">
              <div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3 class="card-title text-base">
                クラスタ別の閲覧
              </h3>
              <p class="text-base-content/60 text-sm">
                階層的なクラスタ構造をドリルダウン
              </p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body items-center text-center">
              <div class="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <h3 class="card-title text-base">
                簡単シェア
              </h3>
              <p class="text-base-content/60 text-sm">
                URLを共有して第三者と結果を共有
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});
