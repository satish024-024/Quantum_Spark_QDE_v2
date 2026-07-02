<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <title>Sitemap Index — Quantum Jobs Tracker</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="robots" content="noindex, follow"/>
        <link rel="icon" href="/static/favicon.ico"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --bg: #0a0a0f; --surface: #111118; --border: #1e1e2e;
            --accent: #00d4ff; --accent-dim: rgba(0,212,255,0.12);
            --text: #e2e8f0; --muted: #64748b;
          }
          body {
            background: var(--bg); color: var(--text);
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 14px; min-height: 100vh; padding: 0 0 64px;
          }
          header {
            background: var(--surface); border-bottom: 1px solid var(--border);
            padding: 20px 40px; display: flex; align-items: center; gap: 16px;
          }
          .logo-icon {
            width: 36px; height: 36px; background: var(--accent-dim);
            border: 1px solid rgba(0,212,255,0.3); border-radius: 8px;
            display: flex; align-items: center; justify-content: center; font-size: 18px;
          }
          .brand { font-size: 16px; font-weight: 600; color: var(--text); }
          .brand span { color: var(--accent); }
          .tag {
            margin-left: auto; background: var(--accent-dim); color: var(--accent);
            border: 1px solid rgba(0,212,255,0.25); border-radius: 4px;
            padding: 3px 10px; font-size: 11px; font-weight: 600;
            letter-spacing: 0.05em; text-transform: uppercase;
          }
          .container { max-width: 860px; margin: 0 auto; padding: 40px 24px; }
          h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
          .subtitle { color: var(--muted); font-size: 13px; margin-bottom: 32px; }
          .subtitle a { color: var(--accent); text-decoration: none; }
          .cards { display: flex; flex-direction: column; gap: 12px; }
          .card {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 10px; padding: 20px 24px;
            display: flex; align-items: center; gap: 16px;
            transition: border-color 0.2s;
          }
          .card:hover { border-color: rgba(0,212,255,0.3); }
          .card-icon {
            width: 40px; height: 40px; background: var(--accent-dim);
            border: 1px solid rgba(0,212,255,0.2); border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; flex-shrink: 0;
          }
          .card-body { flex: 1; }
          .card-title { font-weight: 600; font-size: 14px; margin-bottom: 3px; }
          .card-url a { color: var(--accent); text-decoration: none; font-size: 12px; word-break: break-all; }
          .card-url a:hover { text-decoration: underline; }
          .card-meta { color: var(--muted); font-size: 12px; margin-top: 4px; }
          .arrow { color: var(--muted); font-size: 18px; }
          footer { margin-top: 40px; text-align: center; color: var(--muted); font-size: 12px; }
          footer a { color: var(--accent); text-decoration: none; }
        </style>
      </head>
      <body>
        <header>
          <div class="logo-icon">⚛</div>
          <div class="brand">Quantum <span>Jobs Tracker</span></div>
          <div class="tag">Sitemap Index</div>
        </header>
        <div class="container">
          <h1>Sitemap Index</h1>
          <p class="subtitle">
            This index references <strong><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></strong> sub-sitemap(s) for
            <a href="https://quantumjobstracker.vercel.app">quantumjobstracker.vercel.app</a>.
            Submit <a href="https://quantumjobstracker.vercel.app/sitemap.xml">this URL</a> to Google Search Console.
          </p>
          <div class="cards">
            <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
              <div class="card">
                <div class="card-icon">🗺</div>
                <div class="card-body">
                  <div class="card-title">
                    <xsl:choose>
                      <xsl:when test="contains(sitemap:loc, 'pages')">Pages Sitemap</xsl:when>
                      <xsl:when test="contains(sitemap:loc, 'app')">App Features Sitemap</xsl:when>
                      <xsl:otherwise>Sitemap</xsl:otherwise>
                    </xsl:choose>
                  </div>
                  <div class="card-url">
                    <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                  </div>
                  <div class="card-meta">Last modified: <xsl:value-of select="sitemap:lastmod"/></div>
                </div>
                <div class="arrow">›</div>
              </div>
            </xsl:for-each>
          </div>
          <footer>
            <p>© 2026 <a href="https://quantumjobstracker.vercel.app">Quantum Jobs Tracker</a> ·
            Rajahmundry, Andhra Pradesh, India ·
            <a href="mailto:prakashkadali3723@gmail.com">prakashkadali3723@gmail.com</a></p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
