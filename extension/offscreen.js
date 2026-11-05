const files = {
  padrao: "assets/fears-to-fathom-notification.mp3",
  click: "assets/snapchat-message.mp3",
  continuo: "assets/hangouts-incoming-call.mp3"
};
const playing = new Map();

function stop(id) {
  const audio = playing.get(id);
  if (!audio) return;
  audio.pause();
  playing.delete(id);
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === "mzo-stop-tone-offscreen") {
    stop(message.id);
    return;
  }
  if (message?.type !== "mzo-play-tone" || message.tone === "nenhum") return;

  const { id, tone, repeat } = message;
  const option = tone === "sirene" || tone === "urgente" ? "continuo" : tone;
  stop(id);
  const audio = new Audio(chrome.runtime.getURL(Object.hasOwn(files, option) ? files[option] : files.padrao));
  audio.loop = option === "continuo" && !!repeat;
  playing.set(id, audio);
  const clear = () => {
    if (playing.get(id) === audio) stop(id);
  };
  audio.addEventListener("ended", clear, { once:true });
  audio.addEventListener("error", clear, { once:true });
  audio.play().catch(clear);
});
