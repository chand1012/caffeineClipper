import type { Settings } from "./settings";

export type Clip = {
  id: string;
  edit_url: string;
  channelName: string;
};

export const authURL = (settings: Settings) => {
  const { clientId } = settings;
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=https://chand1012.github.io/caffeineClipper/&scope=clips%3Aedit&response_type=token`;
  return url;
};

export const createClip = async (
  broadcastID: string | number,
  settings: Settings
) => {
  const { clientId, bearerToken } = settings;
  const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcastID}`;
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${bearerToken}`,
  };
  return fetch(url, { headers, method: "POST" }).then((res) => res.json());
};

export const getBroadcastID = async (settings: Settings) => {
  const { clientId, bearerToken, channelName } = settings;
  const url = `https://api.twitch.tv/helix/users?login=${channelName}`;
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${bearerToken}`,
  };
  const res = await fetch(url, { headers });
  const res_data = await res.json();
  return res_data?.data?.[0]?.id;
};

export const isUserLive = async (settings: Settings) => {
  const { clientId, bearerToken, channelName } = settings;
  const url = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${bearerToken}`,
  };
  const res = await fetch(url, { headers });
  const res_data = await res.json();
  return res_data?.data?.length > 0;
};

export const getCurrentUser = async (settings: Settings) => {
  const { clientId, bearerToken } = settings;
  const url = `https://api.twitch.tv/helix/users`;
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${bearerToken}`,
  };
  const res = await fetch(url, { headers });
  const res_data = await res.json();
  return res_data?.data?.[0];
};

export const getClipData = async (clipID: string, settings: Settings) => {
  const { clientId, bearerToken } = settings;
  const url = `https://api.twitch.tv/helix/clips?id=${clipID}`;
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${bearerToken}`,
  };
  const res = await fetch(url, { headers });
  const res_data = await res.json();
  return res_data?.data?.[0];
};
