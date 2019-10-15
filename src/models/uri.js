class Uri {
    constructor(fullUri) {
        const match = fullUri.match(/^(([^:]+):\/\/)?(([^@\/]+)@)?([^\/]+)(\/.*)?$/)
        this.protocol = match[2]
        this.user = match[4]
        this.domainAndPort = match[5]
        this.path = match[6] || "/"

        this.protocol = typeof(this.protocol) === 'undefined' ? null : this.protocol
        this.user = typeof(this.user) === 'undefined' ? null : this.user
        this.path = typeof(this.path) === 'undefined' ? null : this.path
    }

    toString({protocol=true, user=true, path=true} = {protocol: true, user: true, path: true}) {
        let str = ''
        if (protocol && this.protocol) str += `${this.protocol}://`
        if (user && this.user) str += `${this.user}@`
        str += this.domainAndPort
        if (path && this.path) str += this.path
        return str
    }
}

export default Uri