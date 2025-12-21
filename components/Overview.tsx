interface OverviewProps {
  title: string;
  commentCount: number;
  overview: string;
}

export default function Overview({ title, commentCount, overview }: OverviewProps) {
  return (
    <section class="overview">
      <h1 class="overview-title">{title}</h1>
      <div class="overview-meta">
        <span class="comment-count">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {commentCount.toLocaleString()} 件の意見
        </span>
      </div>
      <p class="overview-text">{overview}</p>

      <style>{`
        .overview {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .overview-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px;
        }

        .overview-meta {
          margin-bottom: 16px;
        }

        .comment-count {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #64748b;
        }

        .overview-text {
          font-size: 15px;
          line-height: 1.7;
          color: #334155;
          margin: 0;
        }
      `}</style>
    </section>
  );
}
