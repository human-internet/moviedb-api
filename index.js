'use strict'

const
    Server = require('./server/server')

function main() {
    // Init server
    const server = new Server({
        configFile: 'config.json',
        models: {
            AppUser: 'movieDB',
            MovieComment: 'movieDB',
            MovieRating: 'movieDB',
            UserMovieComment: 'movieDB',
            UserMovieRating: 'movieDB'
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