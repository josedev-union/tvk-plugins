import {SmileTask} from '../src/models/database/SmileTask'

const SMILE_TASK_IDS = [
  'ODM4NjMxNjA5OTAxNEdVOVAqPGZU',
  'ODM4NjMxNjAzNDA0NUFyOHs1SXhW',
  'ODM4NjMxNjI0MTU2MkohYnp5Yldw',
  'ODM4NjMxNjIwOTM3OXdOazBackws',
  'ODM4NjMxNjkyMzM5OVZwM0VHaHds',
  'ODM4NjMxNzA3MDc3OGRyOClDYXBq',
  'ODM4NjMxNzAwMTEzNGxNKFBUMH1m',
  'ODM4NjMxNzEzNDY4OHpORmN9T3Ah',
  'ODM4NjMxNzU2NzgyMSRWQHZHT3M9',
  'ODM4NjMxNzUzNzE1MSR0Z2ksWEQj',
  'ODM4NjMxNzYwNjUxOT5qKWxvNmJm',
  'ODM4NjMxNzczNTE5OC1SPkxBWCVf',
  'ODM4NjMxNzgzMDQxMXg4JjNORFVT',
  'ODM4NjMyNjk0MzAxM0VIajVcUTJH',
  'ODM4NjQ5NjAxMTUyMDdPbT0oY1dC',
]

async function main() {
  const tasksSize = SMILE_TASK_IDS.length
  for (let i = 0; i < tasksSize; i++) {
    const taskId = SMILE_TASK_IDS[i]
    const task = SmileTask.build(SmileTask.RequesterType.inhouseClient(), {
      id: taskId,
      ip: '127.0.0.1',
      imageMD5: "image MD5",
      userId: "user-id",
      clientId: "client-id",
      contentType: "image/jpeg",
    })
    await task.save()
    console.log("Smile Task ID", task.id)
    console.log("Smile Task:", task)
  }
}

main()
