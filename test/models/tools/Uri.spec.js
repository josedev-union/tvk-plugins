import {Uri} from '../../../src/models/tools/Uri'

test(`split full uris`, () => {
    const uri = new Uri('http://user:pass@dentrino.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('dentrino.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without protocol`, () => {
    const uri = new Uri('user:pass@dentrino.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe(null)
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('dentrino.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without user`, () => {
    const uri = new Uri('http://dentrino.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe(null)
    expect(uri.domainAndPort).toBe('dentrino.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without password`, () => {
    const uri = new Uri('http://user@dentrino.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user')
    expect(uri.domainAndPort).toBe('dentrino.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without port`, () => {
    const uri = new Uri('http://user:pass@dentrino.test.com/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('dentrino.test.com')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without port`, () => {
    const uri = new Uri('http://user:pass@dentrino.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('dentrino.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without path`, () => {
    const uri = new Uri('http://user:pass@dentrino.test.com:3000')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('dentrino.test.com:3000')
    expect(uri.path).toBe('/')
})

test(`split uris with only domain and port`, () => {
    const uri = new Uri('dentrino.test.com:3000')
    expect(uri.protocol).toBe(null)
    expect(uri.user).toBe(null)
    expect(uri.domainAndPort).toBe('dentrino.test.com:3000')
    expect(uri.path).toBe('/')
})

test(`split uris with only domain`, () => {
    const uri = new Uri('dentrino.test.com')
    expect(uri.protocol).toBe(null)
    expect(uri.user).toBe(null)
    expect(uri.domainAndPort).toBe('dentrino.test.com')
    expect(uri.path).toBe('/')
})

test(`format full uris`, () => {
    const uri = new Uri('http://user:pass@dentrino.test.com:3000/the/path.jpg')
    expect(uri.toString()).toBe('http://user:pass@dentrino.test.com:3000/the/path.jpg')
    expect(uri.toString({protocol: false})).toBe('user:pass@dentrino.test.com:3000/the/path.jpg')
    expect(uri.toString({user: false})).toBe('http://dentrino.test.com:3000/the/path.jpg')
    expect(uri.toString({path: false})).toBe('http://user:pass@dentrino.test.com:3000')
    expect(uri.toString({user: false, protocol: false, path: false})).toBe('dentrino.test.com:3000')
})

test(`format only host`, () => {
    const uri = new Uri('http://dentrino.test.com:3000')
    expect(uri.toString()).toBe('http://dentrino.test.com:3000/')
})

test(`format only domain`, () => {
    const uri = new Uri('dentrino.test.com:3000')
    expect(uri.toString()).toBe('dentrino.test.com:3000/')
})
