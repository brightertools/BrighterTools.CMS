using System.Text.Json;
using System.Text.Json.Nodes;

namespace BrighterTools.Cms.Collections;

public static class ContentTypes
{
    public static readonly string[] All = ["announcement", "recent-event", "upcoming-event", "story", "newsletter"];
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
}
public sealed class RichTextValue
{
    public JsonNode? Json { get; set; }
    public string Html { get; set; } = "";
    public string PlainText { get; set; } = "";
}
public sealed class ContentMedia
{
    public Guid Id { get; set; }
    public string Alt { get; set; } = "";
    public string? Url { get; set; }
}
public sealed class ListedContentData
{
    public string Heading { get; set; } = "";
    public string? DetailHeading { get; set; }
    public RichTextValue ShortText { get; set; } = new();
    public RichTextValue LongText { get; set; } = new();
    public bool ShowAdditionalPage { get; set; }
    public string BottomLink { get; set; } = "";
    public string LinkText { get; set; } = "";
    public bool OpenInNewWindow { get; set; }
    public ContentMedia? Image { get; set; }
    public ContentMedia? PageImage { get; set; }
    public ContentMedia? HeaderImage { get; set; }
    public ContentMedia? HomeImage { get; set; }
    public ContentMedia? Document { get; set; }
    public List<ContentMedia> Gallery { get; set; } = [];
    public DateTimeOffset ListingDate { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? Start { get; set; }
    public DateTimeOffset? End { get; set; }
    public DateOnly? DisplayDate { get; set; }
    public RichTextValue HeaderQuote { get; set; } = new();
    public RichTextValue HomeQuote { get; set; } = new();
    public string? HomeHeading { get; set; }
    public string Theme { get; set; } = "orange";
    public string HomeTheme { get; set; } = "orange";
    public string ImageSide { get; set; } = "right";
    public string HomeImageSide { get; set; } = "right";
    public bool ShowOnHomepage { get; set; }
    public string? BackText { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public IEnumerable<ContentMedia> Media() => new[] { Image, PageImage, HeaderImage, HomeImage, Document }.OfType<ContentMedia>().Concat(Gallery);
}
public sealed class ListedItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int TenantId { get; set; }
    public string Type { get; set; } = "";
    public string Slug { get; set; } = "";
    public bool Enabled { get; set; } = true;
    public bool Deleted { get; set; }
    public bool EverPublished { get; set; }
    public int ImportOrder { get; set; }
    public long? DisplayOrder { get; set; }
    public long Revision { get; set; }
    public int DraftNumber { get; set; }
    public int? PublishedNumber { get; set; }
    public DateTimeOffset UpdatedUtc { get; set; }
    public List<ListedRevision> Versions { get; set; } = [];
}
public sealed class ListedRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ItemId { get; set; }
    public int Number { get; set; }
    public string Heading { get; set; } = "";
    public string SearchText { get; set; } = "";
    public DateTimeOffset ListingDate { get; set; }
    public DateTimeOffset? Start { get; set; }
    public DateTimeOffset? End { get; set; }
    public string Data { get; set; } = "{}";
    public DateTimeOffset CreatedUtc { get; set; }
    public int? AuthorId { get; set; }
    public ListedContentData Read() => JsonSerializer.Deserialize<ListedContentData>(Data, ContentTypes.Json)!;
}
public sealed class ContentValidationException(Dictionary<string, string[]> errors) : Exception("Please correct the highlighted fields.")
{ public Dictionary<string, string[]> Errors { get; } = errors; }
public sealed class ContentConflictException() : Exception("This item changed. Reload it before saving again.");

// Ordering belongs to the collection, independently of editorial revisions.
public sealed class ListedCollectionOrder
{
    public int TenantId { get; set; }
    public string Type { get; set; } = "";
    public long Revision { get; set; }
}
public static class ListedOrdering
{
    public static readonly string[] Types = ["announcement", "recent-event", "upcoming-event", "newsletter"];
    public static bool IsManual(string? type) => type != null && Types.Contains(type);
}
public sealed class ContentOrderConflictException() : Exception("The display order changed. Refresh the list before moving an item again.");
