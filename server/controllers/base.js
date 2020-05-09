'use strict'

const
    APIError = require('../api-error'),
    Constants = require('../constants')

class BaseController {
    constructor({models, config, components, server}) {
        this.models = models
        this.config = config
        this.components = components
        this.handleAsync = server.handleAsync
        this.handleREST = server.handleREST
        this.handleRESTAsync = server.handleRESTAsync
        this.sendResponse = server.sendResponse
    }

    /**
     * Validate body against rules
     * @param {Object.<string, string>} rules
     * @param {*} body Request Body
     */
    validate(rules, body) {
        for (let field in rules) {
            // If field is a custom or inherited property, continue
            if (!rules.hasOwnProperty(field)) {
                continue
            }
            let fieldRules = rules[field].split('|')
            for (let i in fieldRules) {
                let val = body[field]
                let rule = fieldRules[i].toLowerCase()
                if (rule === 'required') {
                    if (!val || val.length <= 0) {
                        throw new APIError(Constants.RESPONSE_ERROR_BAD_REQUEST, {message: `${field} is required`})
                    }
                } else if (rule.startsWith('in:')) {
                    // ignore if empty
                    if (val && val.length > 0) {
                        let values = rule.split(':')[1].split(',')
                        if (values.indexOf(val.toLowerCase()) < 0) {
                            throw new APIError(Constants.RESPONSE_ERROR_BAD_REQUEST, {message: `${field} must be in: ${values}`})
                        }
                    }
                }
            }
        }
        return null
    }
}

module.exports = BaseController