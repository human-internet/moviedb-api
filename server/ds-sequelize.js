"use strict";

const Sequelize = require("sequelize");

class SequelizeDataSource {
    constructor(conf, opt = {}) {
        // Delete lib property
        delete conf.lib;

        // Set config
        this.config = conf;

        // If logger is set, set sequelize logging to logger
        if (opt.logger) {
            this.config.logging = (msg) => {
                opt.logger.debug(msg, { scope: "Sequelize" });
            };
        }
    }

    init() {
        // Init new connection
        this.conn = new Sequelize(this.config.database, this.config.username, this.config.password, this.config);
    }

    initModel(modelFilePath) {
        // Initiate model
        return this.conn.import(modelFilePath);
    }
}

module.exports = SequelizeDataSource;
