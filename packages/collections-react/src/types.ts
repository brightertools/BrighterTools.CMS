export type ContentType = 'announcement' | 'recent-event' | 'upcoming-event' | 'story' | 'newsletter'
export const usesManualOrder = (type: ContentType) => type !== 'story'
export type RichText = { json?: unknown; html: string; plainText: string }
export type Media = { id: string; alt: string; url?: string }
export type ContentData = {
  heading: string; detailHeading?: string; shortText: RichText; longText: RichText; headerQuote: RichText; homeQuote: RichText;
  showAdditionalPage: boolean; bottomLink: string; linkText: string; openInNewWindow: boolean;
  image?: Media | null; pageImage?: Media | null; headerImage?: Media | null; homeImage?: Media | null; document?: Media | null; gallery: Media[];
  listingDate: string; start?: string | null; end?: string | null; displayDate?: string | null;
  theme: string; homeTheme: string; imageSide: 'left'|'right'; homeImageSide: 'left'|'right'; showOnHomepage: boolean;
  homeHeading?: string; backText?: string; seoTitle?: string; seoDescription?: string
}
export type ContentItem = { canMoveUp?: boolean; canMoveDown?: boolean; id: string; type: ContentType; slug: string; enabled: boolean; revision: number; draftNumber: number; publishedNumber?: number; everPublished: boolean; path: string; data: ContentData }
export type Results = { orderingVersion?: number; items: ContentItem[]; totalCount: number; page: number; pageSize: number }
export type Api = <T>(path: string, init?: RequestInit) => Promise<T>
export const typeLabels: Record<ContentType,string> = { announcement:'Announcements', 'recent-event':'Recent Events', 'upcoming-event':'Upcoming Events', story:'Stories', newsletter:'Newsletters' }
export const emptyRich = (): RichText => ({ html:'', plainText:'' })
export function emptyData(): ContentData { return {heading:'',shortText:emptyRich(),longText:emptyRich(),headerQuote:emptyRich(),homeQuote:emptyRich(),showAdditionalPage:false,bottomLink:'',linkText:'',openInNewWindow:false,gallery:[],listingDate:new Date().toISOString(),theme:'orange',homeTheme:'orange',imageSide:'right',homeImageSide:'right',showOnHomepage:false} }
