using System.Text.Json;
using System.Text.RegularExpressions;

namespace BrighterTools.Cms.Collections;

// Hosts persist these transitions in one transaction using Revision as a concurrency token.
public sealed class ListedContentWorkflow
{
    public ListedRevision SaveDraft(ListedItem item, long expected, string slug, ListedContentData data, int? author, DateTimeOffset now)
    {
        Check(item, expected);
        if (!ContentTypes.All.Contains(item.Type)) throw new ContentValidationException(new() { ["type"] = ["Choose a valid content type."] });
        if (!Regex.IsMatch(slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$") || slug.Length > 160)
            throw new ContentValidationException(new() { ["slug"] = ["Use lowercase letters, numbers and hyphens (maximum 160 characters)."] });
        if (item.EverPublished && slug != item.Slug) throw new ContentValidationException(new() { ["slug"] = ["Published URLs cannot be changed."] });
        Normalize(data, item.Type, false);
        item.Slug = slug; item.DraftNumber++; item.Revision++; item.UpdatedUtc = now;
        var version = new ListedRevision { ItemId = item.Id, Number = item.DraftNumber, Heading = data.Heading, SearchText = data.ShortText.PlainText + "\n" + (data.ShowAdditionalPage ? data.LongText.PlainText : ""),
            ListingDate = data.ListingDate, Start = data.Start, End = data.End, CreatedUtc = now, AuthorId = author, Data = JsonSerializer.Serialize(data, ContentTypes.Json) };
        item.Versions.Add(version); return version;
    }
    public void Publish(ListedItem item, long expected, DateTimeOffset now)
    {
        Check(item, expected); var draft = item.Versions.Single(x => x.Number == item.DraftNumber);
        Normalize(draft.Read(), item.Type, true);
        item.PublishedNumber = draft.Number; item.EverPublished = true; item.Revision++; item.UpdatedUtc = now;
    }
    public void Change(ListedItem item, long expected, string action, bool? enabled, DateTimeOffset now)
    {
        Check(item, expected);
        switch (action) { case "enabled": item.Enabled = enabled ?? throw new ArgumentException("Enabled is required."); break;
            case "unpublish": item.PublishedNumber = null; break; case "delete": item.Deleted = true; item.PublishedNumber = null; break;
            default: throw new ArgumentException("Unknown action."); }
        item.Revision++; item.UpdatedUtc = now;
    }
    public static void Check(ListedItem item, long expected) { if (item.Revision != expected || item.Deleted) throw new ContentConflictException(); }
    public static void Normalize(ListedContentData data, string type, bool publish)
    {
        data.ListingDate = data.ListingDate.ToUniversalTime(); data.Start = data.Start?.ToUniversalTime(); data.End = data.End?.ToUniversalTime();
        if (type == "newsletter") data.ShowAdditionalPage = false;
        var errors = new Dictionary<string, string[]>();
        void Error(string key, string message) => errors[key] = [message];
        if (string.IsNullOrWhiteSpace(data.Heading) || data.Heading.Length > 250) Error("heading", "Enter a heading of up to 250 characters.");
        foreach (var (name, value, headings) in new[] { ("shortText", data.ShortText, false), ("longText", data.LongText, true), ("headerQuote", data.HeaderQuote, false), ("homeQuote", data.HomeQuote, false) })
            try { RichText.Normalize(value, headings); } catch (Exception e) when (e is FormatException or InvalidOperationException) { Error(name, e.Message); }
        if (data.Start.HasValue && data.End.HasValue && data.End <= data.Start) Error("end", "End must be after Start.");
        if (data.BottomLink.Length > 2048 || data.BottomLink.Length > 0 && !RichText.SafeUrl(data.BottomLink)) Error("bottomLink", "Use a local, web or email link.");
        if (!new[] { "orange", "yellow", "blue", "white" }.Contains(data.Theme) || !new[] { "orange", "yellow", "blue" }.Contains(data.HomeTheme)) Error("theme", "Choose a configured colour pair.");
        if (data.Gallery.Count > 100) Error("gallery", "Use at most 100 gallery images.");
        foreach (var (key, value, limit) in new[] { ("linkText", data.LinkText, 250), ("seoTitle", data.SeoTitle, 250), ("seoDescription", data.SeoDescription, 1000), ("detailHeading", data.DetailHeading, 250), ("homeHeading", data.HomeHeading, 250), ("backText", data.BackText, 250) })
            if (value?.Length > limit) Error(key, $"Use {limit} characters or fewer.");
        if (publish) {
            if (type != "newsletter" && data.ShowAdditionalPage && string.IsNullOrWhiteSpace(data.LongText.PlainText)) Error("longText", "Enter Long Text for the additional page.");
            if (!data.ShowAdditionalPage && data.BottomLink.Length > 0 && string.IsNullOrWhiteSpace(data.LinkText)) Error("linkText", "Enter link text.");
            if (type == "upcoming-event" && data.DisplayDate is null) Error("displayDate", "Enter the display date.");
            if (type == "newsletter" && (data.Document is null || data.Image is null)) Error("document", "Choose a PDF and a cover image.");
        }
        if (data.ImageSide is not ("left" or "right") || data.HomeImageSide is not ("left" or "right")) Error("imageSide", "Choose left or right.");
        foreach (var media in data.Media()) { media.Url = null; if (media.Alt.Length > 500) Error("image", "Alternative text must be 500 characters or fewer."); }
        if (errors.Count > 0) throw new ContentValidationException(errors);
    }
}
