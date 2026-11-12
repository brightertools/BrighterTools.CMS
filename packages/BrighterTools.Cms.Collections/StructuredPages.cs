using System.Text.Json;
using System.Text.RegularExpressions;

namespace BrighterTools.Cms.Collections;

public sealed class ContentPage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int TenantId { get; set; }
    public string Key { get; set; } = "";
    public long Revision { get; set; }
    public int DraftLayoutNumber { get; set; }
    public int? PublishedLayoutNumber { get; set; }
    public List<PageBlock> Blocks { get; set; } = [];
    public List<PageLayoutRevision> Layouts { get; set; } = [];
}
public sealed class PageBlock
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PageId { get; set; }
    public string Kind { get; set; } = "item";
    public string Anchor { get; set; } = "";
    public bool Enabled { get; set; } = true;
    public bool Deleted { get; set; }
    public long Revision { get; set; }
    public int DraftNumber { get; set; }
    public int? PublishedNumber { get; set; }
    public List<PageBlockRevision> Versions { get; set; } = [];
}
public sealed class PageBlockData
{
    public string Heading { get; set; } = "";
    public RichTextValue Body { get; set; } = new();
    public string Attribution { get; set; } = "";
    public DateTimeOffset? Start { get; set; }
    public DateTimeOffset? End { get; set; }
}
public sealed class PageBlockRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BlockId { get; set; }
    public int Number { get; set; }
    public string Data { get; set; } = "{}";
    public DateTimeOffset CreatedUtc { get; set; }
    public int? AuthorId { get; set; }
    public PageBlockData Read() => JsonSerializer.Deserialize<PageBlockData>(Data, ContentTypes.Json)!;
}
public sealed record PagePlacement(Guid Id, Guid? ParentId);
public sealed class PageLayoutRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PageId { get; set; }
    public int Number { get; set; }
    public string Data { get; set; } = "[]";
    public DateTimeOffset CreatedUtc { get; set; }
    public List<PagePlacement> Read() => JsonSerializer.Deserialize<List<PagePlacement>>(Data, ContentTypes.Json)!;
}
public static class StructuredPageWorkflow
{
    public static readonly string[] Kinds = ["introduction", "header-quote", "closing-quote", "item", "group"];
    public static bool Singleton(string kind) => kind is "introduction" or "header-quote" or "closing-quote";
    public static void Check(ContentPage page, long expected)
    { if (page.Revision != expected) throw new ContentConflictException(); }
    public static void Validate(PageBlockData data, string kind, bool publishing)
    {
        var errors = new Dictionary<string,string[]>();
        if (!Kinds.Contains(kind)) errors["kind"] = ["Choose a supported block type."];
        if (data.Heading.Length > 250 || kind is "item" or "group" && string.IsNullOrWhiteSpace(data.Heading)) errors["heading"] = ["Enter a heading of up to 250 characters."];
        if (data.Attribution.Length > 250) errors["attribution"] = ["Use at most 250 characters."];
        try { data.Body = RichText.Normalize(data.Body, false); }
        catch (Exception e) when (e is FormatException or InvalidOperationException) { errors["body"] = [e.Message]; }
        data.Start = data.Start?.ToUniversalTime(); data.End = data.End?.ToUniversalTime();
        if (data.Start.HasValue && data.End.HasValue && data.End <= data.Start) errors["end"] = ["End must be after Start."];
        if (publishing && kind != "group" && string.IsNullOrWhiteSpace(data.Body.PlainText)) errors["body"] = ["Enter content before publishing."];
        if (errors.Count > 0) throw new ContentValidationException(errors);
    }
    public static PageBlockRevision Save(PageBlock block, long expected, PageBlockData data, int? author)
    {
        if (block.Revision != expected || block.Deleted) throw new ContentConflictException();
        Validate(data, block.Kind, false); block.Revision++; block.DraftNumber++;
        var version = new PageBlockRevision { BlockId=block.Id, Number=block.DraftNumber, Data=JsonSerializer.Serialize(data,ContentTypes.Json), AuthorId=author, CreatedUtc=DateTimeOffset.UtcNow };
        block.Versions.Add(version); return version;
    }
    public static string Anchor(string heading)
    {
        var value=Regex.Replace(heading.ToLowerInvariant(),"[^a-z0-9]+","-").Trim('-');
        return value.Length == 0 ? "item" : value[..Math.Min(value.Length,140)].TrimEnd('-');
    }
    public static void ValidateLayout(ContentPage page, IReadOnlyList<PagePlacement> layout)
    {
        var blocks=page.Blocks.Where(b=>!b.Deleted&&!Singleton(b.Kind)).ToDictionary(b=>b.Id);
        if (layout.Count!=blocks.Count || layout.Select(p=>p.Id).Distinct().Count()!=layout.Count || layout.Any(p=>!blocks.ContainsKey(p.Id)))
            throw new ContentValidationException(new(){["layout"]=["The order must contain every current item and group exactly once. Reload the page."]});
        foreach(var row in layout) if(row.ParentId is {} parent && (blocks[row.Id].Kind!="item" || !blocks.TryGetValue(parent,out var group) || group.Kind!="group"))
            throw new ContentValidationException(new(){["layout"]=["Only items can belong to groups on this page."]});
    }
    public static bool Eligible(PageBlock block, PageBlockData data, DateTimeOffset now) => !block.Deleted && block.Enabled && block.PublishedNumber.HasValue && (!data.Start.HasValue||data.Start<=now) && (!data.End.HasValue||data.End>now);
}
