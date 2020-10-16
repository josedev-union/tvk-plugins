import {signer} from '../../src/shared/signer'

test(`sign a string with a specified key`, () => {
    let str = "xpto-abcd-ho&^"
    let key = "mysecret"
    let signature = signer.sign(str, key)
    expect(signer.verify(str, key, signature)).toBe(true)
    expect(signer.verify(str+" ", key, signature)).toBe(false)
    expect(signer.verify(" "+str, key, signature)).toBe(false)
    expect(signer.verify(str, key+" ", signature)).toBe(false)
    expect(signer.verify(str, " "+key, signature)).toBe(false)
})

test(`sign a JSON with a specified key`, () => {
    let json = {aaa: "apto", zzz: "zpto", xxx: "xpto", bbb: {f: "fgts", g: "gpto"}}
    let json2 = {zzz: "zpto", bbb: {f: "fgts", g: "gpto"}, aaa: "apto", xxx: "xpto"}
    let json3 = {zzz: "zpto", aaa: "apto", xxx: "xpto", bbb: {g: "gpto", f: "fgts"}}
    let json4 = {zzz: "zpto", bbb: {f: "fgts", g: "gpto"}, aaa: "apto", xxx: "xpto"}
    let key = "mysecret"
    let signature = signer.sign(json, key)
    expect(signer.verify(json, key, signature)).toBe(true)
    expect(signer.verify(json2, key, signature)).toBe(true)
    expect(signer.verify(json3, key, signature)).toBe(true)
    expect(signer.verify(json4, key, signature)).toBe(true)
    expect(signer.verify(Object.assign({x: 10}, json), key, signature)).toBe(false)
    expect(signer.verify(Object.assign({aaa: 10}, json), signature)).toBe(false)
    expect(signer.verify({zzz: "zpto", xxx: "xpto"}, signature)).toBe(false)
    expect(signer.verify(json, key+" ", signature)).toBe(false)
    expect(signer.verify(json, " "+key, signature)).toBe(false)
})