'use strict'

const TABLE_NAME = 'MovieComment'

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
            commentsCount: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0
            },
            uniqueUser: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0
            },
            version: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0
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