'use strict'

const TABLE_NAME = 'UserMovieComment'

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
            userId: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'AppUser', key: 'id'
                }
            },
            comment: {
                type: Sequelize.TEXT,
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
                return queryInterface.addIndex(TABLE_NAME, ['movieId', {
                    attribute: 'version', order: 'DESC'
                }])
            })
            .then(() => {
                return queryInterface.addIndex(TABLE_NAME, ['movieId'])
            })
            .then(() => {
                return queryInterface.addIndex(TABLE_NAME, ['movieId', 'userId'])
            })

    },
    down: (queryInterface) => {
        return queryInterface.dropTable(TABLE_NAME);
    }
};