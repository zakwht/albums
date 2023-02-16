# Spotify Album Covers

[![License](https://img.shields.io/github/license/zakwht/albums)](/LICENSE)
[![Style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

Express app that retrieves a Spotify playlist and compiles the album covers from each track it contains. 

Made with express, EJS, and the Spotify web API.

<img src="./albums.png" alt="screenshot" width="60%">

### Development

#### Requirements
* Node v18 (built with 18.13.0)
* A `.env.json` file at the project root

```json
{
  "client_id": "string",
  "secret": "string",
  "scope": "playlist-read-private"
}
```

`npm start` runs the app in development mode

### Acknowledgments
* __Leverages__ the user-authenticated [Spotify API](https://github.com/spotify/web-api-examples/tree/master/authentication)
