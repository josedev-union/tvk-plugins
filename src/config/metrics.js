import {metrics} from '../instrumentation/metrics'
import {api} from '../middlewares/api'

//api.addCallback('info.add', ({addedInfo}) => {
//})

api.addCallback('tags.add', ({addedTags}) => {
  for (const label of Object.keys(addedTags)) {
    const value = addedTags[label]
    metrics.addTag({label, value})
  }
})
