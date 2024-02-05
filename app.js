const express = require("express");
const { client_id, secret, scope, P1, P2 } = require("./.env.json");

const app = express();
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

const decorator = (req) => {
  if (process.env.NODE_ENV && process.env.NODE_ENV == "dev") {
    console.log(
      req.route.path,
      req.query,
      app.get("token") ? "auth" : "no auth"
    );
    if (app.get("tracks"))
      require("fs").writeFileSync(
        "./albums.json",
        JSON.stringify(app.get("tracks"), null, 2)
      );
  }
};

const generateRandomString = () =>
  (new Date().getTime() * Math.random())
    .toString()
    .replace(".", "1")
    .slice(0, 16);

app.get("/albums", (req, res) => {
  decorator(req);

  if (!app.get("tracks")) return res.redirect("/");
  res.render("albums.ejs", {
    tracks: app.get("tracks"),
    albums: app.get("albums")
  });
});

const get_tracks = async (playlist_id, offset) => {
  const access_token = app.get("token");
  const playlist = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?offset=${
      offset || 0
    }`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  ).then((r) => r.json());

  const tracks = playlist.items.map((i) => ({
    added_at: i.added_at,
    added_by: i.added_by.id,
    name: i.track.name,
    id: i.track.id,
    artists: i.track.artists.map((a) => a.name),
    image: i.track.album.images[0].url
  }));

  if (playlist.next)
    return tracks.concat(...(await get_tracks(playlist_id, offset + 100)));
  return tracks;
};

app.get("/", async (req, res) => {
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

  let p1 = await get_tracks(P1, 0);
  let p2 = await get_tracks(P2, 0);

  let tracks = p1
    .concat(p2)
    .sort((a, b) => a.added_at.localeCompare(b.added_at));

  app.set("tracks", tracks);
  return res.redirect("albums");
});

// callback endpoint from spotify auth
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
