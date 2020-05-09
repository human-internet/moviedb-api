'use strict'

const
    Server = require('./server/server')

function main() {
    // Init server
    const server = new Server({
        configFile: 'config.json',
        repositories: {
            AppUser: 'movieDB'
        },
        components: {
            Common: true,
            ResponseMapper: true
        }
    })

    // Start server
    server.start()
}

main()