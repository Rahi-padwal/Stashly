const API_BASE_URL = "http://localhost:3000";

const state = {
  token: null,
  userId: null,
  userEmail: null,
  isLoginMode: true,
  showingAll: false,
  deletingId: null,
};

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const authTitle = document.getElementById("authTitle");
const authForm = document.getElementById("authForm");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const toggleAuthBtn = document.getElementById("toggleAuthBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const saveInput = document.getElementById("saveInput");
const saveBtn = document.getElementById("saveBtn");
const saveTabBtn = document.getElementById("saveTabBtn");
const saveStatus = document.getElementById("saveStatus");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const viewAllBtn = document.getElementById("viewAllBtn");
const backBtn = document.getElementById("backBtn");
const searchStatus = document.getElementById("searchStatus");
const results = document.getElementById("results");

const toast = document.getElementById("toast");

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));
    return { sub: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 1600);
}

function setSaveStatus(message) {
  saveStatus.textContent = message || "";
}

function setSearchStatus(message) {
  searchStatus.textContent = message || "";
}

function setLoading(button, isLoading, idleText, loadingText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

function launchWebAuthFlow(url) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Google sign-in failed."));
        return;
      }
      if (!redirectUrl) {
        reject(new Error("Google sign-in did not return a redirect URL."));
        return;
      }
      resolve(redirectUrl);
    });
  });
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function setStorage(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
  });
}

function clearStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
  });
}

function renderAuthMode() {
  authTitle.textContent = state.isLoginMode ? "Sign in" : "Sign up";
  authSubmitBtn.textContent = state.isLoginMode ? "Sign In" : "Sign Up";
  toggleAuthBtn.textContent = state.isLoginMode
    ? "No account? Sign up"
    : "Already have an account? Sign in";
}

function renderScreen() {
  const isAuthed = Boolean(state.token);
  authSection.classList.toggle("hidden", isAuthed);
  appSection.classList.toggle("hidden", !isAuthed);
  logoutBtn.classList.toggle("hidden", !isAuthed);

  viewAllBtn.classList.toggle("hidden", state.showingAll);
  backBtn.classList.toggle("hidden", !state.showingAll);
  renderAuthMode();
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

function makeResultItem(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "result-item";

  const top = document.createElement("div");
  top.className = "result-top";

  const textWrap = document.createElement("div");

  const title = document.createElement("p");
  title.className = "result-title";
  title.textContent = item.title || item.originalUrl;

  const link = document.createElement("a");
  link.className = "result-link";
  link.href = item.originalUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = item.originalUrl;

  textWrap.appendChild(title);
  textWrap.appendChild(link);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.title = "delete";
  deleteBtn.setAttribute("aria-label", "delete");
  deleteBtn.textContent = "-";
  deleteBtn.disabled = state.deletingId === item.id;
  deleteBtn.addEventListener("click", async () => {
    await deleteLink(item.id);
  });

  top.appendChild(textWrap);
  top.appendChild(deleteBtn);
  wrapper.appendChild(top);

  const meta = document.createElement("p");
  meta.className = "result-meta";
  if (state.showingAll && item.createdAt) {
    meta.textContent = `Saved: ${formatDate(item.createdAt)}`;
  } else if (!state.showingAll && typeof item.score === "number") {
    meta.textContent = `Similarity score: ${item.score.toFixed(4)}`;
  }

  if (meta.textContent) {
    wrapper.appendChild(meta);
  }

  return wrapper;
}

function renderResults(items) {
  results.innerHTML = "";
  for (const item of items) {
    results.appendChild(makeResultItem(item));
  }
}

async function api(path, method = "GET", body = undefined) {
  const headers = {};
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

let currentResults = [];

async function saveLink(url) {
  const input = (url || saveInput.value || "").trim();
  if (!input) {
    setSaveStatus("Please paste a link first.");
    return;
  }

  setLoading(saveBtn, true, "Save", "Saving...");
  setSaveStatus("");

  try {
    const saved = await api("/links", "POST", { originalUrl: input });
    setSaveStatus("Link saved. Embedding is being generated.");
    saveInput.value = "";

    if (state.showingAll && saved && saved.id) {
      const exists = currentResults.some((item) => item.id === saved.id);
      if (!exists) {
        currentResults = [saved, ...currentResults];
        renderResults(currentResults);
      }
    }
  } catch (error) {
    setSaveStatus(error instanceof Error ? error.message : "Failed to save link.");
  } finally {
    setLoading(saveBtn, false, "Save", "Saving...");
  }
}

async function saveCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url) {
      setSaveStatus("No active tab URL found.");
      return;
    }
    await saveLink(activeTab.url);
  } catch {
    setSaveStatus("Failed to read current tab.");
  }
}

