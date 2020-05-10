'use strict'

/**
 * @typedef {Object} Configuration
 * @property {ServerConfiguration} server
 * @property {ClientConfiguration} client
 * @property {Object.<string, DataSourceConfiguration>} dataSources
 * @property {ComponentConfiguration} components
 */

/**
 * @typedef {Object} ServerConfiguration Server configuration block
 * @property {number} port Listen Port
 * @property {string} basePath Base Path
 * @property {string} pwd Working Directory
 * @property {string} debug Show detailed error for internal error
 */

/**
 * @typedef {Object} ClientConfiguration Client configuration block
 * @property {string} appSecret App Secret
 * @property {string} jwtSecret JWT Secret to sign
 * @property {string} jwtLifetime JWT Lifetime
 * @property {string} sessionIdSecret Secret that is used to sign session identifier
 */

/**
 * @typedef {Object} DataSourceConfiguration Data Source configuration block
 * @property {string} lib
 * @property {string} dialect
 * @property {string} storage
 */

/**
 * @typedef {Object} ComponentConfiguration Components configuration block
 * @property {HumanIDConfiguration} humanID
 */

/**
 * @typedef {Object} HumanIDConfiguration humanID Core Host-to-host API configuration
 * @property {string} baseUrl
 * @property {string} appId
 * @property {string} appSecret
 */

const
    fs = require('fs'),
    path = require('path'),
    logger = require('./logger'),
    _ = require('lodash')

// Init module
const config = {}

/**
 * Load configuration
 *
 * @param configFile
 * @returns {Configuration} Loaded configuration
 */
config.load = (configFile) => {
    // Determine working dir value
    let pwd
    if (process.env.SERVER_PWD) {
        pwd = process.env.SERVER_PWD
    } else {
        pwd = process.cwd()
    }

    // Resolve config path
    const configPath = path.join(pwd, configFile)

    // If file not exist, throw error
    let config
    if (!fs.existsSync(configPath)) {
        logger.warn(`config file not found. Path=${configPath}`, {
            scope: 'Server.Configuration'
        })
        config = {}
    } else {
        // Read file sync
        const content = fs.readFileSync(configFile, 'utf8')

        // Parse json
        config = JSON.parse(content.toString())
    }

    // Load config
    const config = require(configPath)

    // Set pwd to config
    config.server.pwd = pwd

    return config
}

module.exports = config