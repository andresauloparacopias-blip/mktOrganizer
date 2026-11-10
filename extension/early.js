// Apply the visual mode before Angular renders the page.
document.documentElement.classList.add("mzo-dark", "mzo-light", "mzo-booting");
chrome.storage.local.get({ settings: { dark: false } }).then(({ settings }) => {
  document.documentElement.classList.toggle("mzo-light", settings?.dark !== true);
}).catch(error => console.warn("MKT ORGANIZER: não foi possível carregar o tema inicial", error));
// content.js removes this class after its first full layout pass. Keep a long
// failsafe so a broken extension startup cannot leave the site hidden forever.
setTimeout(() => document.documentElement.classList.remove("mzo-booting"), 10000);
