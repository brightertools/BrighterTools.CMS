using BrighterTools.Cms.Collections;
var item = new ListedItem { Type = "announcement", DisplayOrder = 1 };
Console.WriteLine($"{item.Type}: {ListedOrdering.IsManual(item.Type)}");
