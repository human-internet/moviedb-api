/**
 * @typedef {Object} ServerOpts
 * @property {string} configFile Config file path
 * @property {Array.<string, *>} models models
 * @property {Array.<string, *>} components Components
 */

const
    Constants = require('./constants'),
    AppManifest = require('./manifest'),
    Config = require('./config'),
    logger = require('./logger'),
    express = require('express'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    _ = require('lodash'),
    SequelizeDataSource = require('./ds-sequelize'),
    MovieDBController = require('./controllers/movie-db'),
    APIError = require('./api-error')

'use strict'

class Server {
    constructor(opt) {
        // Set logger
        this.logger = logger

        // Get parameters
        const {configFile, models: modelOpts, components: componentOpts} = opt

        // Load config
        this.config = Config.load(configFile)

        // Load components
        this.initComponents(this.config.server.pwd + '/server/components', componentOpts)

        // Load data sources
        this.initDataSources()

        // Load models
        this.initModels(this.config.server.pwd + '/server/models', modelOpts)

        // Initiate routing
        this.initRouting()
    }

    /**
     * Initialize data sources
     */
    initDataSources() {
        // Get config
        const conf = this.config.dataSources

        // Init data sources object
        const dataSources = {}

        // Iterate configurations
        Object.keys(conf).forEach(name => {
            // Get data source config
            /** @type {DataSourceConfiguration} item */
            const itemConf = conf[name]
            let ds;
            if (itemConf.lib === Constants.DS_LIB_SEQUELIZE) {
                ds = new SequelizeDataSource(itemConf, {logger})
            } else {
                return
            }

            // Init data sources
            ds.init()

            // Set data source
            dataSources[name] = ds
            this.logger.debug(`Data Source added: ${name}`, {scope: 'Server'})
        })

        this.dataSources = dataSources
    }


    /**
     * Initialize models
     *
     * @param modelsDir
     * @param opt
     */
    initModels(modelsDir, opt) {
        // Get data sources
        const {dataSources} = this

        // Init models
        const models = {}

        // Filter models list
        Object.keys(opt).forEach(name => {
            // Get data source
            const ds = dataSources[opt[name]]

            // If data source not found, continue
            if (!ds) {
                return
            }

            // Create file path
            const filePath = `${modelsDir}/${_.kebabCase(name)}.js`

            // If file di not exist in models dir, continue
            if (!fs.existsSync(filePath)) {
                return
            }

            // Load model
            models[name] = ds.initModel(filePath)
            this.logger.debug(`Model added: ${name}`, {scope: 'Server'})
        })

        // Associates models
        Object.keys(models).forEach(modelName => {
            if (models[modelName].associate) {
                models[modelName].associate(models)
            }
        })

        this.models = models
    }


    /**
     * @typedef {Object} ComponentOption
     * @property {string} fileName Override component file name
     */

    /**
     * Initialize components
     *
     * @param {string} dir Components files
     * @param {Object.<string, ComponentOption>} opt
     */
    initComponents(dir, opt) {
        // Get Component configuration map
        const confMap = this.config.components

        // Init components
        const components = {}

        // Iterate components
        Object.keys(opt).forEach(name => {
            // Get component config
            const cfg = opt[name]

            // Determine component file name
            let fileName
            if (cfg && cfg.fileName) {
                fileName = cfg.fileName
            } else {
                fileName = `${_.kebabCase(name)}.js`
            }

            // Create file path
            const filePath = `${dir}/${fileName}`

            // If file do not exist in models dir, skip
            if (!fs.existsSync(filePath)) {
                return
            }

            // Load file
            const comp = require(filePath)

            // Check if constructor available, call init function
            if (typeof comp.init === 'function') {
                // Initiate component and pass component config
                comp.init(confMap[name])
            }

            // Add component
            components[name] = require(filePath)
            this.logger.debug(`Component loaded: ${name}`, {scope: 'Server'})
        })

        // Set components
        this.components = components
    }

    /**
     * Initialize routing
     */
    initRouting() {
        const {models, components, config} = this

        // Configure router
        const router = express()

        // Configure global middleware
        router.use(bodyParser.json())
        router.use(bodyParser.urlencoded({extended: true}))

        // Init Routing
        router.use('/docs', express.static(this.config.server.pwd + '/docs/apidoc'))
        router.use(config.server.basePath, new MovieDBController({
            logger,
            components,
            config,
            models,
            server: {
                handleAsync: this.handleAsync,
                handleREST: this.handleREST,
                handleRESTAsync: this.handleRESTAsync,
                sendResponse: this.sendResponse
            }
        }).router)

        // Handle Resource Not Found
        router.use((req, res) => {
            this.sendErrorResponse(res, new APIError(Constants.RESPONSE_ERROR_NOT_FOUND))
        })

        // Handle error
        router.use((err, req, res, next) => {
            this.sendErrorResponse(res, err)
        })

        // Set router
        this.router = router
    }

    /**
     * Send success response
     *
     * @param res {*} Express response object
     * @param opt {object} Options
     * @param opt.message {string} Message to override
     * @param opt.data {*} Data
     * @param opt.code {string} Response code
     */
    sendResponse = (res, opt = {}) => {
        // Get response mapper
        const {ResponseMapper} = this.components

        // Deconstruct options
        const {code, message, data} = opt

        /** @type {Response} */
        let resp

        if (code) {
            // If code is set, get response code
            resp = ResponseMapper.get(code, {success: true})
        } else {
            // Else, get a generic success
            resp = ResponseMapper.getSuccess()
        }

        // Compose response
        const body = resp.compose({message, data})

        // Send response
        res.json(body)
    }

    /**
     * Send error response
     *
     * @param {*} res Express response
     * @param {APIError|Error} err Error
     */
    sendErrorResponse = (res, err) => {
        // Get response mapper
        const {ResponseMapper} = this.components

        /** @type {Response} */
        let resp
        /** @type {*} */
        let data

        // If error is not APIError, convert to Internal Error
        if (err.constructor.name !== "APIError") {
            resp = ResponseMapper.getInternalError()

            // If debug mode, add source error stack
            if (this.config.server.debug) {
                data = {
                    _errorDebug: {
                        name: err.name,
                        message: err.message,
                        stack: err.stack
                    }
                }
            }

            this.logger.error(err.stack, {scope: 'Server'})
        } else {
            resp = ResponseMapper.get(err.code)
        }

        // Compose body
        const body = resp.compose({data, message: err.message})

        // Send response
        res
            .status(resp.status)
            .json(body)
    }

    /**
     * Wraps a Promised-based handler function and returns an express handler
     *
     * @param handlerFn
     * @returns {function(...[*]=)}
     */
    handleAsync = handlerFn => {
        // Create function
        return async (req, res, next) => {
            try {
                await handlerFn(req, res, next)
            } catch (err) {
                this.sendErrorResponse(res, err)
            }
        }
    }

    /**
     * @typedef {Object} RESTHandlerResult
     * @property {*} data Result data
     * @property {string} code Message code
     * @property {string} message Message
     */

    /**
     * REST Handler function
     * @callback RESTHandlerFn
     * @param {*} req Express request
     * @returns {RESTHandlerResult}
     */

    /**
     * Wraps a REST Handler function, receive result and send response
     *
     * @param {RESTHandlerFn} handlerFn
     * @returns {function(...[*]=)} Express handler function
     */
    handleREST = handlerFn => {
        // Create function
        return (req, res) => {
            try {
                const result = handlerFn(req)
                this.sendResponse(res, result)
            } catch (err) {
                this.sendErrorResponse(res, err)
            }
        }
    }

    /**
     * Async REST Handler function
     * @async
     * @callback RESTHandlerAsyncFn
     * @param {*} req Express request
     * @returns {RESTHandlerResult}
     */

    /**
     * Wraps a Async REST Handler function, receive result and send response
     *
     * @param {RESTHandlerAsyncFn} handlerFn
     * @returns {function(...[*]=)} Express handler function
     */
    handleRESTAsync = handlerFn => {
        // Create function
        return async (req, res) => {
            try {
                const result = await handlerFn(req)
                this.sendResponse(res, result)
            } catch (err) {
                this.sendErrorResponse(res, err)
            }
        }
    }

    /**
     * Start listening to request
     */
    start() {
        const port = this.config.server.port
        this.router.listen(port, () => {
            this.logger.info(`${AppManifest.AppName} v${AppManifest.AppVersion} Server started. Listening on port: ${port}`, {scope: 'Server'})
        })
    }
}

module.exports = Server