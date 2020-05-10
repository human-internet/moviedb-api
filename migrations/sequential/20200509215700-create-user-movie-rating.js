'use strict'

const TABLE_NAME = 'UserMovieRating'

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable(TABLE_NAME, {
            id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
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
            rating: {
                type: Sequelize.INTEGER,
                allowNull: false
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