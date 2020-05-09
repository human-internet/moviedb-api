'use strict'

class APIError extends Error {
    /**
     * Creates APIError
     *
     * @param code {string} Error code
     * @param opt {Object} Error option
     * @param opt.message {string|null} Error message
     * @param opt.source {Error|null} Error Cause
     */
    constructor(code, opt = {}) {
        // Deconstruct param
        const {message = null, source = null} = opt

        // Call super constructor
        super(message);

        // Set members
        this.name = 'APIError'
        this.code = code
        this.message = message
        this.source = source
    }
}

module.exports = APIError