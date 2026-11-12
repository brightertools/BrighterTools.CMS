import {emptyData,usesManualOrder} from '@brightertools/cms-collections-react'
if(emptyData().showAdditionalPage||!usesManualOrder('announcement'))throw new Error('Invalid package exports')
console.log('CMS React package imports successfully')
