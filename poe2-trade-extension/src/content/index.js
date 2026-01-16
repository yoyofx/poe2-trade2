import { Sidebar } from "./ui/Sidebar.js";
import { injectStarButton } from "./ui/StarButton.js";
import "./content.css";

console.log("PoE 2 Trade Extension Loaded");

const sidebar = new Sidebar();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      checkForTradeResults();
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

function checkForTradeResults() {
  const results = document.querySelectorAll(
    ".row:not(.poe2-processed):not(.row-total):not(.controls)",
  );
  results.forEach((row) => {
    row.classList.add("poe2-processed");
    injectStarButton(row, sidebar);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "jumpToHideout" && request.request) {
    if (window.poe2SidebarInstance) {
      window.poe2SidebarInstance.funcjumpToHideout(request.request);
    }
  }
});
