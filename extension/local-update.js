// Only watches files installed by the Windows updater; no remote code is fetched here.
(() => {
  const alarmName = 'mzo-local-version-check';
  let checking = false;
  const newer = (a, b) => {
    if (!/^\d+(?:\.\d+){0,3}$/.test(a || '') || !/^\d+(?:\.\d+){0,3}$/.test(b || '')) return false;
    const left = a.split('.').map(Number), right = b.split('.').map(Number);
    for (let i=0;i<4;i++) if ((left[i]||0)!==(right[i]||0)) return (left[i]||0)>(right[i]||0);
    return false;
  };
  async function check() {
    if (checking) return;
    checking = true;
    try {
      const response = await fetch(chrome.runtime.getURL('update-state.json')+'?check='+Date.now(), {cache:'no-store'});
      if (!response.ok) return;
      const state = await response.json();
      const loaded = chrome.runtime.getManifest().version;
      if (state.ready !== true || !newer(state.version,loaded)) return;
      // The state file is committed last. Re-read the manifest before reloading.
      const manifest = await fetch(chrome.runtime.getURL('manifest.json')+'?check='+Date.now(), {cache:'no-store'}).then(r=>r.ok?r.json():null);
      if (manifest?.version !== state.version) return;
      await chrome.storage.local.set({mzoInstalledUpdate:{version:state.version,at:Date.now()}});
      chrome.runtime.reload();
    } catch { /* No updater or a transaction in progress: retry on the next alarm. */ }
    finally { checking = false; }
  }
  async function start() { await chrome.alarms.create(alarmName,{periodInMinutes:1}); await check(); }
  chrome.runtime.onInstalled.addListener(start);
  chrome.runtime.onStartup.addListener(start);
  chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===alarmName)check();});
  start().catch(()=>{});
})();
