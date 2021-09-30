"use strict";

const Sequelize = require("sequelize");

const TABLE_NAME = "UserMovieRating";

module.exports = (sequelize) => {
    const Model = sequelize.define(
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
            userId: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            rating: {
                type: Sequelize.INTEGER,
                allowNull: false,
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

    Model.associate = (models) => {
        Model.belongsTo(models.AppUser, {
            foreignKey: "userId",
            as: "user",
        });
    };

    return Model;
};
