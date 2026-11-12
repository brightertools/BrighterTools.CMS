import {useEffect,useState} from 'react'
import type {RichText} from './types.js'
export type PageBlockKind='introduction'|'header-quote'|'closing-quote'|'item'|'group'
export type PageBlockData={heading:string;body:RichText;attribution:string;start:string|null;end:string|null}
export type PagePlacement={id:string;parentId:string|null}
export type PageBlock={id:string;kind:PageBlockKind;anchor:string;enabled:boolean;revision:number;draftNumber:number;publishedNumber:number|null;data:PageBlockData}
export type ContentPage={key:string;title:string;path:string;revision:number;draftLayoutNumber:number;publishedLayoutNumber:number|null;layout:PagePlacement[];publishedLayout:PagePlacement[];blocks:PageBlock[]}
export type PublicPageBlock=Pick<PageBlock,'id'|'kind'|'anchor'|'data'>
export type PublicContentPage={key:string;title:string;path:string;layout:PagePlacement[];blocks:PublicPageBlock[];nextTransition:string|null}
export const blockLabels:Record<PageBlockKind,string>={introduction:'Main header text','header-quote':'Header quote','closing-quote':'Closing quote',item:'Item',group:'Group'}
export const isPageSlot=(kind:PageBlockKind)=>!['item','group'].includes(kind)
export const emptyBlockData=():PageBlockData=>({heading:'',body:{json:null,html:'',plainText:''},attribution:'',start:null,end:null})
export function visiblePage(page:PublicContentPage,now=Date.now()):PublicContentPage {
 const available=new Map(page.blocks.filter(b=>(!b.data.start||Date.parse(b.data.start)<=now)&&(!b.data.end||Date.parse(b.data.end)>now)).map(b=>[b.id,b]))
 let layout=page.layout.filter(p=>available.has(p.id)&&(!p.parentId||available.has(p.parentId)))
 layout=layout.filter(p=>available.get(p.id)?.kind!=='group'||layout.some(c=>c.parentId===p.id))
 const ids=new Set(layout.map(p=>p.id))
 return {...page,layout,blocks:[...available.values()].filter(b=>isPageSlot(b.kind)||ids.has(b.id))}
}
export function useContentPages(key?:string){
 const [pages,setPages]=useState<PublicContentPage[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');const [,tick]=useState(0)
 useEffect(()=>{let active=true,sequence=0;let controller:AbortController|undefined,transition:ReturnType<typeof setTimeout>|undefined
  setPages([]);setLoading(true);setError('')
  const refresh=async()=>{const request=++sequence;controller?.abort();controller=new AbortController();try{
   const response=await fetch('/api/v1/content-pages'+(key?'/'+encodeURIComponent(key):''),{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Page content could not be loaded. Please try again.')
   const data=await response.json(),values:PublicContentPage[]=key?[data]:data;if(!active||request!==sequence)return
   setPages(values);setError('');clearTimeout(transition)
   const next=values.map(p=>Date.parse(p.nextTransition||'')).filter(n=>n>Date.now());if(next.length)transition=setTimeout(()=>{tick(n=>n+1);void refresh()},Math.min(Math.max(1,Math.min(...next)-Date.now()+1),2147483647))
  }catch(e){if(active&&request===sequence){setPages([]);setError((e as Error).message)}}finally{if(active&&request===sequence)setLoading(false)}}
  void refresh();const interval=setInterval(refresh,30000);window.addEventListener('focus',refresh)
  return()=>{active=false;controller?.abort();clearInterval(interval);clearTimeout(transition);window.removeEventListener('focus',refresh)}
 },[key])
 return {pages:pages.map(p=>visiblePage(p)),loading,error}
}
