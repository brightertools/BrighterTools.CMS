import React from 'react'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {CollectionEditor} from '../src/CollectionEditor'
import {emptyData,type Api} from '../src/types'
import {londonUtc} from '../src/delivery'
afterEach(cleanup)
it('rejects ambiguous and missing UK times',()=>{expect(()=>londonUtc('2026-10-25T01:30')).toThrow();expect(()=>londonUtc('2026-03-29T01:30')).toThrow();expect(londonUtc('2026-07-06T12:00')).toBe('2026-07-06T11:00:00.000Z')})
it('posts immediate moves with the collection version and disables filtered moves',async()=>{
 const rows=['First','Second'].map((heading,index)=>({id:String(index),type:'announcement',data:{...emptyData(),heading},canMoveUp:index>0,canMoveDown:index===0}))
 const request=vi.fn(async(path:string,init?:RequestInit)=>{if(init?.method==='POST'){expect(path).toBe('/api/v1/admin/content-items/0/move');expect(JSON.parse(String(init.body))).toEqual({direction:'down',orderingVersion:7});rows.reverse();return {orderingVersion:8,position:2}}return {items:rows,totalCount:2,page:1,pageSize:25,orderingVersion:7}})
 render(<CollectionEditor type="announcement" api={request as Api} preview={()=>null}/>)
 const down=await screen.findByRole('button',{name:'Move First down'});await waitFor(()=>expect(down.disabled).toBe(false));fireEvent.click(down)
 await screen.findByText('Display order updated.');expect(request.mock.calls.some(([,init])=>init?.method==='POST')).toBe(true)
 fireEvent.change(screen.getByLabelText('Search'),{target:{value:'First'}})
 await waitFor(()=>expect((screen.getByRole('button',{name:'Move First down'}) as HTMLButtonElement).disabled).toBe(true))
})
it('keeps stories on date ordering without move controls',async()=>{
 const request=vi.fn(async()=>({items:[],totalCount:0,page:1,pageSize:25}))
 render(<CollectionEditor type="story" api={request as Api} preview={()=>null}/>);await screen.findByText('No items found.')
 expect(request.mock.calls[0][0]).toContain('sort=listingDate');expect(screen.queryByText('Refresh display order')).toBeNull()
})
