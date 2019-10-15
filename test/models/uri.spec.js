import Uri from '../../src/models/uri'

test(`split full uris`, () => {
    const uri = new Uri('http://user:pass@miroweb.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('miroweb.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without protocol`, () => {
    const uri = new Uri('user:pass@miroweb.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe(null)
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('miroweb.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without user`, () => {
    const uri = new Uri('http://miroweb.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe(null)
    expect(uri.domainAndPort).toBe('miroweb.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without password`, () => {
    const uri = new Uri('http://user@miroweb.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user')
    expect(uri.domainAndPort).toBe('miroweb.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without port`, () => {
    const uri = new Uri('http://user:pass@miroweb.test.com/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('miroweb.test.com')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without port`, () => {
    const uri = new Uri('http://user:pass@miroweb.test.com:3000/the/path.jpg')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('miroweb.test.com:3000')
    expect(uri.path).toBe('/the/path.jpg')
})

test(`split uris without path`, () => {
    const uri = new Uri('http://user:pass@miroweb.test.com:3000')
    expect(uri.protocol).toBe('http')
    expect(uri.user).toBe('user:pass')
    expect(uri.domainAndPort).toBe('miroweb.test.com:3000')
    expect(uri.path).toBe('/')
})

test(`split uris with only domain and port`, () => {
    const uri = new Uri('miroweb.test.com:3000')
    expect(uri.protocol).toBe(null)
    expect(uri.user).toBe(null)
    expect(uri.domainAndPort).toBe('miroweb.test.com:3000')
    expect(uri.path).toBe('/')
})

test(`split uris with only domain`, () => {
    const uri = new Uri('miroweb.test.com')
    expect(uri.protocol).toBe(null)
    expect(uri.user).toBe(null)
    expect(uri.domainAndPort).toBe('miroweb.test.com')
    expect(uri.path).toBe('/')
})

test(`format full uris`, () => {
    const uri = new Uri('http://user:pass@miroweb.test.com:3000/the/path.jpg')
    expect(uri.toString()).toBe('http://user:pass@miroweb.test.com:3000/the/path.jpg')
    expect(uri.toString({protocol: false})).toBe('user:pass@miroweb.test.com:3000/the/path.jpg')
    expect(uri.toString({user: false})).toBe('http://miroweb.test.com:3000/the/path.jpg')
    expect(uri.toString({path: false})).toBe('http://user:pass@miroweb.test.com:3000')
    expect(uri.toString({user: false, protocol: false, path: false})).toBe('miroweb.test.com:3000')
})

test(`format only host`, () => {
    const uri = new Uri('http://miroweb.test.com:3000')
    expect(uri.toString()).toBe('http://miroweb.test.com:3000/')
})

test(`format only domain`, () => {
    const uri = new Uri('miroweb.test.com:3000')
    expect(uri.toString()).toBe('miroweb.test.com:3000/')
})