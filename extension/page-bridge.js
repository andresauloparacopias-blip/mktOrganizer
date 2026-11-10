// Runs in the page's JavaScript world to read the currently open Angular chat.
// Only media URLs, contact photo URLs and message identifiers are returned.
(() => {
  const imageExtension = /\.(?:png|jpe?g|webp|gif|avif|bmp|tiff?|heic|heif|svg)(?:[?#]|$)/i;
  const audioExtension = /\.(?:mp3|m4a|aac|wav|ogg|opus|flac)(?:[?#]|$)/i;
  const videoExtension = /\.(?:mp4|m4v|mov|webm|mkv|avi|3gp)(?:[?#]|$)/i;
  const mediaExtension = /\.[a-z0-9]{1,12}(?:[?#]|$)/i;
  const possibleUrl = /^(?:https?:\/\/|blob:|data:(?:image|video|audio|application)\/|\/)/i;
  const imageType = value => /image|photo|picture|figura|foto/i.test(String(value || ""));
  const mediaType = value => /image|photo|picture|figura|foto|file|document|pdf|audio|voice|ptt|video|attachment|arquivo|documento/i.test(String(value || ""));
  const safeUrl = value => {
    if (typeof value !== "string" || value.length > 6000000) return "";
    const raw = value.trim();
    if (!possibleUrl.test(raw)) return "";
    try {
      const url = raw.startsWith("data:") || raw.startsWith("blob:") ? raw : new URL(raw, location.href).href;
      return /^(?:https?:\/\/|blob:|data:(?:image|video|audio|application)\/)/i.test(url) ? url : "";
    } catch { return ""; }
  };
  function scopeFor(element) {
    if (!window.angular?.element) return null;
    try { return window.angular.element(element).scope() || window.angular.element(element).isolateScope(); }
    catch { return null; }
  }
  function scopeOf(modal) {
    for (let node = modal; node; node = node.parentElement) {
      for (let scope = scopeFor(node), i = 0; scope && i < 30; i++, scope = scope.$parent) {
        if (scope.vm?.messages || typeof scope.vm?.conversationMessages === "function") return scope;
      }
    }
    return null;
  }
  function urlsFromMessage(message, force = false) {
    if (!message || typeof message !== "object") return [];
    const meta = [message.type, message.mime, message.mimetype, message.mimeType, message.contentType, message.media?.type, message.media?.mimetype].some(mediaType);
    const urls = new Set();
    const visited = new Set();
    function walk(value, key, depth) {
      if (depth > 4 || value == null) return;
      if (typeof value === "string") {
        const embeddedFile = value.match(/\bfile=(https?:\/\/[^\s\]]+)/i)?.[1];
        if (embeddedFile) { const found = safeUrl(embeddedFile); if (found) urls.add(found); }
        const url = safeUrl(value);
        if (url && (force || meta || mediaExtension.test(url) || /^data:(?:image|video|audio|application)\//i.test(url) || mediaType(key) || /^https?:\/\/|^blob:/i.test(url))) urls.add(url);
        return;
      }
      if (typeof value !== "object" || visited.has(value)) return;
      visited.add(value);
      if (Array.isArray(value)) { value.slice(0,20).forEach(item => walk(item,key,depth + 1)); return; }
      for (const [childKey, child] of Object.entries(value)) {
        if (/^(?:quoted|quoted_message|html|avatar|profile_?photo|profile_?picture|profile_?pic|contact|sender|user)$/i.test(childKey)) continue;
        walk(child, childKey, depth + 1);
      }
    }
    walk(message, "", 0);
    return [...urls];
  }
  const fileName = message => {
    const raw = [message?.filename,message?.file_name,message?.original_name,message?.originalName,message?.media?.filename,message?.media?.original_name,message?.media?.name,message?.file?.name,message?.file?.filename,message?.attachment?.name,message?.attachment?.filename,message?.document?.name,message?.document?.filename,message?.text?.match(/\bname=([^\]]+)/i)?.[1]].find(value => typeof value === "string" && value.trim()) || "";
    try { return decodeURIComponent(raw).trim(); } catch { return raw.trim(); }
  };
  const directionOf = (message, vm) => {
    try {
      const value = vm?.getClass?.(message) || message?.direction || message?.type_message || "";
      if (/^(?:left|in|incoming|inbound|received)$/i.test(value)) return "left";
      if (/^(?:right|out|outgoing|outbound|sent)$/i.test(value)) return "right";
    } catch {}
    const fromMe = message?.from_me ?? message?.fromMe ?? message?.key?.fromMe;
    if (fromMe !== undefined) return fromMe === true || fromMe === 1 || fromMe === "1" || fromMe === "true" ? "right" : "left";
    return "";
  };
  const kindOf = (message, url, image) => {
    if (image) return "images";
    const details = [message?.type,message?.mime,message?.mimetype,message?.mimeType,message?.contentType,message?.media?.type,message?.media?.mimetype,fileName(message)].join(" ");
    if (/audio|voice|ptt|recording/i.test(details) || audioExtension.test(url) || /^data:audio\//i.test(url)) return "audio";
    if (/video/i.test(details) || videoExtension.test(url) || /^data:video\//i.test(url)) return "videos";
    return "files";
  };
  function avatarFrom(contact) {
    if (!contact || typeof contact !== "object") return "";
    const visited = new Set();
    function find(value, key, depth) {
      if (depth > 4 || value == null) return "";
      if (typeof value === "string") return /avatar|photo|picture|profile.*(?:image|pic|url)|image.?url/i.test(key) ? safeUrl(value) : "";
      if (typeof value !== "object" || visited.has(value)) return "";
      visited.add(value);
      for (const [childKey, child] of Object.entries(value)) {
        if (typeof child === "object" && !/^(?:data|profile|contact|info|metadata)$/i.test(childKey)) continue;
        const found = find(child,key ? `${key}.${childKey}` : childKey,depth+1);
        if (found) return found;
      }
      return "";
    }
    return find(contact,"",0);
  }
  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== "mzo-image-request") return;
    const requestId = event.data.requestId;
    if (typeof requestId !== "string") return;
    try {
    const modal = event.data.modalId === "historico" ? document.getElementById("historico") : document.querySelector("#dlgChatModal.show, #dlgChatModal[style*='display: block']");
    const scope = modal && scopeOf(modal);
    const vm = scope?.vm;
    let messages = modal?.id === "historico" ? null : vm?.messages?.[vm.sector_id];
    if(modal?.id !== "historico" && typeof vm?.conversationMessages === "function") { try { messages=vm.conversationMessages(vm.sector_id); } catch {} }
    const files = Array.isArray(messages)
      ? messages.flatMap((message, index) => urlsFromMessage(message).map(url => {
        const image = imageExtension.test(url) || [message.type,message.mime,message.mimetype,message.media?.type,message.media?.mimetype].some(imageType) || url.startsWith("data:image/");
        return { incoming:directionOf(message,vm) === "left", index, url, name:fileName(message), id:String(message.id || message.wamid || message.message_id || ""), image, kind:kindOf(message,url,image) };
      }))
      : [];
    const messageIndex = new Map(files.filter(item=>item.id).map(item=>[item.id,item]));
    const bubbles = modal ? [...modal.querySelectorAll(".bubble:not(.mkz-input-area .bubble)")] : [];
    bubbles.forEach((bubble,index) => {
      let itemScope = scopeFor(bubble);
      let message;
      for (let i=0; itemScope && i<12; i++,itemScope=itemScope.$parent) {
        if (itemScope.message) { message=itemScope.message; break; }
      }
      message ||= Array.isArray(messages) && messages.length === bubbles.length ? messages[index] : null;
      const id = String(message?.id || message?.wamid || message?.message_id || bubble.getAttribute('select-id') || '');
      const known = messageIndex.get(id);
      for (const url of urlsFromMessage(message,/Visualizar a (?:imagem|vídeo|video)/i.test(bubble.textContent || ""))) {
        const image = imageExtension.test(url) || url.startsWith("data:image/") || [message?.type,message?.mime,message?.mimetype,message?.media?.type].some(imageType) || (/Visualizar a imagem/i.test(bubble.textContent || "") && !mediaExtension.test(url));
        files.push({incoming:bubble.classList.contains("left-bubble") || known?.incoming === true,index,url,name:fileName(message) || known?.name || "",id,image,kind:kindOf(message,url,image)});
      }
    });
    const images = files.filter(item => item.image);
    const cards = [...document.querySelectorAll(".attendance-card-container[data-test]")].map((card,index) => {
      const local = scopeFor(card);
      return { index, url:avatarFrom(local?.contact || local?.item || local?.ticket) };
    }).filter(item => item.url);
    const avatar = avatarFrom(vm?.selectedUser?.[vm.sector_id]);
    const uniqueFiles = [...new Map(files.map(item=>[item.url,item])).values()];
    const uniqueImages = uniqueFiles.filter(item=>item.image);
    window.postMessage({ source:"mzo-image-bridge", requestId, total:bubbles.length, images:uniqueImages.slice(0,5000), files:uniqueFiles.slice(0,5000), avatar, cards }, location.origin);
    } catch (error) {
      console.warn("MKT ORGANIZER: falha ao ler anexos da conversa", error);
      window.postMessage({ source:"mzo-image-bridge", requestId, total:0, images:[], files:[] }, location.origin);
    }
  });
})();

// Read the native Angular state; publish only the two service states to the card.
(() => {
  const automatedName = value => /(?:^|\W)(?:bot|chatbot|ia|ai|automação|automation|assistente virtual|inteligência artificial)(?:$|\W)/i.test(String(value || ''));
  const yes = value => value === true || value === 1 || value === '1' || value === 'true';
  function scopeAt(node) {
    try { return window.angular?.element(node).scope() || window.angular?.element(node).isolateScope(); }
    catch { return null; }
  }
  function automation(message, name = '') {
    const actor = message?.sender || message?.author || message?.operator || message?.user || {};
    return ['is_bot','isBot','from_bot','fromBot','is_from_bot','is_ai','isAI','automated','is_automated','isAutomated'].some(key => yes(message?.[key]) || yes(actor?.[key])) ||
      ['bot_id','chatbot_id','ai_agent_id'].some(key=>!!message?.[key] && message[key]!=='0') ||
      [message?.sender_type,message?.senderType,message?.author_type,message?.source,message?.sent_by,
        actor?.type,actor?.role,actor?.name,message?.operator_name,message?.sender_name,name].some(automatedName);
  }
  function messageState(message, vm, direction = '', name = '') {
    if (!message && !direction) return '';
    if (/^(?:pending|queued|sending|failed|error|deleted)$/i.test(message?.status || '')) return '';
    if (/^(?:system|event|notification|internal_note|note)$/i.test(message?.type || '')) return '';
    if (automation(message, name)) return 'reply';
    let side = direction;
    try { side ||= vm?.getClass?.(message); } catch {}
    side ||= message?.direction || '';
    if (/^(?:left|in|incoming|inbound|received)$/i.test(side)) return 'reply';
    if (/^(?:right|out|outgoing|outbound|sent)$/i.test(side)) return 'progress';
    const fromMe = message?.from_me ?? message?.fromMe ?? message?.key?.fromMe;
    if (fromMe !== undefined) return yes(fromMe) ? 'progress' : 'reply';
    if (/^(?:customer|client|contact)$/i.test(message?.sender_type || message?.sender?.type || '')) return 'reply';
    if (/^(?:operator|agent|human|user)$/i.test(message?.sender_type || message?.sender?.type || '')) return 'progress';
    return '';
  }
  function itemScope(node) {
    for (let scope=scopeAt(node),i=0;scope && i<12;i++,scope=scope.$parent) {
      if (scope.message) return scope.message;
    }
    return null;
  }
  function ticketMessage(card) {
    // The ng-repeat variable is read from the page rather than assuming its name.
    const repeat = card.getAttribute('ng-repeat') || card.getAttribute('data-ng-repeat') || '';
    const variable = repeat.match(/^\s*([\w$]+)\s+in\s/)?.[1];
    const candidates = [];
    for (const node of [card,card.querySelector('.card-status'),card.querySelector('.card-info')].filter(Boolean)) {
      let scope=scopeAt(node);
      for(let i=0;scope && i<3;i++,scope=scope.$parent) {
        for(const key of [variable,'contact','item','ticket','attendance'].filter(Boolean)) {
          const entity=scope[key];
          if(entity && typeof entity==='object') candidates.push(entity);
        }
      }
    }
    for(const entity of candidates) {
      const message = entity.last_message || entity.lastMessage || entity.latest_message || entity.latestMessage;
      const read=entity.answered === undefined ? null : yes(entity.answered);
      if(read===true) return {state:'progress',read,time:messageTime(message)};
      if(message && typeof message==='object') {
        const state=messageState(message);
        if(state) return {state,read,time:messageTime(message)};
      }
    }
    return null;
  }
  function messageTime(message) {
    const raw=message?.timestamp || message?.created_at || message?.createdAt || message?.sent_at || message?.date;
    if(typeof raw==='number') return raw<1e12 ? raw*1000 : raw;
    if(typeof raw==='string' && /^\d{10,13}$/.test(raw)) return messageTime({timestamp:Number(raw)});
    return Date.parse(raw) || 0;
  }
  function refreshServiceStates() {
    const modal=document.querySelector('#dlgChatModal.show, #dlgChatModal[style*="display: block"]');
    let currentState='', currentTime=0, currentRead=null;
    if(modal) {
      let vm;
      for(let scope=scopeAt(modal),i=0;scope && i<30;i++,scope=scope.$parent) {
        if(scope.vm?.messages || typeof scope.vm?.conversationMessages === "function") {vm=scope.vm;break;}
      }
      const selected=vm?.selectedUser?.[vm.sector_id];
      currentRead=selected?.answered === undefined ? null : yes(selected.answered);
      let messages=vm?.messages?.[vm.sector_id];
      if(typeof vm?.conversationMessages === 'function') {try {messages=vm.conversationMessages(vm.sector_id);} catch {}}
      const bubbles=[...modal.querySelectorAll('.bubble-container .bubble')];
      // Read confirmed messages in the same order displayed by the native chat.
      for(let i=bubbles.length-1;i>=0 && !currentState;i--) {
        const bubble=bubbles[i];
        const message=itemScope(bubble) || (Array.isArray(messages) && messages.length===bubbles.length ? messages[i] : null);
        const direction=bubble.matches('.left-bubble') ? 'left' : bubble.matches('.right-bubble') ? 'right' : '';
        const name=[...bubble.querySelectorAll('.name')].find(el=>!el.closest('.message-wrap,.mzo-quoted-block,blockquote'))?.textContent || '';
        // An outgoing bubble alone cannot distinguish automation from an operator.
        if(message || direction==='left' || name.trim()) {
          currentState=messageState(message,vm,direction,name);
          if(currentState) currentTime=messageTime(message);
        }
      }
    }
    const phone=modal?.dataset.mzoCurrentPhone;
    for(const card of document.querySelectorAll('.attendance-card-container[data-test]')) {
      const matches=phone && card.dataset.mzoPhone?.endsWith(phone.slice(-10));
      const ticket=ticketMessage(card);
      const preferCurrent=matches && currentState && !(ticket?.time>currentTime && currentTime>0);
      let state=preferCurrent ? currentState : ticket?.state || '';
      const read=preferCurrent && currentRead!==null ? currentRead : ticket?.read;
      if(read===true) state='progress';
      if(state) {
        if(card.dataset.mzoServiceState!==state) card.dataset.mzoServiceState=state;
      } else if(card.hasAttribute('data-mzo-service-state')) card.removeAttribute('data-mzo-service-state');
    }
  }
  refreshServiceStates();
  let refreshTimer;
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (!document.hidden) refreshServiceStates();
    }, 120);
  };
  const serviceObserver = new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (target?.closest?.('.mzo-ticket-status,.mzo-card-tools,.mzo-card-controls')) return false;
      if (target?.closest?.('#dlgChatModal,.attendance-card-container')) return true;
      return [...record.addedNodes, ...record.removedNodes].some(node =>
        node.nodeType === Node.ELEMENT_NODE && (node.matches?.('#dlgChatModal,.attendance-card-container') || node.querySelector?.('#dlgChatModal,.attendance-card-container'))
      );
    })) scheduleRefresh();
  });
  serviceObserver.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class','style','data-test'] });
  setInterval(() => {
    if (!document.hidden) refreshServiceStates();
  }, 2400);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRefresh(); });
})();

