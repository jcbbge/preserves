export default function NotFound() {
  return (
    <div class="not-found">
      <div class="content">
        <h1>404</h1>
        <p>Page not found</p>
        <a href="/">Return Home</a>
      </div>

      <style>{`
        .not-found {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--peach-background);
          color: var(--text-dark);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        }

        .content {
          text-align: center;
          padding: 2rem;
        }

        h1 {
          font-size: 6rem;
          margin: 0;
          color: var(--peach-primary);
        }

        p {
          font-size: 1.5rem;
          margin: 1rem 0 2rem;
        }

        a {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background-color: var(--peach-primary);
          color: var(--text-light);
          text-decoration: none;
          border-radius: 8px;
          transition: all var(--transition-duration);
        }

        a:hover {
          background-color: var(--peach-dark);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
