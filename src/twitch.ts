import type { Settings } from "./types";

export const authURL = (settings: Settings) => {
  const { clientId } = settings;
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=http://localhost&scope=clips%3Aedit&response_type=token`;
  return url;
};

export const clip = async (
  broadcastID: string | number,
  settings: Settings
) => {
  const { clientId, bearerToken } = settings;
  const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcastID}`;
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${bearerToken}`,
  };
  return fetch(url, { headers }).then((res) => res.json());
};

export const get_broadcast_id = async (settings: Settings) => {
  const { clientId, bearerToken, channelName } = settings;
  const url = `https://api.twitch.tv/helix/users?login=${channelName}`;
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${bearerToken}`,
  };
  const res = await fetch(url, { headers });
  const res_data = await res.json();
  return res_data.data[0].id;
};
