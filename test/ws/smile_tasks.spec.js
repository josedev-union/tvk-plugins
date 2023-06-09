import http from "http"
import WebSocket from 'ws'
import { Factory } from 'rosie'
import {helpers} from '../helpers'
import {WSConsumer} from '../helpers/WSConsumer'
import {signer} from '../../src/shared/signer'
import {envShared} from '../../src/shared/envShared'
import {simpleCrypto} from '../../src/shared/simpleCrypto'
import {security} from '../../src/models/security'
import {SmileTask} from '../../src/models/database/SmileTask'
import {storageFactory} from '../../src/models/storage/storageFactory'
import {redisFactory} from '../../src/models/redisFactory'
import {env} from '../../src/config/env'
import {WebsocketServer} from '../../src/websockets/WebsocketServer'
import app from '../../src/app'
import {firebaseHelpers} from '../helpers/firebaseHelpers'

const redis = redisFactory.newRedisPubsub()
const server = http.createServer();
server.listen(9876, '0.0.0.0')
WebsocketServer.upgradeRequestsOn(server)

beforeAll(async () => {
  await firebaseHelpers.ensureTestEnv()
})

describe(`full event sequence`, () => {
  let user
  let smileTask
  beforeEach(async () => {
    await firebaseHelpers.clearFirestore()
    user = Factory.build('user')
    smileTask = Factory.build('smile_task', {userId: user.id})
    await Promise.all([smileTask.save(), user.save()])
  })

  test(`successfully track task whole progress`, async () => {
    const ws = new WSConsumer(`ws://localhost:9876/ws/smile-tasks/${smileTask.id}`)
    let receivedFinish = false
    let messages = []
    ws.on('message', function(messageStr) {
      const message = JSON.parse(messageStr)
      messages.push(message)
      if (message['event'] === 'finished') {
        receivedFinish = true
      }
    })

    await helpers.sleep(250)
    await helpers.waitUntil(() => ws.opened)

    const pubsubKey = `worker-progress:${smileTask.filepathUploaded}`
    redis.publish(pubsubKey, JSON.stringify({"event": "processing_step", "step": "download", "inx": 0, "maxInx": 6}))
    redis.publish(pubsubKey, JSON.stringify({"event": "processing_step", "step": "preprocessing", "inx": 1, "maxInx": 6}))
    redis.publish(pubsubKey, JSON.stringify({"event": "processing_step", "step": "segment", "inx": 2, "maxInx": 6}))
    redis.publish(pubsubKey, JSON.stringify({"event": "processing_step", "step": "beautify", "inx": 3, "maxInx": 6}))
    redis.publish(pubsubKey, JSON.stringify({"event": "processing_step", "step": "synth", "inx": 4, "maxInx": 6}))
    redis.publish(pubsubKey, JSON.stringify({"event": "processing_step", "step": "postprocessing", "inx": 5, "maxInx": 6}))
    redis.publish(pubsubKey, JSON.stringify({"event": "processing_step", "step": "upload", "inx": 6, "maxInx": 6}))
    redis.publish(pubsubKey, JSON.stringify({"event": "finished"}))
    redis.publish(pubsubKey, '#QUIT#')

    await helpers.waitUntil(() => receivedFinish, {timeout: 200})
    expect(messages).toEqual([
     {"event":"processing_step","step":"download","inx":0,"maxInx":6},
     {"event":"processing_step","step":"preprocessing","inx":1,"maxInx":6},
     {"event":"processing_step","step":"segment","inx":2,"maxInx":6},
     {"event":"processing_step","step":"beautify","inx":3,"maxInx":6},
     {"event":"processing_step","step":"synth","inx":4,"maxInx":6},
     {"event":"processing_step","step":"postprocessing","inx":5,"maxInx":6},
     {"event":"processing_step","step":"upload","inx":6,"maxInx":6},
     {"event":"finished"}
    ])
    await helpers.waitUntil(() => ws.closed, {timeout: 200})
    expect(ws.closed).toBe(true)
  })
})

afterAll(async (done) => {
  await redis.quit()
  server.close(done);
})