// Observe successful native finalization. No cleanup on selection, cancellation or failure.
(() => {
  const wrapped=new WeakSet(),paging=new WeakMap();
  let localSearch=false;
  const scopeOf=node=>{try{return window.angular?.element(node).scope();}catch{return null;}};
  function controller(node){for(let scope=scopeOf(node),i=0;scope&&i<20;i++,scope=scope.$parent)if(scope.vm)return scope.vm;return null;}
  function currentSnapshot(params,body,vm) {
    const modal=document.querySelector('#dlgChatModal.show,#dlgChatModal[style*="display: block"]');
    const user=body?.contact || vm?.selectedUser?.[params?.sector_id] || {};
    const id=String(params?.user_id || user.id || '');
    const cards=[...document.querySelectorAll('.attendance-card-container[data-test]')];
    const exact=cards.find(card=>id && (card.getAttribute('data-test')==='attendances-card-'+id || card.getAttribute('data-test')===id || card.getAttribute('data-test').endsWith('_'+id)));
    const selected=vm?.selectedUser?.[params?.sector_id];
    const phone=String(exact?.dataset.mzoPhone || user.data?.number || user.data?.phone || (String(selected?.id || '')===id ? modal?.dataset.mzoCurrentPhone : '') || '').replace(/\D/g,'');
    const card=exact || (phone && cards.find(card=>card.dataset.mzoPhone?.endsWith(phone.slice(-10))));
    return {phone,userId:id,keys:card?[card.getAttribute('data-test')]:[]};
  }
  function install() {
    try {
      const app=document.querySelector('[ng-app="MktzapApp"]') || document.body;
      const injector=window.angular?.element(app).injector?.() || window.angular?.element(document.body).injector?.();
      const service=injector?.get('ConversationService');
      if(service && typeof service.setStatus==='function' && !wrapped.has(service.setStatus)) {
        const original=service.setStatus;
        const replacement=function(params,body) {
          let snapshot=null;
          try {
            const modal=document.querySelector('#dlgChatModal');
            const vm=controller(modal) || controller(document.querySelector('[data-test="attendances-input-search"]'));
            const status=String(body?.status ?? '');
            const finals=Array.isArray(vm?.finalizationStatus)?vm.finalizationStatus:[];
            const statuses=Array.isArray(vm?.statuses)?vm.statuses:[];
            const closing=!!status && (finals.some(row=>String(row.id)===status) || statuses.some(row=>String(row.id)===status && Number(row.should_close)===1));
            if(closing)snapshot=currentSnapshot(params,body,vm);
          } catch {}
          const result=original.apply(this,arguments);
          if(snapshot && result?.$promise?.then)result.$promise.then(response=>{
            if([true,1,'1','true'].includes(response?.success))window.postMessage({source:'mzo-finalization-confirmed',...snapshot},location.origin);
          }).catch(()=>{});
          return result;
        };
        wrapped.add(replacement);service.setStatus=replacement;
      }
    } catch {}
    const search=document.querySelector('.mzo-native-search');
    if(search?.dataset.mzoFlagSearchMode!==undefined)localSearch=search.dataset.mzoFlagSearchMode==='true';
    const vm=search && controller(search);
    if(!vm)return;
    if(localSearch) {
      if(!paging.has(vm))paging.set(vm,vm.maxPageSize);
      const contacts=vm.contacts?.[vm.sector_id];
      if(Array.isArray(contacts) && typeof vm.maxPageSize==='number' && contacts.length>vm.maxPageSize) {
        vm.maxPageSize=contacts.length;scopeOf(search)?.$evalAsync?.();
      }
    } else if(paging.has(vm)) {
      const previous=paging.get(vm);paging.delete(vm);
      if(typeof previous==='number' && vm.maxPageSize!==previous){vm.maxPageSize=previous;scopeOf(search)?.$evalAsync?.();}
    }
  }
  window.addEventListener('message',event=>{
    if(event.source!==window || event.origin!==location.origin || event.data?.source!=='mzo-flag-search-mode')return;
    localSearch=event.data.enabled===true;install();
  });
  install();setInterval(install,1800);
})();

// Use the recorder directive's actual elapsed time when Angular exposes its controller.
(() => {
  setInterval(()=>{
    for(const mic of document.querySelectorAll('#dlgChatModal #resizable-footer-field .mic')) {
      if(!mic.classList.contains('mzo-recording')){delete mic.dataset.mzoNativeElapsed;continue;}
      try {
        const node=mic.querySelector('ng-audio-recorder');
        if(!node)continue;
        const element=window.angular?.element(node);
        const recorder=element?.controller?.('ngAudioRecorder') || element?.isolateScope?.()?.recorder || element?.scope?.()?.recorder;
        const seconds=Number(recorder?.elapsedTime);
        if(Number.isFinite(seconds) && seconds>=0 && mic.dataset.mzoNativeElapsed!==String(seconds))mic.dataset.mzoNativeElapsed=String(seconds);
      } catch {}
    }
  },500);
})();
