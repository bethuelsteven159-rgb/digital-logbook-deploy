import { useState } from "react";
import {
  AlertCircle,
  PlayCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { fetchLearningVideos } from "../../api/projectDetailsApi";

export default function LearningVideos({ projectId, projectName = "" }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await fetchLearningVideos(projectId, query);
      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to load learning videos.");
    } finally {
      setLoading(false);
    }
  }

  const videos = Array.isArray(result?.videos) ? result.videos : [];

  return (
    <>
      <section className="lv-shell">
        <div className="lv-top">
          <div className="lv-heading">
            <div className="lv-icon">
              <PlayCircle size={23} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="lv-title">Learning videos</h2>
              <p className="lv-description">
                Find YouTube tutorials for this project. Leave the box empty
                to search using the project name
                {projectName ? ` (${projectName})` : ""}.
              </p>
            </div>
          </div>

          <form className="lv-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="lv-input"
              placeholder="Search a topic (optional)"
              aria-label="Learning video search"
              value={query}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="lv-button" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="lv-spinner" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Find Learning Videos
                </>
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="lv-error" role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>Unable to load videos</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && !error && videos.length === 0 && (
          <p className="lv-muted">
            No videos found. Try a different search term.
          </p>
        )}

        {videos.length > 0 && (
          <ul className="lv-list">
            {videos.map((video) => (
              <li key={video.videoId} className="lv-card">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lv-link"
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="lv-thumb"
                      loading="lazy"
                    />
                  ) : (
                    <div className="lv-thumb lv-thumb-empty" />
                  )}
                  <span className="lv-video-title">{video.title}</span>
                  <span className="lv-channel">{video.channel}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <style>{`
        .lv-shell {
          margin: 20px 0 24px;
          border: 1px solid #dbe4ff;
          border-radius: 18px;
          background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }
        .lv-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 22px 24px;
        }
        .lv-heading {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }
        .lv-icon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 13px;
          color: #ffffff;
          background: linear-gradient(135deg, #dc2626, #ef4444);
        }
        .lv-title {
          margin: 0;
          color: #172033;
          font-size: 19px;
          font-weight: 750;
        }
        .lv-description {
          max-width: 520px;
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }
        .lv-form {
          display: flex;
          gap: 9px;
          flex: 0 0 auto;
        }
        .lv-input {
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid #d9dcf8;
          border-radius: 10px;
          font: inherit;
          font-size: 13px;
          min-width: 200px;
        }
        .lv-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 16px;
          border: 0;
          border-radius: 10px;
          color: #ffffff;
          background: linear-gradient(135deg, #4f46e5, #6d4de8);
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .lv-button:disabled {
          cursor: wait;
          opacity: 0.72;
        }
        .lv-spinner {
          animation: lv-spin 0.9s linear infinite;
        }
        @keyframes lv-spin {
          to { transform: rotate(360deg); }
        }
        .lv-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 24px 14px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #991b1b;
          background: #fff7f7;
          font-size: 13px;
        }
        .lv-error div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lv-muted {
          margin: 0;
          padding: 0 24px 22px;
          color: #94a3b8;
          font-size: 13px;
        }
        .lv-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 14px;
          margin: 0;
          padding: 0 24px 24px;
          list-style: none;
        }
        .lv-card {
          border: 1px solid #e5eaf4;
          border-radius: 13px;
          background: #ffffff;
          overflow: hidden;
        }
        .lv-link {
          display: flex;
          flex-direction: column;
          gap: 4px;
          height: 100%;
          color: inherit;
          text-decoration: none;
        }
        .lv-thumb {
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          background: #e2e8f0;
        }
        .lv-video-title {
          padding: 8px 12px 0;
          color: #1f2937;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }
        .lv-channel {
          padding: 0 12px 12px;
          color: #64748b;
          font-size: 12px;
        }
        @media (max-width: 760px) {
          .lv-top {
            align-items: stretch;
            flex-direction: column;
          }
          .lv-form {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
