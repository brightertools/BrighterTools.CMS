import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { emptyData, typeLabels, usesManualOrder, type Api, type ContentData, type ContentItem, type ContentType, type Results, type RichText } from './types.js'
import { londonInput,londonUtc } from './delivery.js'
import { LexicalRichTextField } from './LexicalRichTextField.js'
import { MediaPicker } from './MediaPicker.js'

type Failure = Error & { errors?:Record<string,string[]> }
export function CollectionEditor({type,api,preview,onDirtyChange}:{type:ContentType;api:Api;preview:(item:ContentItem)=>ReactNode;onDirtyChange?:(dirty:boolean)=>void}) {
  const manual=usesManualOrder(type)
  const [listLoading,setListLoading]=useState(false)
  const focusMove=useRef<{id:string;direction:string;page:number}|null>(null)
  const list=useRef<HTMLDivElement>(null)
  const [result,setResult]=useState<Results>(),[query,setQuery]=useState(''),[page,setPage]=useState(1),[sort,setSort]=useState(manual?'displayOrder':'listingDate'),[descending,setDescending]=useState(true)
  const [item,setItem]=useState<ContentItem|null>(null),[data,setData]=useState<ContentData>(emptyData),[slug,setSlug]=useState(''),[dates,setDates]=useState({listingDate:'',start:'',end:''})
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[errors,setErrors]=useState<Record<string,string[]>>({}),[message,setMessage]=useState(''),[showPreview,setShowPreview]=useState(false)
  const [editing,setEditing]=useState(false);const locked=useRef(false),editor=useRef<HTMLElement>(null)
  const sequence=useRef(0)
  const slugEdited=useRef(false)
  const load=useCallback(async()=>{const current=++sequence.current;setListLoading(true);try{const value=await api<Results>(`/api/v1/admin/content-items?type=${type}&query=${encodeURIComponent(query)}&page=${page}&sort=${sort}&descending=${descending}`);if(current===sequence.current)setResult(value)}catch(e){if(current===sequence.current)setError((e as Error).message)}finally{if(current===sequence.current)setListLoading(false)}},[api,type,query,page,sort,descending])
  useEffect(()=>{void load()},[load])
  useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false)},[dirty,onDirtyChange])
  useEffect(()=>{
    if(!dirty)return
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    const navigate=(event:MouseEvent)=>{const link=(event.target as HTMLElement).closest('a[href]');if(link&&!confirm('Discard your unsaved changes?')){event.preventDefault();event.stopPropagation()}}
    window.addEventListener('beforeunload',unload);if(!onDirtyChange)document.addEventListener('click',navigate,true)
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true)}
  },[dirty,onDirtyChange])
  useEffect(()=>{if(editing)editor.current?.focus()},[editing])
  const change=<K extends keyof ContentData>(name:K,value:ContentData[K])=>{setData(d=>({...d,[name]:value}));if(name==='heading'&&!slugEdited.current)setSlug(String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,160).replace(/^-|-$/g,''));setDirty(true);setErrors(e=>({...e,[name]:[]}))}
  const open=(value:ContentItem|null)=>{slugEdited.current=!!value;const d=value?.data??emptyData();setItem(value);setData(d);setSlug(value?.slug??'');setDates({listingDate:londonInput(d.listingDate),start:londonInput(d.start),end:londonInput(d.end)});setDirty(false);setErrors({});setError('');setMessage('');setEditing(true);setShowPreview(false)}
  const run=async(action:()=>Promise<void>)=>{if(locked.current)return;locked.current=true;setBusy(true);setError('');setMessage('');setErrors({});try{await action()}catch(e){const failure=e as Failure;setError(failure.message);setErrors(failure.errors??{})}finally{locked.current=false;setBusy(false)}}
  const refreshItem=(value:ContentItem)=>{slugEdited.current=true;setItem(value);setData(value.data);setDirty(false);setSlug(value.slug)}
  const act=(action:string,enabled?:boolean)=>void run(async()=>{if(!item)return;const value=await api<ContentItem>(`/api/v1/admin/content-items/${item.id}/${action}`,{method:'POST',body:JSON.stringify({revision:item.revision,enabled})});refreshItem(value);if(action==='delete')setEditing(false);setMessage(action==='delete'?'Item deleted.':action==='unpublish'?'Unpublished.':'Visibility updated.');await load()})
  const save=async(publish:boolean)=>{
    const converted:Record<string,string|null>={};const problems:Record<string,string[]>={}
    for(const key of ['listingDate','start','end'] as const)try{converted[key]=dates[key]===londonInput(data[key])?(data[key]??null):londonUtc(dates[key]);if(key==='listingDate'&&!converted[key])problems[key]=['Enter a listing date.']}catch(e){problems[key]=[(e as Error).message]}
    if(Object.keys(problems).length){setErrors(problems);setError('Please correct the highlighted dates.');return}
    await run(async()=>{
      let value=await api<ContentItem>(`/api/v1/admin/content-items${item?'/'+item.id:''}`,{method:'POST',body:JSON.stringify({type,slug,revision:item?.revision??0,data:{...data,...converted}})})
      refreshItem(value)
      if(publish){value=await api<ContentItem>(`/api/v1/admin/content-items/${value.id}/publish`,{method:'POST',body:JSON.stringify({revision:value.revision})});refreshItem(value)}
      setMessage(publish?'Saved and published.':'Draft saved.');await load()
    })
  }
  const move=(row:ContentItem,direction:'up'|'down')=>void run(async()=>{
    if(result?.orderingVersion===undefined)return
    const moved=await api<{orderingVersion:number;position:number}>(`/api/v1/admin/content-items/${row.id}/move`,{method:'POST',body:JSON.stringify({direction,orderingVersion:result.orderingVersion})})
    setMessage('Display order updated.')
    const targetPage=Math.floor((moved.position-1)/result.pageSize)+1
    focusMove.current={id:row.id,direction,page:targetPage}
    if(targetPage===page)await load();else setPage(targetPage)
  })
  useEffect(()=>{
    if(busy||listLoading||!focusMove.current)return
    const pending=focusMove.current
    if(result?.page!==pending.page)return
    const row=list.current?.querySelector<HTMLElement>(`[data-order-id="${pending.id}"]`)
    if(!row)return
    const button=row.querySelector<HTMLButtonElement>(`[data-move="${pending.direction}"]`)
    if(button&&!button.disabled)button.focus();else row.focus()
    focusMove.current=null
  },[result,busy,listLoading])
  const resetOrder=()=>{setQuery('');setSort('displayOrder');setDescending(false);setPage(1);setError('');setMessage('');void load()}
  const canReorder=manual&&sort==='displayOrder'&&!query.trim()
  const feedback=(name:string)=>errors[name]?.length?<span className="invalid-feedback d-block">{errors[name].join(' ')}</span>:null
  const text=(key:keyof ContentData,label:string,required=false)=><label className="col-md-6">{label}{required?' *':''}<input className="form-control" value={String(data[key]??'')} required={required} onChange={e=>change(key,e.target.value as never)}/>{feedback(key)}</label>
  const rich=(key:'shortText'|'longText'|'headerQuote'|'homeQuote',label:string)=><div className="col-12"><LexicalRichTextField key={`${item?.id??'new'}-${key}`} label={label} value={data[key]} basic={key!=='longText'} onChange={(value:RichText)=>change(key,value)}/>{feedback(key)}</div>
  const image=(key:'image'|'pageImage'|'headerImage'|'homeImage'|'document',label:string)=><div className="col-md-6"><MediaPicker label={label} value={data[key]} api={api} pdf={key==='document'} square={(key==='image'&&type!=='upcoming-event'&&type!=='newsletter')||key==='homeImage'} onChange={value=>change(key,value)}/>{feedback(key)}</div>
  const cancel=()=>{if(dirty&&!confirm('Discard your unsaved changes?'))return;setEditing(false);setDirty(false);setError('');setMessage('');void load()}
  return <><h1>{typeLabels[type]}</h1>{message&&<p className="alert alert-success" role="status">{message}</p>}{error&&<p className="alert alert-danger" role="alert">{error}</p>}
    {!editing?<><button className="button-link mb-3" onClick={()=>open(null)}>Add item</button>
      <form className="d-flex gap-2 mb-3" onSubmit={e=>{e.preventDefault();setPage(1);void load()}}><label className="flex-grow-1">Search<input className="form-control" value={query} maxLength={250} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><button className="btn btn-primary align-self-end">Search</button></form>
      {manual&&<div className="mb-3"><p>Move items to change the public display order immediately. Listing and schedule dates do not control position.</p><button className="btn btn-outline-secondary" disabled={busy||listLoading} onClick={resetOrder}>{canReorder?'Refresh display order':'Return to display order'}</button>{!canReorder&&<p className="small mt-2">Clear search and return to display order to move items.</p>}</div>}
      {!result?<p role="status">Loading…</p>:<><div ref={list} className="table-responsive" aria-busy={busy||listLoading}><table className="table"><thead><tr>{[['heading','Heading'],['listingDate','Listing date']].map(([key,label])=><th key={key}><button className="btn btn-link p-0" onClick={()=>{setSort(key);setDescending(sort===key?!descending:true);setPage(1)}}>{label}{sort===key?(descending?' ↓':' ↑'):''}</button></th>)}<th>Publication</th><th>Enabled</th><th>Schedule</th><th>Actions</th></tr></thead><tbody>{result.items.map(row=><tr key={row.id} data-order-id={row.id} tabIndex={-1}><td>{row.data.heading}</td><td>{new Date(row.data.listingDate).toLocaleString('en-GB',{timeZone:'Europe/London'})}</td><td>{row.publishedNumber?row.publishedNumber===row.draftNumber?'Published':'Published · draft changes':'Draft'}</td><td>{row.enabled?'Yes':'No'}</td><td>{row.data.start&&Date.parse(row.data.start)>Date.now()?'Scheduled':row.data.end&&Date.parse(row.data.end)<=Date.now()?'Expired':'Within window'}</td><td><div className="d-flex flex-wrap gap-1" style={{minWidth:'10rem'}}>{manual&&(['up','down'] as const).map(direction=><button key={direction} data-move={direction} className="btn btn-outline-secondary btn-sm" aria-label={`Move ${row.data.heading} ${direction}`} disabled={busy||listLoading||!canReorder||result.orderingVersion===undefined||!(direction==='up'?row.canMoveUp:row.canMoveDown)} onClick={()=>move(row,direction)}>Move {direction}</button>)}<button disabled={busy||listLoading} className="btn btn-outline-primary btn-sm" onClick={()=>void run(async()=>open(await api<ContentItem>(`/api/v1/admin/content-items/${row.id}`)))}>View / edit</button></div></td></tr>)}</tbody></table></div>
      {!result.totalCount&&<p>No items found.</p>}<div className="d-flex gap-2 align-items-center"><button className="btn" disabled={busy||listLoading||page<=1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {result.page} of {Math.max(1,Math.ceil(result.totalCount/result.pageSize))} · {result.totalCount} items</span><button className="btn" disabled={busy||listLoading||result.page*result.pageSize>=result.totalCount} onClick={()=>setPage(page+1)}>Next</button></div></>}
    </>:<section ref={editor} tabIndex={-1} aria-label="Content editor" className="cms-editor border rounded p-3"><h2>{item?'Edit item':'New item'}</h2>
      <form onSubmit={e=>{e.preventDefault();void save(false)}}><fieldset disabled={busy}><div className="row g-3">
        {text('heading','Heading',true)}<label className="col-md-6">URL slug *<input aria-label="URL slug" required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="form-control" value={slug} disabled={item?.everPublished} onChange={e=>{slugEdited.current=true;setSlug(e.target.value);setDirty(true)}}/>{!item?.everPublished&&<button type="button" className="btn btn-link px-0" onClick={()=>{slugEdited.current=true;setSlug(data.heading.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));setDirty(true)}}>Generate from heading</button>}{feedback('slug')}</label>
        {type!=='newsletter'&&rich('shortText','Short Text')}{image('image',type==='newsletter'?'Cover image':'Listing image')}
        {type==='newsletter'?image('document','PDF'): <><label className="col-12"><input type="checkbox" checked={data.showAdditionalPage} onChange={e=>change('showAdditionalPage',e.target.checked)}/> Display additional page</label>{rich('longText','Long Text')}{image('pageImage','Page image')}
          <fieldset className="col-12" disabled={data.showAdditionalPage}><legend className="fs-6">Bottom link {data.showAdditionalPage&&'— replaced by READ MORE HERE'}</legend><div className="row g-3">{text('bottomLink','Link (local, web or email)')}{text('linkText','Link Text')}<label><input type="checkbox" checked={data.openInNewWindow} onChange={e=>change('openInNewWindow',e.target.checked)}/> Open in new window</label></div></fieldset>
          {data.showAdditionalPage&&<div className="col-12"><h3>Gallery</h3>{data.gallery.map((media,index)=><div className="border p-2 mb-2" key={`${index}-${media.id}`}><MediaPicker label={`Gallery image ${index+1}`} value={media} api={api} onChange={value=>change('gallery',value?data.gallery.map((m,i)=>i===index?value:m):data.gallery.filter((_,i)=>i!==index))}/><button type="button" className="btn" disabled={index===0} onClick={()=>{const gallery=[...data.gallery];[gallery[index-1],gallery[index]]=[gallery[index],gallery[index-1]];change('gallery',gallery)}}>Move up</button><button type="button" className="btn" disabled={index===data.gallery.length-1} onClick={()=>{const gallery=[...data.gallery];[gallery[index+1],gallery[index]]=[gallery[index],gallery[index+1]];change('gallery',gallery)}}>Move down</button></div>)}<MediaPicker label="Add gallery image" api={api} onChange={value=>{if(value)change('gallery',[...data.gallery,value])}}/>{feedback('gallery')}</div>}
        </>}
        {type==='upcoming-event'&&<label className="col-md-6">Display date<input className="form-control" type="date" value={data.displayDate??''} onChange={e=>change('displayDate',e.target.value||null)}/>{feedback('displayDate')}</label>}
        {type==='story'&&<>{image('headerImage','Header image')}{rich('headerQuote','Header quote')}{text('detailHeading','Detail-page heading (optional)')}
          <label className="col-md-6">Colour pair<select className="form-select" value={data.theme} onChange={e=>change('theme',e.target.value)}>{['orange','blue','white','yellow'].map(t=><option key={t}>{t}</option>)}</select>{feedback('theme')}</label>
          </>}
        {type==='story'&&<label className="col-12"><input type="checkbox" checked={data.showOnHomepage} onChange={e=>change('showOnHomepage',e.target.checked)}/> Show on homepage</label>}
        {type==='story'&&data.showOnHomepage&&<>{text('homeHeading','Homepage heading (optional)')}{rich('homeQuote','Homepage quote')}{image('homeImage','Homepage roundel (optional)')}<label className="col-md-6">Homepage colour pair<select className="form-select" value={data.homeTheme} onChange={e=>change('homeTheme',e.target.value)}>{['orange','blue','yellow'].map(t=><option key={t}>{t}</option>)}</select></label></>}
        {manual&&<p className="col-12 mb-0 small">Listing date and event Display date are descriptive. Start and End control visibility. Use the list’s Move up/down buttons to change display order.</p>}
        {(['listingDate','start','end'] as const).map(key=><label key={key} className="col-md-4">{key==='listingDate'?'Listing date':key==='start'?'Start':'End'} (UK time)<input type="datetime-local" className="form-control" required={key==='listingDate'} value={dates[key]} onChange={e=>{setDates(d=>({...d,[key]:e.target.value}));setDirty(true)}}/>{feedback(key)}</label>)}
        {text('seoTitle','Search title (optional)')}{text('seoDescription','Search description (optional)')}
        <div className="col-12 d-flex gap-2 align-items-center"><span>Enabled: {item?.enabled===false?'No':'Yes'}</span>{item&&<button type="button" className="btn btn-outline-secondary" disabled={dirty} onClick={()=>act('enabled',!item.enabled)}>{item.enabled?'Disable immediately':'Enable'}</button>}{dirty&&item&&<small>Save or cancel changes before changing visibility.</small>}</div>
      </div><div className="d-flex flex-wrap justify-content-between gap-2 mt-4">{item&&<button type="button" className="btn btn-danger" onClick={()=>{if(confirm('Delete this item? It will be removed from the public site.'))act('delete')}}>Delete</button>}<div className="d-flex flex-wrap gap-2 ms-auto align-items-center"><button type="button" className="btn btn-link" onClick={cancel}>Cancel</button><button type="button" className="btn btn-outline-secondary" disabled={!item||dirty} onClick={()=>setShowPreview(!showPreview)}>Preview saved draft</button>{item?.publishedNumber&&<button type="button" className="btn btn-outline-secondary" disabled={dirty} onClick={()=>{if(confirm('Remove this item from the public site?'))act('unpublish')}}>Unpublish</button>}<button className="btn btn-outline-primary">Save draft</button><button type="button" className="button-link" onClick={e=>{if(e.currentTarget.form?.reportValidity())void save(true)}}>Save and publish</button></div></div></fieldset></form>
      {showPreview&&item&&<section className="cms-preview mt-4 border p-3"><h2>Draft preview</h2>{preview(item)}</section>}
    </section>}
  </>
}
