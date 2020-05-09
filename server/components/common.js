'use strict'

const
    crypto = require('crypto'),
    jwt = require('jsonwebtoken')

// Init module
const common = {}

/**
 * Generate hmac hash
 *
 * @param data
 * @param secret
 * @returns {string}
 */
common.hmac = (data, secret) => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Create (sign) JWT
 *
 * @param user
 * @param secret
 * @returns {undefined|*}
 */
common.createJWT = (user, secret) => {
    return jwt.sign({id: user.id}, secret)
}

/**
 * Verify JWT
 *
 * @param token
 * @param secret
 * @returns {Promise<string>}
 */
common.verifyJWT = (token, secret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decodedToken) => {
            if (err || !decodedToken) {
                return reject(err)
            }
            resolve(decodedToken)
        })
    })
}

/**
 * Generate random string
 *
 * @param length
 * @param type
 * @returns {string}
 */
common.randStr = (length, type) => {
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    if (type === 1) {
        characters = '0123456789'
    } else if (type === 2) {
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    }
    let charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

/**
 * Combine country code and phone number
 *
 * @param countryCode
 * @param phone
 * @returns {*}
 */
common.combinePhone = (countryCode, phone) => {
    phone = phone[0] === '0' ? phone.substring(1) : phone
    return countryCode + phone
}

module.exports = common