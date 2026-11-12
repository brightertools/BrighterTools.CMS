using System.Net;
using System.Text;
using System.Text.Json.Nodes;

namespace BrighterTools.Cms.Collections;

// The stored editor tree is the authority. HTML supplied by a client is never trusted.
public static class RichText
{
    public static bool SafeUrl(string value) => !string.IsNullOrWhiteSpace(value) && !value.Any(char.IsControl)
        && !value.Contains('\\') && (value.StartsWith('/') && !value.StartsWith("//")
        || Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http" or "mailto" or "tel");

    public static RichTextValue Normalize(RichTextValue? value, bool headings)
    {
        value ??= new();
        if (value.Json is null) { value.Html = ""; value.PlainText = ""; return value; }
        if (value.Json.ToJsonString().Length > 300000) throw new FormatException("Text is too long.");
        var text = new StringBuilder(); var count = 0;
        string Visit(JsonNode node, int depth)
        {
            if (node is not JsonObject) throw new FormatException("Invalid editor node.");
            if (depth > 20 || ++count > 10000) throw new FormatException("Text is too complex.");
            var type = node["type"]?.GetValue<string>() ?? "";
            if ((depth == 0) != (type == "root")) throw new FormatException("Invalid editor document root.");
            if (type == "text") {
                var raw = node["text"]?.GetValue<string>() ?? ""; text.Append(raw);
                var html = WebUtility.HtmlEncode(raw); var format = node["format"]?.GetValue<int>() ?? 0;
                if ((format & 1) != 0) html = "<strong>" + html + "</strong>";
                if ((format & 2) != 0) html = "<em>" + html + "</em>";
                node["style"] = ""; return html;
            }
            if (type == "linebreak") { text.Append('\n'); return "<br />"; }
            if (type is not ("root" or "paragraph" or "heading" or "quote" or "list" or "listitem" or "link" or "autolink"))
                throw new FormatException("Unsupported text formatting.");
            if (node["children"] is not JsonArray children) throw new FormatException("Invalid editor children.");
            var body = string.Concat(children.Select(child => Visit(child!, depth + 1)));
            if (type == "root") return body;
            if (type is "link" or "autolink") {
                var url = node["url"]?.GetValue<string>() ?? "";
                if (!SafeUrl(url)) throw new FormatException("Use a local, web, email or telephone link.");
                var target = node["target"]?.GetValue<string>() == "_blank" ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
                return "<a href=\"" + WebUtility.HtmlEncode(url) + "\"" + target + ">" + body + "</a>";
            }
            var tag = type switch { "heading" when headings => node["tag"]?.GetValue<string>() == "h3" ? "h3" : "h2", "quote" when headings => "blockquote",
                "list" => node["listType"]?.GetValue<string>() == "number" ? "ol" : "ul", "listitem" => "li", _ => "p" };
            text.Append('\n'); return $"<{tag}>{body}</{tag}>";
        }
        var root = value.Json["root"] ?? throw new FormatException("Invalid editor document.");
        value.Html = Visit(root, 0); value.PlainText = text.ToString().Trim(); return value;
    }
}
