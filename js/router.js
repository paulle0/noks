// js/router.js — Switch between views and trigger render functions
import { state } from "./state.js";
import { renderLogin } from "./views/login.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderNlogin, leaveNlogin } from "./views/nlogin.js";
import { renderKeyDetail } from "./views/keydetail.js";
import { renderSettings } from "./views/settings.js";

const renderers = {
  login: renderLogin,
  dashboard: renderDashboard,
  nlogin: renderNlogin,
  key: renderKeyDetail,
  settings: renderSettings,
};

let currentView = null;

export async function applyView() {
  const v = state.view;
  const allViews = document.querySelectorAll(".view");
  allViews.forEach((el) => { el.hidden = el.dataset.view !== v; });
  const fn = renderers[v];
  if (fn) await fn();
  // Toggle topnav visibility based on auth
  const topnav = document.getElementById("topnav");
  const logoutBtn = document.getElementById("logoutBtn");
  const authed = !!state.masterkey;
  topnav.hidden = !authed || v === "login";
  logoutBtn.hidden = !authed;
  // active link styling
  topnav.querySelectorAll(".nav-link").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === v || (v === "key" && b.dataset.view === "dashboard"));
  });
  // Stop scanner if leaving nlogin
  if (currentView === "nlogin" && v !== "nlogin") await leaveNlogin();
  currentView = v;
}

export function wireTopNav() {
  document.getElementById("topnav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-link");
    if (!btn) return;
    import("./state.js").then((m) => m.setState({ view: btn.dataset.view, _newSubkey: false }));
  });
}
