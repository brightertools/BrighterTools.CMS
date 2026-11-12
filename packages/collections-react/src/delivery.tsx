import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import type { ContentItem, ContentType, RichText, Results } from './types.js'
export const sanitizeInline = (html:string) => DOMPurify.sanitize(html,{ALLOWED_TAGS:['br','strong','em','a'],ALLOWED_ATTR:['href','target','rel']})

export function RichContent({ value, className = '' }: { value?: RichText; className?: string }) {
  const html=DOMPurify.sanitize(value?.html || '', { ALLOWED_TAGS:['p','br','strong','em','ul','ol','li','h2','h3','blockquote','a'], ALLOWED_ATTR:['href','target','rel'] })
  return <div className={`cms-rich ${className}`} dangerouslySetInnerHTML={{__html:html}} />
}
export function useContentItems(type?: ContentType, featured = false) {
  const [items,setItems]=useState<ContentItem[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const [,tick]=useState(0)
  useEffect(()=>{
    let active=true,sequence=0; let controller:AbortController|undefined
    setItems([]);setError('');setLoading(true)
    const refresh=async()=>{
      const current=++sequence;controller?.abort();controller=new AbortController()
      try {
        const values: ContentItem[]=[]; let page=1,total=1
        while(values.length<total) {
          const response=await fetch(`/api/v1/content-items?pageSize=100&page=${page++}${type?`&type=${type}`:''}${featured?'&featured=true':''}`,{cache:'no-store',signal:controller.signal})
          if(!response.ok) throw new Error('Content could not be loaded. Please try again.')
          const result:Results=await response.json();values.push(...result.items);total=result.totalCount;if(!result.items.length)break
        }
        if(active&&current===sequence){setItems(values);setError('')}
      }catch(e){if(active&&current===sequence){setItems([]);setError((e as Error).message)}}finally{if(active&&current===sequence)setLoading(false)}
    }
    void refresh();const timer=window.setInterval(refresh,30000);window.addEventListener('focus',refresh)
    return()=>{active=false;controller?.abort();clearInterval(timer);window.removeEventListener('focus',refresh)}
  },[type,featured])
  useEffect(()=>{
    const ends=items.map(i=>Date.parse(i.data.end||'')).filter(end=>end>Date.now())
    if(!ends.length)return
    const timer=setTimeout(()=>tick(n=>n+1),Math.min(Math.min(...ends)-Date.now()+1,2147483647))
    return()=>clearTimeout(timer)
  })
  // Do not retain an expired row until the next background refresh.
  const now=Date.now();return {items:items.filter(i=>(!i.data.start||Date.parse(i.data.start)<=now)&&(!i.data.end||Date.parse(i.data.end)>now)),error,loading}
}
export function londonInput(value?:string|null) {
  if(!value)return ''
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value))
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
export function londonUtc(value:string) {
  if(!value)return null
  const base=Date.parse(value+'Z');if(!Number.isFinite(base))throw new Error('Enter a valid date and time.')
  const candidates=[base,base-3600000].filter(time=>londonInput(new Date(time).toISOString())===value)
  if(candidates.length!==1)throw new Error(candidates.length?'This UK time occurs twice when the clocks change. Choose a time outside that hour.':'This UK time does not exist when the clocks change. Choose another time.')
  return new Date(candidates[0]).toISOString()
}
