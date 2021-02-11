import {ApiClient} from '../src/models/database/ApiClient'

let client = ApiClient.build()
client.save()

console.log(`Client Created! ID: ${client.id}`)
