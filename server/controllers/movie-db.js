'use strict'

/**
 * @apiDefine SuccessResponse
 * @apiSuccess {Boolean} success Response status
 * @apiSuccess {String} code Result code
 * @apiSuccess {String} message Result message
 */

/**
 * @apiDefine OkResponseExample
 * @apiSuccessExample {json} SuccessResponse:
 *   {
 *     "success": true,
 *     "code": "OK",
 *     "message": "Success"
 *   }
 */

/**
 * @apiDefine ErrorResponse
 * @apiError {Boolean} success Response status
 * @apiError {String} code Error code
 * @apiError {String} message Error message
 *
 * @apiErrorExample {json} ErrorResponse:
 *   {
 *     "success": false,
 *     "code": "<ERROR_CODE>",
 *     "message": "<ERROR_MESSAGE>"
 *   }
 */

const
    dockerNames = require('docker-names'),
    express = require('express'),
    fetch = require('node-fetch'),
    jwt = require('jsonwebtoken'),
    moment = require('moment'),
    ms = require('ms'),
    _ = require('lodash'),
    AppManifest = require('../manifest'),
    APIError = require('../api-error'),
    BaseController = require('./base'),
    Constants = require('../constants')

class MovieDBController extends BaseController {
    constructor({config, components, models, server, logger}) {
        super({models, config, components, server})

        // Set time
        this.startTime = moment()

        // Create child logger
        this.logger = logger.child({scope: 'MovieDB.API'})

        // Init router
        this.router = express.Router()

        // Route
        this.route()
    }

    handlePostUserMovieRating = this.handleRESTAsync(async req => {
        // Get body
        const {body} = req

        // Set movieId from path parameter
        body.movieId = req.params.movieId

        // Validate body
        this.validate({
            movieId: 'required'
        }, body)

        // Get parameters
        const {movieId, rating} = body
        const userId = req.userAccess.id

        // Check rating value
        if (!_.isNumber(rating) || (rating < 1 || rating > 5)) {
            throw new APIError('ERR_5')
        }

        // Get models
        const {MovieRating: MovieRatingModel, UserMovieRating: UserMovieRatingModel} = this.models

        // Get current movie rating, if not exist create a new one
        const movieRatings = await MovieRatingModel.findOrCreate({
            where: {movieId},
            defaults: {
                movieId
            }
        })

        // Get movie rating instance
        const movieRating = movieRatings[0]

        // If user has not yet rate, then increment ratingCount
        const userRating = await UserMovieRatingModel.findOne({
            where: {movieId, userId}
        })

        // Get rating count and sum
        let {ratingCount} = movieRating
        let sumRating = movieRating.ratingCount * movieRating.avgRating

        // Determine average rating
        let avgRating, id
        if (userRating) {
            // If user rating already available, recalculate average
            let diffRating = rating - userRating.rating
            avgRating = (sumRating + diffRating) / ratingCount
            id = userRating.id
        } else {
            // Else, new user rating, add rating and increment count
            ratingCount++
            avgRating = (sumRating + rating) / ratingCount
        }

        // Increment version
        const version = movieRating.version + 1

        // Persist user rating and movie rating average
        const data = await MovieRatingModel.sequelize.transaction(async tx => {
            // Upsert user rating
            await UserMovieRatingModel.upsert({
                id, movieId, userId, rating, version
            }, {transaction: tx})

            // Update movie
            const result = await MovieRatingModel.update({
                avgRating, ratingCount, version
            }, {
                where: {
                    id: movieRating.id,
                    version: movieRating.version
                },
                transaction: tx
            })

            // If no update affected, then throw error
            if (result[0] === 0) {
                throw new APIError('ERR_4')
            }

            // Return average rating
            return Promise.resolve({
                avgRating, ratingCount, version
            })
        })

        return {data}
    })

    /**
     * Handler chain function to validate user session
     * @type {function(...[*]=)}
     */
    handleValidateUserSession = this.handleAsync(async (req, res, next) => {
        // Get access token
        const userAccessToken = req.header("userAccessToken")

        // Validate session
        req.userAccess = await this.validateUserSession(userAccessToken)

        // Continue
        next()
    })

    handleGetAPIStatus = this.handleREST(() => {
        return {
            data: {
                name: AppManifest.AppName,
                version: AppManifest.AppVersion,
                uptime: this.startTime.fromNow()
            }
        }
    })

