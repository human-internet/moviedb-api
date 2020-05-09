# moviedb-api

API for showcasing 3rd-Party App integration to humanID

## Development Set-up

1. Install dependencies
    ```bash
    npm install
    ```

1. Configure database migration by creating `migrations/config.json`
    > TODO: Add configuration guide
    ```bash
    # Copy example
    copy migrations/config-example.json migrations/config.json
   
    # Edit file
    vim migrations/config.json
    ```

1. Run database migration

    ```bash
    npm run db:reset
    ```

1. Configure server by creating `config.json`
    > TODO: Add configuration guide
    ```bash
    # Copy example
    copy config-example.json config.json
   
    # Edit file
    vim config.json
    ```
   
1. Generate API Documentation

    ```bash
    npm run doc
    ```
   
1. Run server

    ```bash
    npm start
    ```

## Response Codes

| Code  | Message                         | Type  |
| ----- | ------------------------------- | ----- |
| ERR_1 | user access token is expired    | Error |
| ERR_2 | user access token is invalid    | Error | 
| ERR_3 | failed to verify exchange token | Error |

## Contributors

- Saggaf Arsyad <saggaf@nbs.co.id>

## License

Copyright 2019-2020 Bluenumber Foundation Licensed under the GNU General Public License v3.0