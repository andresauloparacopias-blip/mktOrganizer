/* Local document previews. Bundled parsers run in the extension's isolated world. */
(() => {
  const supported = extension => /^(DOCX|XLSX|XLS|XLSM|XLSB|CSV|ODS)$/.test(extension);
  const extensionOf = file => (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || file.url.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1] || '').toUpperCase();
  const cache = new Map();
  let active=0;
  const queue=[];
  function enqueue(task) {
    return new Promise((resolve,reject)=>{
      const run=()=>{active++;Promise.resolve().then(task).then(resolve,reject).finally(()=>{active--;queue.shift()?.();});};
      if(active<2)run();else queue.push(run);
    });
  }
  const css = `:host{color-scheme:light;display:block;background:#fff;color:#172c3d;font:13px/1.6 system-ui,sans-serif;min-width:0;box-sizing:border-box}*{box-sizing:border-box;-webkit-text-fill-color:currentColor}button,select{font:inherit}button{cursor:pointer}.status{background:#fff;padding:20px;color:#4d6273}.page{background:#fff;color:#172c3d;padding:20px;overflow:auto;max-height:340px}.page.full{max-height:none}.word{overflow-wrap:anywhere}.word p{margin:0 0 12px}.word img{max-width:100%;height:auto}.word table{color:#172c3d;border-collapse:collapse;max-width:100%}.word td,.word th{border:1px solid #b9cbd8;padding:5px 8px}.tabs{display:flex;gap:5px;overflow:auto;padding:8px;background:#edf3f7;position:sticky;top:0}.tabs button{flex:none;background:#fff;border:1px solid #bdcfdc;border-radius:5px;padding:5px 9px;color:#17374e}.tabs button[aria-selected=true]{background:#1a667b;color:#fff;border-color:#1a667b}.sheet{color:#172c3d;border-collapse:separate;border-spacing:0;white-space:pre-wrap;font-size:12px}.sheet th{background:#e8f0f5;position:sticky;top:0;font-weight:600}.sheet td,.sheet th{min-width:75px;max-width:350px;overflow-wrap:anywhere;border-right:1px solid #d7e2ea;border-bottom:1px solid #d7e2ea;padding:4px 7px;vertical-align:top}.sheet th:first-child{min-width:35px}.note{margin:0;padding:7px 12px;background:#f5f8fb;font-size:11px;color:#52697c}.more{margin:10px;border:1px solid #b2c9da;border-radius:6px;background:#e5eff5;padding:6px 12px;color:#17374e}`;
  async function getBytes(url) {
    try {
      const response = await fetch(url, {credentials:'omit',signal:AbortSignal.timeout(20000)});
      if(!response.ok) throw Error('Falha ao buscar o arquivo');
      if(Number(response.headers.get('content-length'))>30*1024*1024) throw Error('Arquivo acima de 30 MB');
      const bytes = await response.arrayBuffer();
      if(bytes.byteLength>30*1024*1024) throw Error('Arquivo acima de 30 MB');
      return bytes;
    } catch(error) {
      const location = new URL(url);
      if(location.protocol!=='https:' || location.hostname!=='mktzap-media-storage-master.s3.amazonaws.com') throw error;
      const reply = await chrome.runtime.sendMessage({type:'mzo-read-office-file',url});
      if(!reply?.base64) throw Error(reply?.error || 'Não foi possível carregar o documento');
      const decoded = atob(reply.base64), bytes = new Uint8Array(decoded.length);
      for(let i=0;i<decoded.length;i++) bytes[i]=decoded.charCodeAt(i);
      return bytes.buffer;
    }
  }
  function sanitizeWord(html) {
    const document = new DOMParser().parseFromString(html,'text/html');
    const allowed = new Set('P DIV SPAN STRONG EM B I U S UL OL LI TABLE THEAD TBODY TR TH TD H1 H2 H3 H4 H5 H6 BR A IMG BLOCKQUOTE SUP SUB'.split(' '));
    for(const node of [...document.body.querySelectorAll('*')]) {
      if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','SVG','MATH'].includes(node.tagName)){node.remove();continue;}
      if(!allowed.has(node.tagName)){node.replaceWith(...node.childNodes);continue;}
      const image=node.tagName==='IMG' ? node.getAttribute('src') : '';
      for(const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
      if(node.tagName==='IMG') {
        if(/^data:image\/(?:png|jpeg|gif|bmp|webp);base64,/i.test(image || ''))node.setAttribute('src',image);else node.remove();
      }
    }
    return document.body.innerHTML;
  }
  async function parse(file) {
    const bytes=await getBytes(file.url), extension=extensionOf(file);
    if(extension==='DOCX') {
      const result=await mammoth.convertToHtml({arrayBuffer:bytes},{externalFileAccess:false});
      return {type:'word',html:sanitizeWord(result.value)};
    }
    const workbook=XLSX.read(bytes,{type:'array',dense:true,cellHTML:false,cellFormula:false,cellStyles:false,sheetRows:2001});
    return {type:'excel',sheets:workbook.SheetNames.map(name=>{
      const sheet=workbook.Sheets[name], range=XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const full=XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
      range.e.r=Math.min(range.e.r,range.s.r+1999);range.e.c=Math.min(range.e.c,range.s.c+79);
      return {name,start:range.s.r,rows:XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:'',blankrows:true,range}),limited:full.e.r>range.e.r || full.e.c>range.e.c};
    })};
  }
  function model(file) {
    const key=file.url+'\n'+extensionOf(file);
    if(!cache.has(key)) {
      const promise=enqueue(()=>parse(file)).catch(error=>{cache.delete(key);throw error;});
      cache.set(key,promise);
      if(cache.size>8)cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }
  function render(root,data,full) {
    const page=document.createElement('div');page.className='page'+(full?' full':'');
    if(data.type==='word') {page.classList.add('word');page.innerHTML=data.html;root.append(page);return;}
    const tabs=document.createElement('div');tabs.className='tabs';tabs.setAttribute('role','tablist');
    const note=document.createElement('p');note.className='note';
    function sheetAt(index) {
      const sheet=data.sheets[index];page.replaceChildren();
      [...tabs.children].forEach((button,i)=>button.setAttribute('aria-selected',String(i===index)));
      let displayed=full?500:100;
      const table=document.createElement('table');table.className='sheet';
      const body=document.createElement('tbody');table.append(body);page.append(table);
      const more=document.createElement('button');more.className='more';more.textContent='Mostrar mais linhas';
      function rows() {
        const end=Math.min(displayed,sheet.rows.length);
        for(let index=body.children.length;index<end;index++) {
          const row=document.createElement('tr'),number=document.createElement('th');number.textContent=String(sheet.start+index+1);row.append(number);
          for(const value of sheet.rows[index]) {const cell=document.createElement('td');cell.textContent=String(value ?? '');row.append(cell);}
          body.append(row);
        }
        note.textContent=end+' linha(s) exibida(s)'+(sheet.limited?' · Prévia limitada às primeiras 2.000 linhas e 80 colunas.':'');
        if(end<sheet.rows.length)page.append(more);else more.remove();
      }
      more.onclick=()=>{displayed+=500;rows();};rows();
    }
    data.sheets.forEach((sheet,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','tab');button.textContent=sheet.name;button.onclick=()=>sheetAt(index);tabs.append(button);});
    root.append(tabs,note,page);if(data.sheets.length)sheetAt(0);
  }
  function mount(host,file,{full=false}={}) {
    const root=host.shadowRoot || host.attachShadow({mode:'open'});
    root.innerHTML='<style>'+css+'</style><div class="status" role="status">Carregando conteúdo…</div>';
    return model(file).then(data=>{
      if(!host.isConnected)return;
      root.querySelector('.status')?.remove();render(root,data,full);
    }).catch(error=>{const status=root.querySelector('.status');if(status)status.textContent=error.message==='Arquivo acima de 30 MB'?'A prévia aceita arquivos de até 30 MB. Use Baixar original no visualizador.':'Não foi possível gerar a prévia deste arquivo. Ele pode estar protegido ou danificado. Use Baixar original no visualizador.';});
  }
  function open(file) {
    document.querySelector('.mzo-file-viewer')?.close();
    const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='mzo-file-viewer';
    dialog.style.cssText='position:fixed;inset:0;margin:auto;width:94vw;max-width:1400px;height:92vh;max-height:92vh;border:1px solid #6a859b;border-radius:14px;padding:0;background:#fff;';
    const shell=document.createElement('div');shell.style.height='100%';dialog.append(shell);
    const root=shell.attachShadow({mode:'open'});
    root.innerHTML='<style>:host{color:#172c3d;font:14px system-ui}*{box-sizing:border-box;-webkit-text-fill-color:currentColor}.layout{height:100%;display:flex;flex-direction:column;background:#fff}.header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#eaf1f6;border-bottom:1px solid #b2c9da}.title{flex:1;min-width:0;overflow-wrap:anywhere}.header button,.header a{font:600 13px system-ui;color:#17374e;border:1px solid #aac3d5;border-radius:7px;background:#fff;padding:7px 10px;cursor:pointer;text-decoration:none}.body{flex:1;min-height:0;overflow:auto;background:#eef2f6;padding:12px}.body>iframe{display:block;width:100%;height:100%;border:0;background:white}.body>img{display:block;max-width:100%;max-height:100%;object-fit:contain;margin:auto}.body>video,.body>audio{display:block;max-width:100%;margin:auto}.message{padding:24px}</style><section class="layout"><header class="header"><strong class="title"></strong><a class="download">Baixar original</a><button class="close" type="button" aria-label="Fechar documento">Fechar ×</button></header><div class="body"></div></section>';
    const themeStyle=document.createElement('style');
    themeStyle.textContent='.layout{background:var(--viewer-bg);color:var(--viewer-text)}.header{background:var(--viewer-header);border-color:var(--viewer-line)}.header button,.header a{background:var(--viewer-button);color:var(--viewer-text);border-color:var(--viewer-line)}.header :is(a,button):is(:hover,:focus-visible){outline:2px solid var(--viewer-accent);outline-offset:2px}.body{background:var(--viewer-bg)}';
    root.append(themeStyle);
    function syncTheme(){
      const dark=document.documentElement.classList.contains('mzo-dark') && !document.documentElement.classList.contains('mzo-light');
      const values=dark ? ['#101c2b','#edf5ff','#182b3e','#304b63','#55718b','#53dfc3'] : ['#eef2f6','#172c3d','#eaf1f6','#ffffff','#b2c9da','#16768a'];
      ['bg','text','header','button','line','accent'].forEach((name,index)=>shell.style.setProperty('--viewer-'+name,values[index]));
      dialog.style.background=values[0];dialog.style.borderColor=values[4];
    }
    syncTheme();const themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    dialog.addEventListener('close',()=>themeObserver.disconnect(),{once:true});
    dialog.setAttribute('aria-label',file.name);root.querySelector('.title').textContent=file.name;
    const body=root.querySelector('.body'),extension=extensionOf(file),download=root.querySelector('.download');
    download.href=file.url;download.download=file.name;download.onclick=event=>{event.preventDefault();chrome.runtime.sendMessage({type:'mzo-download-files',files:[file]});};
    const close=()=>dialog.close();root.querySelector('.close').onclick=close;
    dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();},{once:true});
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    const modal=[...document.querySelectorAll('#dlgChatModal,#historico')].filter(el=>el.getClientRects().length).at(-1);
    (modal?.querySelector('.modal-content') || modal || document.body).append(dialog);dialog.showModal();
    if(supported(extension)) {const host=document.createElement('div');body.append(host);mount(host,file,{full:true});}
    else if(extension==='PDF') {const frame=document.createElement('iframe');frame.title=file.name;frame.src=file.url;body.append(frame);}
    else if(/^(PNG|JPE?G|WEBP|GIF|AVIF|BMP|SVG)$/.test(extension)){const image=document.createElement('img');image.alt=file.name;image.src=file.url;body.append(image);}
    else if(/^(MP4|WEBM|MOV|MP3|M4A|WAV|OGG|OPUS)$/.test(extension)){const media=document.createElement(/^(MP4|WEBM|MOV)$/.test(extension)?'video':'audio');media.controls=true;media.src=file.url;body.append(media);}
    else {const message=document.createElement('p');message.className='message';message.textContent=extension==='DOC'?'Arquivos Word antigos (.doc) precisam ser abertos no aplicativo. Use Baixar original.':'Este formato precisa ser aberto no aplicativo. Use Baixar original.';body.append(message);}
    root.querySelector('.close').focus();
  }
  globalThis.mzoOfficePreview={supported,mount,open};
})();
