using System.Text.Json;
using BrighterTools.Cms.Collections;
namespace BrighterTools.Cms.Collections.Tests;
public sealed class PublishingTests {
private static RichTextValue Plain(string value) => new() { Json=JsonSerializer.SerializeToNode(new { root=new {type="root",version=1,children=new[]{new {type="paragraph",version=1,children=new[]{new {type="text",version=1,text=value,format=0,detail=0,mode="normal",style=""}}}}}}) };
    private static ListedContentData Example(string heading="Synthetic announcement") => new() { Heading=heading,ShortText=Plain("Summary"),LongText=Plain("Full text"),ShowAdditionalPage=true,ListingDate=DateTimeOffset.UtcNow };
    [Fact]
    public void Draft_publish_and_conflicts_preserve_the_published_snapshot()
    {
        var workflow=new ListedContentWorkflow();var item=new ListedItem{Type="announcement"};var now=DateTimeOffset.UtcNow;
        workflow.SaveDraft(item,0,"example",Example(),1,now);workflow.Publish(item,1,now);
        workflow.SaveDraft(item,2,"example",Example("Unpublished change"),1,now);
        Assert.Equal(1,item.PublishedNumber);Assert.Equal("Synthetic announcement",item.Versions.Single(v=>v.Number==item.PublishedNumber).Read().Heading);
        Assert.Throws<ContentConflictException>(()=>workflow.Publish(item,2,now));
        Assert.Throws<ContentValidationException>(()=>workflow.SaveDraft(item,3,"changed-url",Example(),1,now));
        workflow.Publish(item,3,now);Assert.Equal(2,item.PublishedNumber);
        workflow.Change(item,4,"enabled",false,now);Assert.False(item.Enabled);
    }
    [Theory]
    [InlineData("javascript:alert(1)")][InlineData("//evil.example")][InlineData("data:text/html,bad")][InlineData("/\\evil.example")]
    public void Unsafe_links_are_rejected(string url)
    {
        var data=Example();data.BottomLink=url;
        Assert.Throws<ContentValidationException>(()=>ListedContentWorkflow.Normalize(data,"announcement",true));
    }
    [Theory]
    [InlineData("/contact")][InlineData("https://example.test/contact")][InlineData("mailto:team@example.test")][InlineData("tel:02084417000")]
    public void Authored_link_types_are_supported(string url) => Assert.True(RichText.SafeUrl(url));
    [Fact]
    public void Html_is_derived_from_allowlisted_editor_nodes()
    {
        var data=Example();data.ShortText.Html="<script>unsafe</script>";data.ShortText.Json!["root"]!["children"]![0]!["children"]![0]!["text"]="<script>text</script>";
        ListedContentWorkflow.Normalize(data,"announcement",true);
        Assert.DoesNotContain("<script>",data.ShortText.Html);Assert.Contains("&lt;script&gt;",data.ShortText.Html);
        data.ShortText.Json!["root"]!["children"]![0]!["type"]="iframe";
        Assert.Throws<ContentValidationException>(()=>ListedContentWorkflow.Normalize(data,"announcement",true));
    }
    [Fact]
    public void Publishing_validates_detail_content_and_dates_but_retains_bottom_link()
    {
        var data=Example();data.LongText=Plain("");data.BottomLink="/contact";
        Assert.Throws<ContentValidationException>(()=>ListedContentWorkflow.Normalize(data,"announcement",true));
        data.ShowAdditionalPage=false;data.LinkText="Contact";ListedContentWorkflow.Normalize(data,"announcement",true);Assert.Equal("/contact",data.BottomLink);
        data.Start=DateTimeOffset.UtcNow;data.End=data.Start;Assert.Throws<ContentValidationException>(()=>ListedContentWorkflow.Normalize(data,"announcement",true));
    }

[Fact] public void Structured_layout_rejects_missing_items_and_nested_groups() {
 var group=new PageBlock {Kind="group"};var item=new PageBlock {Kind="item"};var page=new ContentPage {Blocks=[group,item]};
 StructuredPageWorkflow.ValidateLayout(page,[new(group.Id,null),new(item.Id,group.Id)]);
 Assert.Throws<ContentValidationException>(()=>StructuredPageWorkflow.ValidateLayout(page,[new(group.Id,null)]));
 Assert.Throws<ContentValidationException>(()=>StructuredPageWorkflow.ValidateLayout(page,[new(group.Id,item.Id),new(item.Id,null)]));
}
[Fact] public void Ordering_is_separate_from_content_revisions() {
 var item=new ListedItem {Type="announcement",DisplayOrder=42};var workflow=new ListedContentWorkflow();
 workflow.SaveDraft(item,0,"example",Example(),null,DateTimeOffset.UtcNow);workflow.Publish(item,item.Revision,DateTimeOffset.UtcNow);
 Assert.Equal(42,item.DisplayOrder);Assert.False(ListedOrdering.IsManual("story"));Assert.True(ListedOrdering.IsManual("newsletter"));
}
}
