const API_BASE_URL = "https://stashly-backend-us.onrender.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-stashly",
    title: "Save to Stashly",
    contexts: ["link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "save-to-stashly") return;

  const { accessToken } = await chrome.storage.local.get(["accessToken"]);

  try {
    const response = await fetch(`${API_BASE_URL}/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ originalUrl: info.linkUrl }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Stashly",
      message: "Link saved to Stashly",
    });
  } catch {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.png",
      title: "Stashly",
      message: "Failed to save link",
    });
  }
});
