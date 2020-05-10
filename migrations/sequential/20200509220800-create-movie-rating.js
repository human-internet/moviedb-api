'use strict'

const TABLE_NAME = 'MovieRating'

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable(TABLE_NAME, {
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
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false
            }
        })
            .then(() => {
                return queryInterface.addIndex(TABLE_NAME, ['movieId'])
            })
    },
    down: (queryInterface) => {
        return queryInterface.dropTable(TABLE_NAME);
    }
};