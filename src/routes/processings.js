import {newRedis} from '../models/redis_pubsub'
import {base64_decode} from '../shared/simple_crypto'

// export default function(express) {
//   const router = express.Router()
// 
//   router.ws('/:processingIdBase64', (ws, req) => {
//     const sub = newRedis()
//     const processingId = base64_decode(req.params['processingIdBase64'])
// 
//     sub.on('message', function(channel, message) {
//       console.log(`MESSAGE {channel} {message}`)
//       ws.send(message)
//     })
// 
//     sub.subscribe(processingId)
// 
//     ws.on('close', () => {
//       console.log(`UNSUBSCRIBE {processingId}`)
//       sub.unsubscribe()
//       sub.quit()
//     })
//   })
// 
//   return router
// }
