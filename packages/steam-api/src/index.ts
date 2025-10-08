class SteamApi {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.steampowered.com";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getItemImage(classId: string, instanceId = "0"): Promise<string | null> {
    try {
      // Steam Community API endpoint for item images
      const url = `https://steamcommunity.com/economy/image/class/730/${classId}/${instanceId}`;

      // Check if the image exists by making a HEAD request
      const response = await fetch(url, { method: "HEAD" });

      if (response.ok) {
        return url;
      }

      // Fallback: try to get item info from Steam API
      const apiUrl = `${this.baseUrl}/ISteamEconomy/GetAssetClassInfo/v0001/`;
      const params = new URLSearchParams({
        key: this.apiKey,
        appid: "730", // CS:GO app ID
        class_count: "1",
        classid0: classId,
        instanceid0: instanceId,
      });

      const apiResponse = await fetch(`${apiUrl}?${params}`);

      if (!apiResponse.ok) {
        return null;
      }

      const data = await apiResponse.json();
      // @ts-ignore
      const classInfo = data.result?.[classId];

      if (classInfo?.icon_url) {
        return `https://steamcommunity-a.akamaihd.net/economy/image/${classInfo.icon_url}`;
      }

      return null;
    } catch (error) {
      console.error("Error fetching Steam item image:", error);
      return null;
    }
  }
}

export { SteamApi };

export const createSteamApi = (apiKey: string) => {
  return new SteamApi(apiKey);
};
