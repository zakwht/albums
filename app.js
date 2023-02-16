const express = require("express");
const { client_id, secret, scope } = require("./.env.json");

const app = express();
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

const decorator = (req) => {
  if (process.env.NODE_ENV && process.env.NODE_ENV == "dev")
    console.log(
      req.route.path,
      req.query,
      app.get("token") ? "auth" : "no auth"
    );
};

const generateRandomString = () =>
  (new Date().getTime() * Math.random())
    .toString()
    .replace(".", "1")
    .slice(0, 16);

app.get("/albums", (req, res) => {
  decorator(req);

  if (!app.get("albums")) return res.redirect("/");
  res.render("albums.ejs", { albums: app.get("albums") });
});

app.get("/get-playlists", async (req, res) => {
  decorator(req);

  const access_token = app.get("token");
  const { offset, match, redirect } = {
    match: "albums",
    redirect: true,
    ...req.query
  };
  if (!access_token) return res.redirect("/");

  const playlists = await fetch(
    `https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset || 0}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  ).then((r) => r.json());

  const playlist = playlists.items.filter((pl) => pl.name == match);

  if (!playlist.length) {
    if (playlists.offset + 50 > playlists.total)
      return res.redirect("/?error=that playlist does not exist");
    return res.redirect(
      `get-playlists?offset=${
        playlists.offset + 50
      }&match=${match}&redirect=${redirect}`
    );
  }

  res.redirect(
    `/get-albums?playlist_id=${playlist[0].id}&redirect=${redirect}`
  );
});

app.get("/get-albums", async (req, res) => {
  decorator(req);

  const access_token = app.get("token");
  const { playlist_id, redirect } = req.query;

  if (!access_token) return res.redirect("/");
  if (!playlist_id || playlist_id == "undefined")
    return res.redirect(`/get-playlists?access_token=${access_token}`);

  const playlist = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist_id}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  ).then((r) => r.json());

  const albums = playlist.tracks.items.map(({ track: { album } }) => ({
    name: album.name,
    image: album.images[0].url,
    artist: album.artists[0].name,
    id: album.id,
    release_date: album.release_date
  }));

  app.set("albums", albums);
  if (!redirect || redirect == "true") return res.redirect("/albums");
  res.json(albums);
});

app.get("/", (req, res) => {
  decorator(req);

  const access_token = app.get("token");
  if (!access_token)
    return res.redirect(
      "https://accounts.spotify.com/authorize?" +
        new URLSearchParams({
          response_type: "code",
          client_id,
          scope,
          redirect_uri: "http://localhost:3000/callback",
          state: generateRandomString(16)
        }).toString()
    );

  const { match } = req.query;
  if (!match) return res.render("index.ejs", { error: req.query.error });
  return res.redirect(`/get-playlists?match=${match}`);
});

app.get("/callback", (req, res) => {
  decorator(req);

  const { code, state } = req.query;
  if (!state) res.redirect("/?error=state_mismatch");

  fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(client_id + ":" + secret).toString(
        "base64"
      )}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      redirect_uri: "http://localhost:3000/callback",
      grant_type: "authorization_code"
    })
  })
    .then((res) => res.json())
    .then((body) => {
      app.set("token", body.access_token);
      res.redirect(`/`);
    });
});

app.listen(3000);