    handleGetProfile = this.handleRESTAsync(async (req) => {
        // Get user info
        const {userAccess: user} = req

        const u = await this.models.AppUser.findByPk(user.id)

        return {
            data: {
                id: u.extId,
                fullName: u.fullName,
                updatedAt: getUnixTime(u.updatedAt)
            }
        }
    })

    handleLogOut = this.handleRESTAsync(async req => {
        // Get session token
        const userAccessToken = req.header("userAccessToken")

        // Try validate session
        let session
        try {
            session = await this.validateUserSession(userAccessToken)
        } catch (e) {
            this.logger.error(`failed to validate user session. Error=${e.message}`)
            return
        }

        // Invalidate session
        const result = await this.models.AppUser.update({
            lastLogIn: null,
            updatedAt: new Date()
        }, {
            where: {id: session.id}
        })

        this.logger.debug(`Result=${result}`)
    })

    handleUpdateProfile = this.handleRESTAsync(async req => {
        // Get user info
        const {userAccess: user} = req

        // Get request body
        const body = req.body

        // Update user name
        await this.models.AppUser.update({
            fullName: body.fullName
        }, {
            where: {id: user.id}
        })
    })

    handleRefreshSession = this.handleRESTAsync(async req => {
        // Get user info
        const {userAccess: user} = req

        // Create new session
        const session = await this.newUserSession(user.id, user.extId, getUnixTime(new Date()))

        return {
            data: session
        }
    })

    handleLogIn = this.handleRESTAsync(async (req) => {
        // Get request body
        let body = req.body

        // Validate body
        this.validate({exchangeToken: 'required'}, body)

        // Verify Exchange Token
        const userHash = await this.verifyExchangeToken(body.exchangeToken)

        // Get user, create if not exists
        let users = await this.models.AppUser.findOrCreate({
            where: {userHash: userHash},
            defaults: {
                extId: generateExtId(),
                userHash: userHash,
                fullName: _.startCase(dockerNames.getRandomName(false))
            }
        })

        // Create user session
        const user = users[0]
        const session = await this.newUserSession(user.id, user.extId, getUnixTime(new Date()))

        // Return response
        return {
            data: session
        }
    })

    handleGetMovieRating = this.handleRESTAsync(async req => {
        // Get movie id
        const {movieId} = req.params

        // Get movie rating
        const movie = await this.models.MovieRating.findOne({
            where: {movieId}
        })

        let data
        if (!movie) {
            // If movie not found, set values to zero
            data = {
                avgRating: 0, ratingCount: 0, version: 0
            }
        } else {
            // Else, set from movie rating data
            data = {
                avgRating: movie.avgRating,
                ratingCount: movie.ratingCount,
                version: movie.version
            }
        }

        return {data}
    })

    handlePostUserMovieComment = this.handleRESTAsync(async req => {
        // Get body
        const {body} = req

        // Set movieId
        body.movieId = req.params.movieId

        // Validate body
        this.validate({
            movieId: 'required',
            comment: 'required'
        }, body)

        // Get parameters
        const {movieId, comment} = body
        const userId = req.userAccess.id

        // Get models
        const {MovieComment: MovieCommentModel, UserMovieComment: UserMovieCommentModel} = this.models

        // Get current movie movie comment, if not exist create a new one
        let rows = await MovieCommentModel.findOrCreate({
            where: {movieId},
            defaults: {
                movieId
            }
        })

        // Get movie comment instance
        const movie = rows[0]

        // Check if user has comments
        const userComment = await UserMovieCommentModel.findOne({
            where: {userId, movieId},
            order: [['version', 'DESC']]
        })

        // Get unique user count
        let uniqueUserCount = movie.uniqueUser

        // If user comment not exist, add unique user
        if (!userComment) {
            uniqueUserCount++
        }

        // Increment version and comment count
        const version = movie.version + 1
        const commentsCount = movie.commentsCount + 1

        // Persist comment
        await MovieCommentModel.sequelize.transaction(async tx => {
            // Insert user comment
            await UserMovieCommentModel.create({
                movieId, userId, comment, version
            }, {transaction: tx})

            // Update movie comment
            const result = await MovieCommentModel.update({
                commentsCount,
                uniqueUser: uniqueUserCount,
                version
            }, {
                where: {
                    id: movie.id,
                    version: movie.version
                },
                transaction: tx
            })

            // If no update affected, then throw error
            if (result[0] === 0) {
                throw new APIError('ERR_6')
            }
        })
    })

