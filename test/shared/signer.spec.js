import {signer} from '../../src/shared/signer'

test(`sign a string`, () => {
  let str = "xpto-abcd-ho&^"
  let key = "mysecret-other"
  let apiKey = "mysecret-api"
  let signature = signer.sign(str, key, apiKey)
  expect(signer.verify(str, key, apiKey, signature)).toBe(true)
  expect(signer.verify(str+" ", key, apiKey, signature)).toBe(false)
  expect(signer.verify(" "+str, key, apiKey, signature)).toBe(false)
  expect(signer.verify(str, key+" ", apiKey, signature)).toBe(false)
  expect(signer.verify(str, " "+key, apiKey, signature)).toBe(false)
  expect(signer.verify(str, key, apiKey+" ", signature)).toBe(false)
  expect(signer.verify(str, key, " "+apiKey, signature)).toBe(false)
})

test(`sign a JSON`, () => {
  let json = {aaa: "apto", zzz: "zpto", xxx: "xpto", bbb: {f: "fgts", g: "gpto"}}
  let json2 = {zzz: "zpto", bbb: {f: "fgts", g: "gpto"}, aaa: "apto", xxx: "xpto"}
  let json3 = {zzz: "zpto", aaa: "apto", xxx: "xpto", bbb: {g: "gpto", f: "fgts"}}
  let json4 = {zzz: "zpto", bbb: {f: "fgts", g: "gpto"}, aaa: "apto", xxx: "xpto"}
  let key = "mysecret-other"
  let apiKey = "mysecret-api"
  let signature = signer.sign(json, key, apiKey)
  expect(signer.verify(json, key, apiKey, signature)).toBe(true)
  expect(signer.verify(json2, key, apiKey, signature)).toBe(true)
  expect(signer.verify(json3, key, apiKey, signature)).toBe(true)
  expect(signer.verify(json4, key, apiKey, signature)).toBe(true)
  expect(signer.verify(Object.assign(json, {x: 10}), key, apiKey, signature)).toBe(false)
  expect(signer.verify(Object.assign(json, {aaa: 10}), key, apiKey, signature)).toBe(false)
  expect(signer.verify({zzz: "zpto", xxx: "xpto"}, key, apiKey, signature)).toBe(false)
  expect(signer.verify(json, key+" ", apiKey, signature)).toBe(false)
  expect(signer.verify(json, " "+key, apiKey, signature)).toBe(false)
})

test(`sign an Array`, () => {
  let array = [1, 'bar', 99, 'foo']
  let key = "mysecret-other"
  let apiKey = "mysecret-api"
  let signature = signer.sign(array, key, apiKey)
  expect(signer.verify(array, key, apiKey, signature)).toBe(true)
  expect(signer.verify(Array.prototype.concat([''], array), key, apiKey, signature)).toBe(false)
  expect(signer.verify(Array.prototype.concat(array, ['']), key, apiKey, signature)).toBe(false)
})

test(`serializes an array`, () => {
  expect(signer.serialize(['&&&', 'a string', 10])).toBe('"&&&":"a string":10')
})
