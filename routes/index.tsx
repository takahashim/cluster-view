import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import FileUploader from "../islands/FileUploader.tsx";

export default define.page(function Home() {
  return (
    <div class="page-container">
      <Head>
        <title>Broadlistening - レポートビューア</title>
        <meta name="description" content="hierarchical_result.jsonをアップロードして可視化" />
      </Head>

      <main class="main-content">
        <div class="header">
          <h1 class="title">Broadlistening</h1>
          <p class="subtitle">
            hierarchical_result.json をアップロードして、
            <br />
            分析結果を可視化・共有できます
          </p>
        </div>

        <FileUploader />

        <div class="features">
          <div class="feature">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3>インタラクティブな可視化</h3>
            <p>スキャッタープロットで意見の分布を確認</p>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <h3>クラスタ別の閲覧</h3>
            <p>階層的なクラスタ構造をドリルダウン</p>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <h3>簡単シェア</h3>
            <p>URLを共有して第三者と結果を共有</p>
          </div>
        </div>
      </main>

      <style>{`
        .page-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }

        .main-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 48px;
        }

        .title {
          font-size: 48px;
          font-weight: 700;
          color: white;
          margin: 0 0 16px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-top: 64px;
        }

        .feature {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }

        .feature-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          margin-bottom: 16px;
          color: white;
        }

        .feature h3 {
          font-size: 16px;
          font-weight: 600;
          color: white;
          margin: 0 0 8px;
        }

        .feature p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 600px) {
          .title {
            font-size: 36px;
          }

          .subtitle {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
});
