import {signer} from '../src/shared/signer'
import {envShared} from '../src/shared/envShared'

const str = process.env.STR
if (!str) throw 'You need to set the env var STR'

const pass = process.env.PASS
if (!pass) throw 'You need to set the env var PASS'

console.log(`STR: "${str}"`)
console.log(`PASS: "${pass}"`)

console.log(`SIGNATURE: "${signer.sign(str, pass)}"`)
