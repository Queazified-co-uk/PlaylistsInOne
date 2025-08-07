import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const CLIENT_ID = "2cf9bbde938149269d0da9bb6438ab40";
const REDIRECT_URI = "https://playlistsinone.queazified.co.uk/callback";
const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";

export default function App() {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("token");

    if (!token && hash) {
      token = hash
        .substring(1)
        .split("&")
        .find(elem => elem.startsWith("access_token"))
        .split("=")[1];

      window.location.hash = "";
      window.localStorage.setItem("token", token);
    }

    setToken(token);
  }, []);

  const handleLogout = () => {
    setToken(null);
    window.localStorage.removeItem("token");
  };

  const mergePlaylists = async () => {
    setStatus("Fetching playlists...");

    const playlistsRes = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const playlists = (await playlistsRes.json()).items;

    let trackURIs = [];
    for (const playlist of playlists) {
      const tracksRes = await fetch(playlist.tracks.href, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tracks = (await tracksRes.json()).items;
      trackURIs.push(...tracks.map(item => item.track.uri));
    }

    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await userRes.json();

    const createPlaylistRes = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Playlists → One",
        description: "Merged by playlistsinone.queazified.co.uk",
        public: false,
      }),
    });
    const createdPlaylist = await createPlaylistRes.json();

    setStatus(`Created playlist: ${createdPlaylist.name}, adding tracks...`);

    for (let i = 0; i < trackURIs.length; i += 100) {
      const batch = trackURIs.slice(i, i + 100);
      await fetch(`https://api.spotify.com/v1/playlists/${createdPlaylist.id}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: batch }),
      });
    }

    setStatus("All tracks added to the new playlist!");
  };

  return (
    <div className="flex flex-col items-center justify-center p-10 gap-4">
      <h1 className="text-3xl font-bold">Playlists → One</h1>
      {!token ? (
        <a
          href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`}
        >
          <Button>Login with Spotify</Button>
        </a>
      ) : (
        <>
          <Button onClick={mergePlaylists}>Merge My Playlists</Button>
          <Button onClick={handleLogout} variant="secondary">Logout</Button>
        </>
      )}
      {status && <p className="text-green-600 font-medium">{status}</p>}
    </div>
  );
}
