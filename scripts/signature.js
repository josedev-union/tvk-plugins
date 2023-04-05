import {simpleCrypto} from '../src/shared/simpleCrypto'

// let claimJson = '{"clientId":"ODMyMDU4NjIyOTgyN1BHJGJhMzxK","paramsHashed":"none"}'
let claimJson = "{\"clientId\":\"ODMyMDU4NjIyOTgyN1BHJGJhMzxK\",\"paramsHashed\":\"none\"}"
let clientSecret = "06aa0671d105eb425efcee716668a8baee524c7c56994f1879dba3b6066097ec"
console.log(simpleCrypto.hmac(claimJson, clientSecret))
