import {copyFile,readFile,writeFile} from 'node:fs/promises'
for(const name of ['styles.css','LexicalRichTextField.css','styles.d.ts'])await copyFile('src/'+name,'dist/'+name)
const path='dist/index.d.ts'
await writeFile(path,'/// <reference path="./styles.d.ts" />\n'+await readFile(path,'utf8'))
