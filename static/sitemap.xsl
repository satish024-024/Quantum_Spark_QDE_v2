<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <title>Sitemap — Quantum Jobs Tracker</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="robots" content="noindex, follow"/>
        <link rel="icon" href="/static/favicon.ico"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --bg: #0a0a0f;
            --surface: #111118;
            --border: #1e1e2e;
            --accent: #00d4ff;
            --accent-dim: rgba(0,212,255,0.12);
            --text: #e2e8f0;
            --muted: #64748b;
            --green: #22c55e;
            --amber: #f59e0b;
          }
          body {
            background: var(--bg);
            color: var(--text);
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            min-height: 100vh;
            padding: 0 0 64px;
          }
          header {
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            padding: 20px 40px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .logo-icon {
            width: 36px; height: 36px;
            background: var(--accent-dim);
            border: 1px solid rgba(0,212,255,0.3);
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
          }
          .brand { font-size: 16px; font-weight: 600; color: var(--text); }
          .brand span { color: var(--accent); }
          .tag {
            margin-left: auto;
            background: var(--accent-dim);
            color: var(--accent);
            border: 1px solid rgba(0,212,255,0.25);
            border-radius: 4px;
            padding: 3px 10px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .container { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
          h1 {
            font-size: 22px; font-weight: 700;
            color: var(--text); margin-bottom: 6px;
          }
          .subtitle {
            color: var(--muted); font-size: 13px; margin-bottom: 32px;
          }
          .subtitle a { color: var(--accent); text-decoration: none; }
          .stats {
            display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap;
          }
          .stat {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 20px;
            min-width: 140px;
          }
          .stat-label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
          .stat-value { color: var(--accent); font-size: 22px; font-weight: 700; margin-top: 2px; }
          table {
            width: 100%; border-collapse: collapse;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
          }
          thead { background: #0d0d17; }
          th {
            padding: 12px 18px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.07em;
            border-bottom: 1px solid var(--border);
          }
          td {
            padding: 13px 18px;
            border-bottom: 1px solid rgba(30,30,46,0.6);
            vertical-align: middle;
          }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: rgba(0,212,255,0.03); }
          .url-link {
            color: var(--accent);
            text-decoration: none;
            font-weight: 500;
            word-break: break-all;
          }
          .url-link:hover { text-decoration: underline; }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          }
          .badge-high { background: rgba(34,197,94,0.12); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
          .badge-med  { background: rgba(245,158,11,0.12); color: var(--amber); border: 1px solid rgba(245,158,11,0.2); }
          .badge-low  { background: rgba(100,116,139,0.12); color: var(--muted); border: 1px solid rgba(100,116,139,0.2); }
          .muted { color: var(--muted); font-size: 12px; }
          footer {
            margin-top: 40px; text-align: center;
            color: var(--muted); font-size: 12px;
          }
          footer a { color: var(--accent); text-decoration: none; }
        </style>
      </head>
      <body>
        <header>
          <div class="logo-icon">⚛</div>
          <div class="brand">Quantum <span>Jobs Tracker</span></div>
          <div class="tag">Sitemap</div>
        </header>
        <div class="container">
          <h1>XML Sitemap</h1>
          <p class="subtitle">
            This sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs indexed for <a href="https://quantumjobstracker.vercel.app">quantumjobstracker.vercel.app</a>.
            Generated for Google Search Console submission.
          </p>
          <div class="stats">
            <div class="stat">
              <div class="stat-label">Total URLs</div>
              <div class="stat-value"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
            </div>
            <div class="stat">
              <div class="stat-label">High Priority</div>
              <div class="stat-value" style="color:#22c55e">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url[sitemap:priority >= 0.8])"/>
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>URL</th>
                <th>Priority</th>
                <th>Change Freq</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <xsl:sort select="sitemap:priority" order="descending" data-type="number"/>
                <tr>
                  <td class="muted"><xsl:value-of select="position()"/></td>
                  <td>
                    <a class="url-link" href="{sitemap:loc}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="sitemap:priority >= 0.8">
                        <span class="badge badge-high"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:when>
                      <xsl:when test="sitemap:priority >= 0.5">
                        <span class="badge badge-med"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:when>
                      <xsl:otherwise>
                        <span class="badge badge-low"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td class="muted"><xsl:value-of select="sitemap:changefreq"/></td>
                  <td class="muted"><xsl:value-of select="sitemap:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          <footer>
            <p>© 2026 <a href="https://quantumjobstracker.vercel.app">Quantum Jobs Tracker</a> · Rajahmundry, Andhra Pradesh, India ·
            <a href="mailto:prakashkadali3723@gmail.com">prakashkadali3723@gmail.com</a></p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