    handleListUserMovieComments = this.handleRESTAsync(async req => {
        // Get parameters
        let {movieId} = req.params
        let {skip = '0', limit = '10', sortBy = 'latest'} = req.query

        // Convert to number
        skip = parseInt(skip, 10)
        if (!_.isFinite(skip)) {
            skip = 0
        }

        limit = parseInt(limit, 10)
        if (!_.isFinite(limit)) {
            limit = 10
        }

        // Get Movie Comment metadata
        const movieMeta = await this.models.MovieComment.findOne({
            where: {movieId}
        })

        // If movie meta is not available, return
        if (!movieMeta) {
            return {
                data: {
                    comments: [],
                    _metadata: {skip, limit, sortBy, commentsCount: 0, uniqueUserCount: 0}
                }
            }
        }

        // Prepare sort by
        let orderOpt
        switch (sortBy) {
            case 'earliest': {
                orderOpt = [['version', 'ASC']]
                break
            }
            default:
                sortBy = 'latest'
                orderOpt = [['version', 'DESC']]
        }

        // Get comments
        const comments = await this.models.UserMovieComment.findAll({
            where: {movieId},
            limit: limit,
            offset: skip,
            order: orderOpt,
            include: ['user']
        })

        // Compose response
        const commentsResp = comments.map(item => {
            return {
                id: item.id,
                userId: item.user.extId,
                userName: item.user.fullName,
                comment: item.comment,
                version: item.version,
                updatedAt: getUnixTime(item.updatedAt)
            }
        })

        const metaResp = {
            skip, limit, sortBy,
            commentsCount: movieMeta.commentsCount,
            uniqueUserCount: movieMeta.uniqueUser,
        }

        return {
            data: {
                comments: commentsResp,
                _metadata: metaResp
            }
        }
    })

