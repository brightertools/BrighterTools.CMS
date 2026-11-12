import {build} from 'esbuild'
import {mkdir,rm} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve,dirname} from 'node:path'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'dist')
if(dirname(out)!==root)throw new Error('Invalid build output path')
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true})
await build({entryPoints:[resolve(root,'src/index.ts')],outdir:out,bundle:true,format:'esm',platform:'browser',target:'es2022',packages:'external',jsx:'automatic'})
