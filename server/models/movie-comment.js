"use strict";

const Sequelize = require("sequelize");

const TABLE_NAME = "MovieComment";

module.exports = (sequelize) => {
    return sequelize.define(
        TABLE_NAME,
        {
            id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
            },
            movieId: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            commentsCount: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            uniqueUser: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            version: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            timestamps: true,
            tableName: TABLE_NAME,
        }
    );
};