    route() {
        /**
         * @api {get} / Get API Status
         * @apiName GetAPIStatus
         * @apiGroup Common
         * @apiDescription Get API uptime status and version info
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Response data
         * @apiSuccess {String} data.name API Name
         * @apiSuccess {String} data.version API Version
         * @apiSuccess {String} data.uptime API uptime
         *
         * @apiSuccessExample {json} SuccessResponse
         *   {
         *     "success": true,
         *     "code": "OK",
         *     "message": "Success",
         *     "data": {
         *       "name": "MovieDB.API",
         *       "version": "0.0.1",
         *       "uptime": "7 minutes ago"
         *     }
         *   }
         *
         */
        this.router.get('/', this.handleGetAPIStatus)

        /**
         * @api {post} /users/log-in Log In
         * @apiName LogIn
         * @apiGroup User
         * @apiDescription LogIn to 3rd party app using humanId Exchange Token
         *
         * @apiHeader (Request Header) {String} clientSecret Client credentials to access Api
         *
         * @apiParam (Request Body - application/json) {String} exchangeToken An exchange token that states user has been verified by humanId
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Response data
         * @apiSuccess {String} data.token Access Token to App
         * @apiSuccess {String} data.expiredAt Access Token expired in unix epoch
         *
         * @apiSuccessExample {json} SuccessResponse
         * {
         *     "success": true,
         *     "code": "OK",
         *     "message": "Success",
         *     "data": {
         *         "token": "<JWT_USER_SESSION>"
         *         "expiredAt": 1589014574
         *     }
         * }
         *
         * @apiUse ErrorResponse
         */
        this.router.post('/users/log-in', this.handleValidateClientApp, this.handleLogIn)

        /**
         * @api {get} /users/profile Get User Profile
         * @apiName GetUserProfile
         * @apiGroup User
         * @apiDescription Get user profile by user access token
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Response data
         * @apiSuccess {String} data.id User external identifier
         * @apiSuccess {String} data.fullName User Full Name
         * @apiSuccess {number} data.updatedAt Updated at timestamp in Unix Epoch
         *
         * @apiSuccessExample {json} SuccessResponse
         *   {
         *     "success": true,
         *     "code": "OK",
         *     "message": "Success",
         *     "data": {
         *       "id": "1589009542",
         *       "fullName": "John Doe",
         *       "updatedAt": 1589030434
         *     }
         *   }
         *
         * @apiUse ErrorResponse
         */
        this.router.get('/users/profile', this.handleValidateUserSession, this.handleGetProfile)

        /**
         * @api {put} /users/refresh-session Refresh Session
         * @apiName RefreshSession
         * @apiGroup User
         * @apiDescription Refresh user session
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Response data
         * @apiSuccess {String} data.token Access Token to App
         * @apiSuccess {String} data.expiredAt Access Token expired in unix epoch
         *
         * @apiSuccessExample {json} SuccessResponse
         * {
         *     "success": true,
         *     "code": "OK",
         *     "message": "Success",
         *     "data": {
         *         "token": "<JWT_USER_SESSION>"
         *         "expiredAt": 1589014574
         *     }
         * }
         *
         * @apiUse ErrorResponse
         */
        this.router.put('/users/refresh-session', this.handleValidateUserSession, this.handleRefreshSession)

        /**
         * @api {put} /users/profile Update Profile
         * @apiName UpdateProfile
         * @apiGroup User
         * @apiDescription Update user profile by user access token
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiParam (Request Body - application/json) {String} fullName Update full name
         *
         * @apiUse SuccessResponse
         *
         * @apiUse OkResponseExample
         *
         * @apiUse ErrorResponse
         */
        this.router.put('/users/profile', this.handleValidateUserSession, this.handleUpdateProfile)

        /**
         * @api {put} /users/log-out Log Out
         * @apiName LogOut
         * @apiGroup User
         * @apiDescription Log out of App
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiUse SuccessResponse
         *
         * @apiUse OkResponseExample
         *
         * @apiUse ErrorResponse
         */
        this.router.put('/users/log-out', this.handleLogOut)

        /**
         * @api {post} /movies/:movieId/rating Post Movie Rating
         * @apiName PostUserMovieRating
         * @apiGroup Movie
         * @apiDescription Post movie rating by User.
         * Updates movie ratings if User already post a rating
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiParam (Path Variables) {string} movieId Movies identifier from TMDb API
         * @apiParam (Request Body - application/json) {number} rating User rating integer
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Result data
         * @apiSuccess {number} data.avgRating Updated movie average rating
         * @apiSuccess {number} data.ratingCount Updated total user rating count
         * @apiSuccess {number} data.version Data version
         *
         * @apiSuccessExample {json} SuccessResponse
         *     {
         *         "success": true,
         *         "code": "OK",
         *         "message": "Success",
         *         "data": {
         *             "avgRating": 4.5,
         *             "ratingCount": 2,
         *             "version": 20
         *         }
         *     }
         *
         * @apiUse ErrorResponse
         */
        this.router.post('/movies/:movieId/rating', this.handleValidateUserSession, this.handlePostUserMovieRating)

        /**
         * @api {get} /movies/:movieId/rating Get Movie Rating
         * @apiName GetMovieRating
         * @apiGroup Movie
         * @apiDescription Get average ratings for a Movie
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiParam (Path Variables) {string} movieId Movie identifier from TMDb API
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Result data
         * @apiSuccess {number} data.avgRating Updated movie average rating
         * @apiSuccess {number} data.ratingCount Updated total user rating count
         * @apiSuccess {number} data.version Data version
         *
         * @apiSuccessExample {json} SuccessResponse
         *     {
         *         "success": true,
         *         "code": "OK",
         *         "message": "Success",
         *         "data": {
         *             "avgRating": 4.5,
         *             "ratingCount": 2,
         *             "version": 20
         *         }
         *     }
         *
         * @apiUse ErrorResponse
         */
        this.router.get('/movies/:movieId/rating', this.handleValidateUserSession, this.handleGetMovieRating)

        /**
         * @api {post} /movies/:movieId/comment Post Movie Comment
         * @apiName PostUserMovieComment
         * @apiGroup Movie
         * @apiDescription Post a comment to a movie by User
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiParam (Path Variables) {string} movieId Movie identifier from TMDb API
         * @apiParam (Request Body - application/json) {string} comment User comment
         *
         * @apiUse SuccessResponse
         *
         * @apiUse OkResponseExample
         *
         * @apiUse ErrorResponse
         */
        this.router.post('/movies/:movieId/comment', this.handleValidateUserSession, this.handlePostUserMovieComment)

        /**
         * @api {get} /movies/:movieId/comments List User Movie Comments
         * @apiName ListUserMovieComments
         * @apiGroup Movie
         * @apiDescription List comments to a movie by user
         *
         * @apiHeader (Request Header) {String} userAccessToken User Access Token
         *
         * @apiParam (Path Variables) {string} movieId Movie identifier from TMDb API
         *
         * @apiParam (Request Query) {number} skip Skip number of result. Also known as offset. Default: 0
         * @apiParam (Request Query) {number} limit Limit number of result. Default: 10
         * @apiParam (Request Query) {string} sortBy Sort result option. Available Values: earliest, latest (default)
         *
         * @apiUse SuccessResponse
         * @apiSuccess {Object} data Result data
         * @apiSuccess {Object[]} data.comments List of user comments
         * @apiSuccess {number} data.comments List of user comments
         * @apiSuccess {number} data.comments.id Comment Id
         * @apiSuccess {string} data.comments.userId User external Id
         * @apiSuccess {string} data.comments.comment User comment
         * @apiSuccess {number} data.comments.version Data version
         * @apiSuccess {number} data.comments.updatedAt Update timestamp in Unix Epoch
         * @apiSuccess {Object} data._metadata Search result metadata
         * @apiSuccess {number} data._metadata.skip Skip number of result
         * @apiSuccess {number} data._metadata.limit Limit number of result
         * @apiSuccess {string} data._metadata.sortBy Sort result option
         * @apiSuccess {number} data._metadata.commentsCount Total comments count
         * @apiSuccess {number} data._metadata.uniqueUserCount Unique user count
         *
         * @apiSuccessExample {json} SuccessResponse
         *     {
         *         "success": true,
         *         "code": "OK",
         *         "message": "Success",
         *         "data": {
         *             "comments": [
         *                 {
         *                     "id": 5,
         *                     "userId": "1589045274",
         *                     "userName": "Optimistic Benz",
         *                     "comment": "test",
         *                     "version": 6,
         *                     "updatedAt": 1589089195
         *                 },
         *                 {
         *                     "id": 4,
         *                     "userId": "1589045704",
         *                     "userName": "Mystifying Shockley",
         *                     "comment": "test",
         *                     "version": 5,
         *                     "updatedAt": 1589088060
         *                 },
         *                 {
         *                     "id": 3,
         *                     "userId": "1589045704",
         *                     "userName": "Mystifying Shockley",
         *                     "comment": "test",
         *                     "version": 4,
         *                     "updatedAt": 1589085810
         *                 },
         *                 {
         *                     "id": 2,
         *                     "userId": "1589045704",
         *                     "userName": "Mystifying Shockley",
         *                     "comment": "good movie",
         *                     "version": 3,
         *                     "updatedAt": 1589085771
         *                 },
         *                 {
         *                     "id": 1,
         *                     "userId": "1589045704",
         *                     "userName": "Mystifying Shockley",
         *                     "comment": "good movie",
         *                     "version": 2,
         *                     "updatedAt": 1589085738
         *                 }
         *             ],
         *             "_metadata": {
         *                 "skip": 0,
         *                 "limit": 10,
         *                 "sortBy": "latest",
         *                 "commentsCount": 5,
         *                 "uniqueUserCount": 2
         *             }
         *         }
         *     }
         *
         * @apiUse ErrorResponse
         */
        this.router.get('/movies/:movieId/comments', this.handleValidateUserSession, this.handleListUserMovieComments)
    }