async function runSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    setSearchStatus("Enter a search query.");
    return;
  }

  setLoading(searchBtn, true, "Search", "Searching...");
  setSearchStatus("");
  state.showingAll = false;
  renderScreen();

  try {
    const data = await api(`/links/search?q=${encodeURIComponent(q)}`);
    currentResults = Array.isArray(data) ? data : [];
    renderResults(currentResults);
    if (currentResults.length === 0) {
      setSearchStatus("No results found.");
    }
  } catch (error) {
    setSearchStatus(error instanceof Error ? error.message : "Search failed.");
  } finally {
    setLoading(searchBtn, false, "Search", "Searching...");
  }
}

async function viewAll() {
  state.showingAll = true;
  renderScreen();
  setSearchStatus("");

  try {
    const data = await api("/links");
    currentResults = Array.isArray(data) ? data : [];
    renderResults(currentResults);
    if (currentResults.length === 0) {
      setSearchStatus("No links saved yet.");
    }
  } catch (error) {
    setSearchStatus(error instanceof Error ? error.message : "Failed to fetch links.");
  }
}

function backToMain() {
  state.showingAll = false;
  currentResults = [];
  renderResults(currentResults);
  setSearchStatus("");
  renderScreen();
}

async function deleteLink(id) {
  state.deletingId = id;
  renderResults(currentResults);

  try {
    await api(`/links/${id}`, "DELETE");
    currentResults = currentResults.filter((item) => item.id !== id);
    renderResults(currentResults);
    showToast("deleted");

    if (currentResults.length === 0) {
      setSearchStatus(state.showingAll ? "No links saved yet." : "No results found.");
    }
  } catch (error) {
    setSearchStatus(error instanceof Error ? error.message : "Failed to delete link.");
  } finally {
    state.deletingId = null;
    renderResults(currentResults);
  }
}

async function loginOrRegister(event) {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    return;
  }

  setLoading(authSubmitBtn, true, state.isLoginMode ? "Sign In" : "Sign Up", "Please wait...");

  try {
    const endpoint = state.isLoginMode ? "/auth/login" : "/auth/register";
    const data = await api(endpoint, "POST", { email, password });
    const decoded = decodeJwt(data.accessToken || "");

    if (!decoded) {
      throw new Error("Invalid token received");
    }

    state.token = data.accessToken;
    state.userId = decoded.sub;
    state.userEmail = decoded.email;

    await setStorage({
      accessToken: state.token,
      userId: state.userId,
      userEmail: state.userEmail,
    });

    renderScreen();
    setSaveStatus("");
    setSearchStatus("");
  } catch (error) {
    setSearchStatus(error instanceof Error ? error.message : "Authentication failed.");
  } finally {
    setLoading(authSubmitBtn, false, state.isLoginMode ? "Sign In" : "Sign Up", "Please wait...");
  }
}

async function logout() {
  state.token = null;
  state.userId = null;
  state.userEmail = null;
  state.showingAll = false;
  state.deletingId = null;
  currentResults = [];
  renderResults(currentResults);
  await clearStorage(["accessToken", "userId", "userEmail"]);
  renderScreen();
}

async function continueWithGoogle() {
  setLoading(googleAuthBtn, true, "Continue with Google", "Opening Google...");

  try {
    const extensionRedirectUri = chrome.identity.getRedirectURL("auth");
    const authUrl = `${API_BASE_URL}/auth/google?redirectUri=${encodeURIComponent(extensionRedirectUri)}`;
    const redirectUrl = await launchWebAuthFlow(authUrl);
    const parsed = new URL(redirectUrl);
    const token = parsed.searchParams.get("token") || "";
    const decoded = decodeJwt(token);

    if (!decoded) {
      throw new Error("Google login did not return a valid token.");
    }

    state.token = token;
    state.userId = decoded.sub;
    state.userEmail = decoded.email;

    await setStorage({
      accessToken: state.token,
      userId: state.userId,
      userEmail: state.userEmail,
    });

    renderScreen();
    setSaveStatus("");
    setSearchStatus("");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Google sign-in failed.");
  } finally {
    setLoading(googleAuthBtn, false, "Continue with Google", "Opening Google...");
  }
}

function bindEvents() {
  authForm.addEventListener("submit", loginOrRegister);
  googleAuthBtn.addEventListener("click", continueWithGoogle);
  toggleAuthBtn.addEventListener("click", () => {
    state.isLoginMode = !state.isLoginMode;
    renderAuthMode();
  });

  logoutBtn.addEventListener("click", logout);
  saveBtn.addEventListener("click", () => {
    saveLink();
  });
  saveTabBtn.addEventListener("click", () => {
    saveCurrentTab();
  });

  searchBtn.addEventListener("click", () => {
    runSearch();
  });

  viewAllBtn.addEventListener("click", () => {
    viewAll();
  });

  backBtn.addEventListener("click", () => {
    backToMain();
  });
}

async function init() {
  bindEvents();
  renderScreen();

  const saved = await getStorage(["accessToken", "userId", "userEmail"]);
  if (saved && saved.accessToken) {
    state.token = saved.accessToken;
    state.userId = saved.userId || null;
    state.userEmail = saved.userEmail || null;
    renderScreen();
  }
}

init();
