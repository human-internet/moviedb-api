'use strict'

const Sequelize = require('sequelize')

const TABLE_NAME = 'MovieRating'

module.exports = sequelize => {
    return sequelize.define(TABLE_NAME, {
        id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        movieId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        avgRating: {
            type: Sequelize.DECIMAL(3, 2),
            allowNull: false,
            defaultValue: 0
        },
        ratingCount: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 0
        },
        version: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 1
        },
    }, {
        timestamps: true,
        tableName: TABLE_NAME
    })
}