    /**
     * Handler chain function to validate app as client
     * @type {function(...[*]=)}
     */
    handleValidateClientApp = (req, res, next) => {
        // Get client secret
        let clientSecret = req.header("clientSecret")

        // Validate client secret
        if (clientSecret !== this.config.client.appSecret) {
            throw new APIError(Constants.RESPONSE_ERROR_UNAUTHORIZED)
        }

        // Continue
        next()
    }

    /**
     * Generate session identifier
     *
     * @param {string} userExtId User external id
     * @param {number} lastLogInMillis User last login timestamp
     * @return {string} User Session Id
     */
    createSessionId(userExtId, lastLogInMillis) {
        const raw = `${userExtId}-${lastLogInMillis}`
        return this.components.Common.hmac(raw, this.config.client.sessionIdSecret)
    }

    /**
     * @typedef {Object} UserSession
     * @property {string} token User session JWT
     * @property {number} expiredAt Expired At in Unix Epoch
     */

    /**
     * @param {string} userId User PK
     * @param {string} userExtId User External ID
     * @param {number} timestamp Last Log in timestamp
     * @return {Promise<UserSession>} User access token
     */
    async newUserSession(userId, userExtId, timestamp) {
        // Get jwt secret
        const {jwtSecret, jwtLifetime} = this.config.client

        await this.models.AppUser.update({
            lastLogIn: timestamp * 1000,
            updatedAt: timestamp * 1000
        }, {
            where: {id: userId}
        })

        // Create session id
        const sessionId = this.createSessionId(userExtId, timestamp)

        // Calculate expiredAt
        const durationMs = ms(jwtLifetime)
        const expiredAt = timestamp + (durationMs / 1000)

        // Create session
        const jwtSession = jwt.sign({
            exp: expiredAt,
            data: {
                userId: userExtId,
                sessionId: sessionId
            }
        }, jwtSecret)

        return {
            token: jwtSession,
            expiredAt: expiredAt
        }
    }

