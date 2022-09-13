import {ApiClient} from '../src/models/database/ApiClient'

async function create() {
  let client = ApiClient.build()
  await client.save()

  console.log(`Client Created! ID: ${client.id} Secret: ${client.secret} Exposed Secret: ${client.exposedSecret}`)
}
create().catch(err => console.error(err))
