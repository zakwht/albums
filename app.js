const express = require("express"); 
const { client_id, secret, scope } = require("./.env.json")

const app = express();
app.set('view engine', 'ejs');

const decorator = req => {
  console.log(req.route.path, req.query, app.get("token") ? "auth" : "no auth")
}

const generateRandomString = () => 
  ((new Date().getTime() * Math.random()).toString().replace(".","1") + "111111").slice(0,16)

app.get("/albums", (req, res) => {
  decorator(req);

  if (!app.get("albums")) return res.redirect("/")
  res.render('index.ejs', { 'albums' : app.get("albums") });
})

app.get("/get-playlists", async (req, res) => {
  decorator(req)

  const access_token = app.get("token")
  const { offset, match } = { match: "albums", ...req.query}
  if (!access_token) return res.redirect("/")

  const playlists = await fetch(`https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset || 0}`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    }
  }).then(r => r.json())

  const playlist = playlists.items.filter(pl => pl.name==match)

  if (!playlist.length) {
    if (playlists.offset + 50 > playlists.total) return res.send("no such playlist :(")
    return res.redirect(`get-playlists?offset=${playlists.offset + 50}&match=${match}`)
  }

  res.redirect(`/get-albums?playlist_id=${playlist[0].id}`)
})


app.get("/get-albums", async (req, res) => {
  decorator(req)

  const access_token = app.get("token")
  const { playlist_id, redirect } = req.query
  console.log("/get-albums", playlist_id)

  if (!access_token) return res.redirect("/")
  if (!playlist_id || playlist_id == "undefined") return res.redirect(`/get-playlists?access_token=${access_token}`)

  // 0xXDN84O3ZlSjzliGkBvG0
  const playlist = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }).then(r => r.json())

  const albums = playlist.tracks.items.map(({ track: { album } }) => 
    ({
      name: album.name,
      image: album.images[0].url,
      artist: album.artists[0].name,
      id: album.id,
      release_date: album.release_date
    }))

  app.set('albums', albums)
  if (!redirect) return res.redirect("/albums")
  res.json(albums)
})

app.get("/", (req, res) => {
  decorator(req)

  if (app.get("albums")) return res.redirect("/albums")
  const access_token = app.get("token")
  // const { access_token, ...rest } = req.query
  if (access_token) return res.redirect(`/get-playlists?access_token=${access_token}`)
  if (Object.keys(req.query).length) return res.send(req.query)

  res.redirect("https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      response_type: "code",
      client_id,
      scope,
      redirect_uri: "http://localhost:3000/callback",
      state: generateRandomString(16)
    }).toString())
});

app.get("/callback", (req, res) => {
  decorator(req)

  const { code, state } = req.query
  if (!state) res.redirect("/?error=state_mismatch");

  fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${(Buffer.from(client_id + ":" + secret).toString("base64"))}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      redirect_uri: "http://localhost:3000/callback",
      grant_type: "authorization_code"
    })
  }).then(res => res.json())
    .then(body => {
      app.set("token", body.access_token)
      res.redirect(`/get-playlists`) // ?access_token=${body.access_token}`)
    })
  }
);

app.listen(3000);
