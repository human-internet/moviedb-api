'use strict'

const Sequelize = require('sequelize')

module.exports = sequelize => {
    return sequelize.define('AppUser', {
        id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        extId: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        userHash: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        fullName: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        lastLogIn: {
            type: Sequelize.DATE,
            allowNull: true
        }
    }, {
        timestamps: true,
        tableName: 'AppUser'
    })
}