    /**
     *  Validate user session
     *
     * @param {string} userAccessToken User instance
     */

    /**
     * @typedef {Object} UserSessionPayload
     * @property {string} id User Id
     * @property {string} extId User External Id
     */

    /**
     * Convert callback-style jwt verify function into Promise
     *
     * @param {string} token User access token
     * @returns {Promise<UserSessionJWTPayload>} User access token payload
     */
    verifyJWT = (token) => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, this.config.client.jwtSecret, (err, payload) => {
                if (err || !payload) {
                    // Handle expire error
                    if (err instanceof jwt.TokenExpiredError) {
                        return reject(new APIError('ERR_1', {source: err}))
                    }
                    // Else, return invalid token
                    return reject(new APIError('ERR_2', {source: err}))
                }
                resolve(payload)
            })
        })
    }

    /**
     * @typedef {Object} UserSessionJWTPayload
     * @property {number} iat Issued At
     * @property {number} exp Expired At
     * @property {Object} data Session data
     * @property {string} data.userId User external identifier
     * @property {string} data.sessionId User session identifier
     */

    verifyExchangeToken = async (exchangeToken) => {
        // Get component config
        const conf = this.config.components.humanID

        // Create url
        const url = conf.baseUrl + '/mobile/users/verifyExchangeToken'

        // Send request
        const resp = await fetch(url, {
            method: 'post',
            body: JSON.stringify({
                appId: conf.appId,
                appSecret: conf.appSecret,
                exchangeToken
            }),
            headers: {'Content-Type': 'application/json'},
        })

        // Parse resp body
        const respBody = await resp.json()

        // If not success, throw error
        if (!respBody.success) {
            this.logger.error(`Received error response.`, {respBody})
            throw new APIError('ERR_3')
        }

        return respBody.data.userHash
    }

    /**
     * Validate user session
     *
     * @param userAccessToken User JWT Access Token
     * @returns {Promise<{id: string, extId: string}>} User Session Payload
     */
    async validateUserSession(userAccessToken) {
        // Verify and extract payload from jwt
        const payload = await this.verifyJWT(userAccessToken)

        // Get user
        let user = await this.models.AppUser.findOne({
            where: {extId: payload.data.userId},
        })

        // If user not found, throw error
        if (!user) {
            throw new APIError(Constants.RESPONSE_ERROR_UNAUTHORIZED)
        }

        // Get last log in millis in UTC
        let lastLogIn;
        if (!user.lastLogIn) {
            lastLogIn = -1
        } else {
            lastLogIn = getUnixTime(user.lastLogIn)
        }

        // Generate session identifier
        const currentSessionId = this.createSessionId(user.extId, lastLogIn)

        // If current session id is different with payload, throw error
        if (currentSessionId !== payload.data.sessionId) {
            throw new APIError(Constants.RESPONSE_ERROR_UNAUTHORIZED)
        }

        // Return user payload
        return {
            id: user.id,
            extId: user.extId
        }
    }
}

function generateExtId() {
    let id = getUnixTime(new Date())
    return `${id}`
}

function getUnixTime(t) {
    return Math.round(t.getTime() / 1000)
}

module.exports = MovieDBController