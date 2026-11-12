import { useEffect, useState } from 'react'
import type { Api, Media } from './types.js'
type Asset = { id:string;url:string;fileName:string;contentType:string }
export function MediaImage({ media, api }: { media:Media;api:Api }) {
  const [url,setUrl]=useState('')
  useEffect(()=>{
    let active=true,objectUrl=''
    if(!media.url){setUrl('');return}
    if(!media.url.startsWith('/api/')){setUrl(media.url);return}
    void api<Blob>(media.url,{headers:{Accept:'application/octet-stream'}}).then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)}}).catch(()=>setUrl(''))
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}
  },[media.url,api])
  return url?<img src={url} alt={media.alt} className="cms-media-thumb"/>:null
}
export function MediaPicker({label,value,onChange,api,pdf=false,square=false}:{label:string;value?:Media|null;onChange:(media:Media|null)=>void;api:Api;pdf?:boolean;square?:boolean}) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[page,setPage]=useState(1),[assets,setAssets]=useState<Asset[]>([]),[total,setTotal]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{if(!open)return;let active=true;setError('');void api<{items:Asset[];totalCount:number}>(`/api/v1/admin/content-media?kind=${pdf?'pdf':'image'}&query=${encodeURIComponent(query)}&page=${page}`)
    .then(result=>{if(active){setAssets(result.items);setTotal(result.totalCount)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[api,open,query,page,pdf])
  return <div className={`cms-media-picker${square?' cms-media-picker--square':''}`}><span className="form-label d-block">{label}</span>
    {!pdf&&<small className="d-block mb-2">{square?'Use a square image for listings or roundels.':'Any image shape; the original proportions are preserved.'}</small>}
    {value && <div>{!pdf&&<MediaImage media={value} api={api}/>}<span>{pdf?'PDF selected':''}</span>
      {!pdf&&<label className="d-block">Alternative text<input className="form-control" value={value.alt} maxLength={500} onChange={e=>onChange({...value,alt:e.target.value})}/></label>}
      <button type="button" className="btn btn-link" onClick={()=>onChange(null)}>Remove {label.toLowerCase()}</button></div>}
    <button type="button" className="btn btn-outline-primary" onClick={()=>setOpen(!open)}>{open?'Close library':`Choose ${label.toLowerCase()}`}</button>
    {open&&<div className="border rounded p-3 mt-2"><label>Find a file<input className="form-control" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label>
      <label className="d-block mt-2">Upload {pdf?'PDF':'image'}<input className="form-control" type="file" disabled={busy} accept={pdf?'application/pdf':'.jpg,.jpeg,.png,.webp'} onChange={async e=>{
        const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');const form=new FormData();form.append('file',file)
        try{const result=await api<Asset>('/api/v1/admin/content-media',{method:'POST',body:form});onChange({id:result.id,url:result.url,alt:''});setOpen(false)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
      }}/></label>
      {error&&<p role="alert" className="text-danger">{error}</p>}{busy&&<p role="status">Uploading…</p>}
      <div className="cms-media-grid">{assets.map(asset=><button type="button" className="btn border" key={asset.id} onClick={()=>{onChange({id:asset.id,url:asset.url,alt:''});setOpen(false)}}>
        {!pdf&&<MediaImage media={{id:asset.id,url:asset.url,alt:''}} api={api}/>}<span>{asset.fileName}</span></button>)}</div>
      <div className="d-flex gap-2"><button type="button" className="btn" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous files</button><button type="button" className="btn" disabled={page*24>=total} onClick={()=>setPage(page+1)}>Next files</button></div>
    </div>}
  </div>
}
