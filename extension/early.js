// Apply the visual mode before Angular renders the page.
document.documentElement.classList.add("mzo-dark", "mzo-light", "mzo-booting");
chrome.storage.local.get({ settings: { dark: false } }).then(({ settings }) => {
  document.documentElement.classList.toggle("mzo-light", settings?.dark !== true);
  document.documentElement.classList.remove("mzo-booting");
});
setTimeout(() => document.documentElement.classList.remove("mzo-booting"), 1800);
