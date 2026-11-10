const PREFIX = "mzo-reminder-";
let openingOffscreen;
let alarmSyncQueue = Promise.resolve();

async function playTone(tone, id = "preview", repeat = false) {
  if (!tone || tone === "nenhum" || !chrome.offscreen?.createDocument) return;
  try {
    openingOffscreen ||= (async () => {
      const exists = chrome.offscreen.hasDocument
        ? await chrome.offscreen.hasDocument()
        : chrome.runtime.getContexts
          ? (await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] })).length > 0
          : false;
      if (!exists) await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Tocar o som escolhido para um lembrete do Mktzap."
      });
    })();
    await openingOffscreen;
    await chrome.runtime.sendMessage({ type: "mzo-play-tone", tone, id, repeat });
  } catch (error) {
    console.warn("MKT ORGANIZER: áudio indisponível", error);
  } finally { openingOffscreen = null; }
}
async function stopTone(id) {
  try { await chrome.runtime.sendMessage({ type:"mzo-stop-tone-offscreen", id }); } catch {}
}

async function syncAlarms() {
  const { reminders = [] } = await chrome.storage.local.get("reminders");
  const existing = await chrome.alarms.getAll();
  await Promise.all(existing.filter(a => a.name.startsWith(PREFIX)).map(a => chrome.alarms.clear(a.name)));
  for (const item of reminders) {
    const at = new Date(item.at).getTime();
    if (!item.done && !item.alertedAt && Number.isFinite(at)) {
      await chrome.alarms.create(PREFIX + item.id, { when: Math.max(at, Date.now() + 1000) });
    }
  }
}
function scheduleAlarmSync() {
  alarmSyncQueue = alarmSyncQueue.catch(() => {}).then(syncAlarms);
  return alarmSyncQueue;
}

chrome.runtime.onInstalled.addListener(() => { scheduleAlarmSync().catch(error => console.warn("MKT ORGANIZER: falha ao sincronizar lembretes", error)); });
chrome.runtime.onStartup.addListener(async () => {
  const { reminders = [] } = await chrome.storage.local.get("reminders");
  let changed = false;
  for (const item of reminders) {
    if (!item.done && new Date(item.at).getTime() <= Date.now() && item.alertedAt) {
      delete item.alertedAt;
      changed = true;
    }
  }
  if (changed) await chrome.storage.local.set({ reminders });
  await scheduleAlarmSync();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.reminders) scheduleAlarmSync().catch(error => console.warn("MKT ORGANIZER: falha ao sincronizar lembretes", error));
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm.name.startsWith(PREFIX)) return;
  const id = alarm.name.slice(PREFIX.length);
  const { reminders = [], contacts = {} } = await chrome.storage.local.get(["reminders", "contacts"]);
  const item = reminders.find(r => r.id === id && !r.done);
  if (!item) return;
  item.alertedAt = Date.now();
  await chrome.storage.local.set({ reminders });
  const contact = contacts[item.contactId];
  await chrome.notifications.create(id, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Lembrete do MKT ORGANIZER" + (contact?.name ? ` · ${contact.name}` : ""),
    message: item.text || "Você tem um lembrete pendente.",
    priority: 2,
    buttons: [{ title:"Concluir" }, { title:"Silenciar" }]
  });
  await playTone(item.tone || "padrao", id, true);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "mzo-preview-tone") playTone(message.tone);
  if (message?.type === "mzo-stop-tone") stopTone(message.id);
  if (message?.type === "mzo-download-files") {
    (async () => {
      let count = 0, failed = 0;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const files = (message.files || message.urls || []).slice(0, 5000);
      let next = 0;
      const downloadNext = async () => {
        while (next < files.length) {
          const file = files[next++];
          const url = typeof file === "string" ? file : file?.url;
          if (typeof url !== "string" || !/^(https?:\/\/|data:(?:image|video|audio|application)\/)/i.test(url)) { failed++; continue; }
          const extension = url.match(/\.([a-z0-9]{1,12})(?:[?#]|$)/i)?.[1]?.toLowerCase()
            || url.match(/^data:[^/]+\/([a-z0-9+.-]+)/i)?.[1]?.replace("jpeg", "jpg").replace("vnd.openxmlformats-officedocument.wordprocessingml.document", "docx") || "bin";
          let supplied = typeof file === "object" && typeof file?.name === "string" ? file.name.trim() : "";
          try { supplied = decodeURIComponent(supplied); } catch {}
          supplied = supplied.split(/[\\/]/).pop().replace(/[<>:"|?*\x00-\x1f]/g,"_").replace(/[. ]+$/g,"").slice(0,180);
          const filename = `Mktzap-arquivos/${stamp}/${supplied || `arquivo.${extension}`}`;
          let downloaded = false;
          try { downloaded = await new Promise(resolve => chrome.downloads.download({ url, filename, conflictAction:"uniquify" }, id => resolve(!chrome.runtime.lastError && !!id))); } catch {}
          if (downloaded) count++; else failed++;
        }
      };
      await Promise.all(Array.from({length:Math.min(4,files.length)}, downloadNext));
      sendResponse({ count, failed, total:files.length });
    })().catch(() => sendResponse({ count:0, failed:(message.files || message.urls || []).length, total:(message.files || message.urls || []).length }));
    return true;
  }
});

chrome.notifications.onClicked.addListener(async id => {
  await stopTone(id);
  const { reminders = [], contacts = {} } = await chrome.storage.local.get(["reminders", "contacts"]);
  const item = reminders.find(r => r.id === id);
  const target = item && contacts[item.contactId]?.url;
  await chrome.tabs.create({ url: target?.startsWith("https://app3.mktzap.com.br/") ? target : "https://app3.mktzap.com.br/chat" });
  await chrome.notifications.clear(id);
});
chrome.notifications.onButtonClicked.addListener(async (id, index) => {
  await stopTone(id);
  if (index === 0) {
    const { reminders = [] } = await chrome.storage.local.get("reminders");
    const item = reminders.find(r => r.id === id);
    if (item) { item.done = true; await chrome.storage.local.set({ reminders }); }
  }
  await chrome.notifications.clear(id);
});
chrome.notifications.onClosed.addListener((id, byUser) => { if (byUser) stopTone(id); });

// Read only MKTZap attachment storage, for previews whose server blocks page CORS.
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='mzo-read-office-file')return;
  (async()=>{
    const source=new URL(sender.url || sender.tab?.url || 'about:blank');
    const url=new URL(message.url);
    if(sender.id!==chrome.runtime.id || source.origin!=='https://app3.mktzap.com.br' || url.protocol!=='https:' || url.hostname!=='mktzap-media-storage-master.s3.amazonaws.com' || !url.pathname.startsWith('/channels_attachments/'))throw Error('Origem de arquivo não permitida');
    const response=await fetch(url.href,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Não foi possível carregar o arquivo');
    if(Number(response.headers.get('content-length'))>30*1024*1024)throw Error('Arquivo acima de 30 MB');
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length>30*1024*1024)throw Error('Arquivo acima de 30 MB');
    const chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
    sendResponse({base64:btoa(chunks.join(''))});
  })().catch(error=>sendResponse({error:error.message || 'Falha ao carregar a prévia'}));
  return true;
});

// Apply complete local updates without reinstalling or clearing browser storage.
importScripts("local-update.js");
