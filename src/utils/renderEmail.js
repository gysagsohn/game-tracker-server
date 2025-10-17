const { FRONTEND_URL } = require("./urls");

/**
 * Wrap raw body HTML in a branded, responsive template.
 *
 * @param {Object} opts
 * @param {string} opts.title     - <title> tag + heading
 * @param {string} opts.bodyHtml  - inner HTML for the message body
 * @param {string} [opts.preheader] - short preview text shown in inbox (hidden in email body)
 * @returns {string} Full HTML email
 */
function renderEmail({ title = "Game Tracker", bodyHtml = "", preheader = "" } = {}) {
  const safePre = (preheader || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const brandHref = FRONTEND_URL || "#";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  /* Client resets */
  body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img{ -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  table{ border-collapse:collapse !important; }
  body{ margin:0; padding:0; width:100%!important; background:#0f172a; color:#e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol', sans-serif; }
  /* Container */
  .wrapper{ width:100%; padding:24px; }
  .card{ max-width:600px; margin:0 auto; background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; }
  .brand{ padding:20px 24px; background:#0b1220; border-bottom:1px solid #1f2937; }
  .brand a{ color:#93c5fd; text-decoration:none; font-weight:600; font-size:16px; }
  .header{ padding:24px 24px 0; font-size:20px; font-weight:700; }
  .body{ padding:16px 24px 24px; font-size:14px; line-height:1.6; color:#d1d5db; }
  .footer{ padding:16px 24px; font-size:12px; color:#9ca3af; border-top:1px solid #1f2937; }
  .muted{ color:#9ca3af; }
  .preheader{ display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
  a.button{ display:inline-block; margin-top:12px; padding:10px 14px; border-radius:12px; text-decoration:none; background:#3b82f6; color:#fff !important; font-weight:600; }
  a{ color:#93c5fd; }
</style>
</head>
<body>
<span class="preheader">${safePre}</span>
<div class="wrapper">
  <div class="card">
    <div class="brand">
      <a href="${brandHref}">Game Tracker</a>
    </div>
    <div class="header">${title}</div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer muted">
      You’re receiving this because you have a Game Tracker account.
      If this wasn’t you, you can safely ignore this email.
    </div>
  </div>
</div>
</body>
</html>`;
}

module.exports = renderEmail;
