"use strict";

module.exports = {
    SERVER_PORT: {
        key: "server.port",
        dataType: "number",
    },
    SERVER_BASE_PATH: {
        key: "server.basePath",
    },
    SERVER_DEBUG: {
        key: "server.debug",
        dataType: "boolean",
    },
    CLIENT_APP_SECRET: {
        key: "client.appSecret",
    },
    CLIENT_JWT_SECRET: {
        key: "client.jwtSecret",
    },
    CLIENT_JWT_LIFETIME: {
        key: "client.jwtLifetime",
    },
    CLIENT_SESSION_ID_SECRET: {
        key: "client.sessionIdSecret",
    },
    DS_LIB: {
        key: "dataSources.movieDB.lib",
    },
    DS_DRIVER: {
        key: "dataSources.movieDB.dialect",
    },
    DS_HOST: {
        key: "dataSources.movieDB.host",
    },
    DS_PORT: {
        key: "dataSources.movieDB.port",
        dataType: "number",
    },
    DS_USERNAME: {
        key: "dataSources.movieDB.username",
    },
    DS_PASSWORD: {
        key: "dataSources.movieDB.password",
    },
    DS_DATABASE: {
        key: "dataSources.movieDB.database",
    },
    DS_STORAGE: {
        key: "dataSources.movieDB.storage",
    },
    RESPONSE_MAP_FILE: {
        key: "components.ResponseMapper.filePath",
    },
    HUMANID_BASE_URL: {
        key: "components.humanID.baseUrl",
    },
    HUMANID_CLIENT_ID: {
        key: "components.humanID.clientId",
    },
    HUMANID_CLIENT_SECRET: {
        key: "components.humanID.clientSecret",
    },
};
