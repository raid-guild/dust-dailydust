/**
 * Minimal markdown renderer for converting markdown text to HTML
 * 
 * Supports the following markdown features:
 * - Headings: # H1, ## H2, ### H3
 * - Bold text: **text** or __text__
 * - Italic text: *text* or _text_
 * - Lists: - item or * item
 * - Paragraphs with proper spacing
 * - Drop-cap styling for the first letter of articles
 * 
 * This renderer is designed to be lightweight and secure, with proper HTML escaping
 * to prevent XSS attacks.
 */
export function renderMarkdownToHtml(md: string) {
    // HTML escape function to prevent XSS attacks
    const escapeHtml = (s: string) =>
        s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    if (!md) return "";

    // Normalize line endings to handle different operating systems
    const text = md.replace(/\r\n?/g, "\n");
    const lines = text.split("\n");

    let html = "";
    let inList = false;

    // Helper function to convert paragraph buffer to HTML
    const flushParagraph = (p: string) => {
        if (!p) return "";
        return `<p>${p.replace(/\n/g, "<br />")}</p>`;
    };

    let paraBuf: string[] = [];

    // Helper function to flush accumulated paragraph content
    const pushPara = () => {
        if (paraBuf.length === 0) return;
        html += flushParagraph(paraBuf.join("\n"));
        paraBuf = [];
    };

    // Process each line of markdown
    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];

        // Check for list items (lines starting with - or *)
        if (/^\s*([-*])\s+/.test(ln)) {
            // Flush any pending paragraph content
            pushPara();
            if (!inList) {
                inList = true;
                html += "<ul>";
            }
            const item = ln.replace(/^\s*([-*])\s+/, "");
            let content = escapeHtml(item);
            // Apply inline formatting (bold, italic) to list items
            content = content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            content = content.replace(/\*(.+?)\*/g, "<em>$1</em>");
            html += `<li>${content}</li>`;
            continue;
        } else {
            // Close list if we were in one and this line isn't a list item
            if (inList) {
                html += "</ul>";
                inList = false;
            }
        }

        // Check for headings (# H1, ## H2, ### H3)
        const h1 = ln.match(/^\s*#\s+(.*)/);
        const h2 = ln.match(/^\s*##\s+(.*)/);
        const h3 = ln.match(/^\s*###\s+(.*)/);

        if (h1) {
            pushPara();
            html += `<h1>${escapeHtml(h1[1])
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")}</h1>`;
            continue;
        }
        if (h2) {
            pushPara();
            html += `<h2>${escapeHtml(h2[1])
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")}</h2>`;
            continue;
        }
        if (h3) {
            pushPara();
            html += `<h3>${escapeHtml(h3[1])
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")}</h3>`;
            continue;
        }

        // Empty line creates paragraph break with visual spacing
        if (ln.trim() === "") {
            if (paraBuf.length > 0) pushPara();
            html += '<div style="height:1rem"></div>';
            continue;
        }

        // Accumulate regular text into paragraph buffer with inline formatting
        paraBuf.push(
            escapeHtml(ln)
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
        );
    }

    // Close any open list and flush remaining paragraph content
    if (inList) html += "</ul>";
    pushPara();

    // Add drop-cap styling for the first letter of the first paragraph
    // This creates a newspaper-style large first letter effect
    if (html.startsWith("<p>")) {
        // Handle case where paragraph starts with <strong> tag
        html = html.replace(
            /^<p>(\s*)<strong>(\s*)([^<\s])/,
            '<p>$1<strong>$2<span style="float:left;font-size:3rem;line-height:1;margin-right:0.5rem;">$3</span>'
        );
        // Handle regular paragraph start
        html = html.replace(
            /^<p>(\s*)([^<\s])/,
            '<p>$1<span style="float:left;font-size:3rem;line-height:1;margin-right:0.5rem;">$2</span>'
        );
    }

    return html;
}
