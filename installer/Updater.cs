using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class AutoUpdater {
    public const string Repository="andresauloparacopias-blip/mktOrganizer";
    public const string FeedUrl="https://github.com/"+Repository+"/releases/latest/download/update.json";
    const string TaskName="MKT ORGANIZER - Atualizacao";
    static readonly JavaScriptSerializer Json=new JavaScriptSerializer();
    static string AppFolder {get{return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"MKT ORGANIZER");}}
    static string SettingsPath {get{return Path.Combine(AppFolder,"update-settings.json");}}
    public sealed class Feed {public string version;public string archiveUrl;public string sha256;}
    public static bool Newer(string left,string right) {
        int[] a=ParseVersion(left),b=ParseVersion(right);
        for(int i=0;i<4;i++)if(a[i]!=b[i])return a[i]>b[i];return false;
    }
    static int[] ParseVersion(string value) {
        if(value==null||!Regex.IsMatch(value,@"^\d+(\.\d+){0,3}$"))throw new InvalidDataException("Versão inválida.");
        int[] result=new int[4];string[] parts=value.Split('.');
        for(int i=0;i<parts.Length;i++){int n;if(!Int32.TryParse(parts[i],out n)||n<0||n>65535)throw new InvalidDataException("Versão inválida.");result[i]=n;}
        return result;
    }
    public static string ReadVersion(string target) {
        string path=Bundle.SafePath(target,"manifest.json");
        if(!File.Exists(path))return "0";
        var manifest=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(path));
        string version=manifest["version"] as string;ParseVersion(version);return version;
    }
    public static Feed ParseFeed(string content) {
        if(content.Length>65536)throw new InvalidDataException("Metadados acima do limite.");
        var feed=Json.Deserialize<Feed>(content);
        if(feed==null)throw new InvalidDataException("Publicação inválida.");
        ParseVersion(feed.version);
        Uri uri;
        if(!Uri.TryCreate(feed.archiveUrl,UriKind.Absolute,out uri)||uri.Scheme!="https"||!String.IsNullOrEmpty(uri.UserInfo)||!uri.IsDefaultPort||!uri.Host.Equals("github.com",StringComparison.OrdinalIgnoreCase)||!uri.AbsolutePath.StartsWith("/"+Repository+"/releases/download/",StringComparison.OrdinalIgnoreCase)||!uri.AbsolutePath.EndsWith("/extension.zip",StringComparison.Ordinal)||!String.IsNullOrEmpty(uri.Query)||!String.IsNullOrEmpty(uri.Fragment))
            throw new InvalidDataException("O pacote precisa ser uma publicação deste repositório.");
        if(!Regex.IsMatch(feed.sha256??"",@"\A[a-fA-F0-9]{64}\z"))throw new InvalidDataException("SHA-256 inválido.");
        return feed;
    }
    static string StreamHash(Stream stream) {using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}
    public static Dictionary<string,string> ArchiveIndex(string archivePath) {
        var index=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);long total=0;
        using(var zip=ZipFile.OpenRead(archivePath)) {
            foreach(var entry in zip.Entries) {
                if(entry.FullName.EndsWith("/"))continue;
                Bundle.SafePath(Path.GetTempPath(),entry.FullName);
                string name=entry.FullName;
                bool knownRoot=new[]{"background.js","content.js","early.js","LEIA-ME.md","manifest.json","office-preview.js","offscreen.html","offscreen.js","page-bridge.js","theme.css","local-update.js","update-state.json"}.Contains(name);
                bool knownAsset=(name.StartsWith("assets/",StringComparison.Ordinal)||name.StartsWith("icons/",StringComparison.Ordinal))&&Regex.IsMatch(name,@"\.(png|jpg|jpeg|svg|gif|webp|mp3|wav|ogg)$",RegexOptions.IgnoreCase);
                bool knownVendor=name.StartsWith("vendor/",StringComparison.Ordinal)&&Regex.IsMatch(name,@"\.(js|md)$|/[^/]*LICENSE$",RegexOptions.IgnoreCase);
                if(!(knownRoot||knownAsset||knownVendor)||index.ContainsKey(name)||entry.Length>40*1024*1024||(total+=entry.Length)>80*1024*1024||index.Count>=200)throw new InvalidDataException("Conteúdo do pacote não permitido: "+name);
                using(var stream=entry.Open())index.Add(name,StreamHash(stream));
            }
            foreach(string required in new[]{"manifest.json","background.js","content.js","theme.css","local-update.js","update-state.json"})if(!index.ContainsKey(required))throw new InvalidDataException("Pacote incompleto: "+required);
        }
        return index;
    }
    public static bool Apply(Feed feed,string archive,string target) {
        // Check the release hash before inspecting or extracting any package entries.
        if(!Bundle.Hash(archive).Equals(feed.sha256,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("O pacote baixado não passou na verificação SHA-256.");
        if(!Newer(feed.version,ReadVersion(target)))return false;
        ArchiveIndex(archive);
        using(var zip=ZipFile.OpenRead(archive)) {
            string manifest,state;
            using(var reader=new StreamReader(zip.GetEntry("manifest.json").Open()))manifest=reader.ReadToEnd();
            using(var reader=new StreamReader(zip.GetEntry("update-state.json").Open()))state=reader.ReadToEnd();
            var m=Json.Deserialize<Dictionary<string,object>>(manifest);var s=Json.Deserialize<Dictionary<string,object>>(state);
            if((m["version"] as string)!=feed.version||(s["version"] as string)!=feed.version||!s.ContainsKey("ready")||!(s["ready"] is bool)||!(bool)s["ready"])throw new InvalidDataException("As versões da publicação não conferem.");
        }
        Bundle.Install(target,archive);return true;
    }
    public static string TaskXml(string executable,string sid) {
        return "<?xml version=\"1.0\" encoding=\"UTF-16\"?><Task version=\"1.2\" xmlns=\"http://schemas.microsoft.com/windows/2004/02/mit/task\"><RegistrationInfo><Description>Atualiza o MKT ORGANIZER pelo repositório "+Repository+".</Description></RegistrationInfo><Triggers><TimeTrigger><Repetition><Interval>PT30M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>"+DateTime.Now.AddMinutes(1).ToString("yyyy-MM-ddTHH:mm:ss")+"</StartBoundary><Enabled>true</Enabled></TimeTrigger><LogonTrigger><Enabled>true</Enabled><Delay>PT1M</Delay><UserId>"+SecurityElement.Escape(sid)+"</UserId></LogonTrigger></Triggers><Principals><Principal id=\"Owner\"><UserId>"+SecurityElement.Escape(sid)+"</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT3M</ExecutionTimeLimit><Enabled>true</Enabled><Hidden>true</Hidden></Settings><Actions Context=\"Owner\"><Exec><Command>"+SecurityElement.Escape(executable)+"</Command><Arguments>--check</Arguments></Exec></Actions></Task>";
    }
    public static void Configure(string target) {
        Directory.CreateDirectory(AppFolder);
        string updater=Path.Combine(AppFolder,"Atualizador-"+Bundle.Version+".exe");
        byte[] payload;using(var input=Bundle.Resource("updater.exe"))using(var buffer=new MemoryStream()){input.CopyTo(buffer);payload=buffer.ToArray();}
        bool same=File.Exists(updater)&&File.ReadAllBytes(updater).SequenceEqual(payload);
        if(!same)File.WriteAllBytes(updater,payload);
        File.WriteAllText(SettingsPath,Json.Serialize(new{installPath=Path.GetFullPath(target),enabled=true}),new UTF8Encoding(false));
        dynamic service=Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));
        service.Connect();dynamic folder=service.GetFolder("\\");
        string sid=WindowsIdentity.GetCurrent().User.Value;
        folder.RegisterTask(TaskName,TaskXml(updater,sid),6,sid,null,3,null);
        Process.Start(new ProcessStartInfo(updater,"--check"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden});
    }
    public static void Disable() {
        if(File.Exists(SettingsPath))File.WriteAllText(SettingsPath,Json.Serialize(new{installPath=Bundle.DocumentsTarget,enabled=false}),new UTF8Encoding(false));
        dynamic service=Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));service.Connect();dynamic folder=service.GetFolder("\\");
        try{folder.DeleteTask(TaskName,0);}catch(System.Runtime.InteropServices.COMException e){if((uint)e.ErrorCode!=0x80070002)throw;}
    }
    static async System.Threading.Tasks.Task Download(string address,string path,int limit) {
        using(var client=new HttpClient()) {
            client.Timeout=TimeSpan.FromSeconds(55);client.DefaultRequestHeaders.UserAgent.ParseAdd("MKTOrganizerUpdater/1.0");
            using(var response=await client.GetAsync(address,HttpCompletionOption.ResponseHeadersRead)) {
                response.EnsureSuccessStatusCode();var final=response.RequestMessage.RequestUri;
                bool host=final.Host.Equals("github.com",StringComparison.OrdinalIgnoreCase)||final.Host.EndsWith(".githubusercontent.com",StringComparison.OrdinalIgnoreCase);
                if(final.Scheme!="https"||!host)throw new InvalidDataException("Redirecionamento fora do GitHub.");
                if(response.Content.Headers.ContentLength>limit)throw new InvalidDataException("Download acima do limite.");
                using(var input=await response.Content.ReadAsStreamAsync())using(var output=File.Create(path)) {
                    var buffer=new byte[32768];int count,total=0;
                    while((count=await input.ReadAsync(buffer,0,buffer.Length))>0){total+=count;if(total>limit)throw new InvalidDataException("Download acima do limite.");await output.WriteAsync(buffer,0,count);}
                }
            }
        }
    }
    public static async System.Threading.Tasks.Task<string> Check() {
        if(!File.Exists(SettingsPath))return "Atualizador ainda não configurado.";
        var settings=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(SettingsPath));
        if(!settings.ContainsKey("enabled")||!Object.Equals(settings["enabled"],true))return "Atualizações desativadas.";
        string target=settings["installPath"] as string;
        if(String.IsNullOrWhiteSpace(target)||!File.Exists(Path.Combine(target,"manifest.json")))return "Pasta da extensão não encontrada.";
        string scratch=Path.Combine(AppFolder,"download-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(scratch);
        try {
            string meta=Path.Combine(scratch,"update.json"),zip=Path.Combine(scratch,"extension.zip");
            await Download(FeedUrl,meta,65536);Feed feed=ParseFeed(File.ReadAllText(meta));
            if(!Newer(feed.version,ReadVersion(target)))return "A versão instalada já é a mais recente.";
            await Download(feed.archiveUrl,zip,40*1024*1024);
            // Honor opt-out even if the setting changed while the download was in progress.
            settings=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(SettingsPath));if(!Object.Equals(settings["enabled"],true))return "Atualizações desativadas.";
            return Apply(feed,zip,target)?"Versão "+feed.version+" instalada. A extensão recarregará automaticamente; páginas abertas podem ser atualizadas quando você terminar de escrever.":"A versão instalada já é a mais recente.";
        }finally{try{Directory.Delete(scratch,true);}catch{}}
    }
    public static void Log(string message) {
        try{Directory.CreateDirectory(AppFolder);string path=Path.Combine(AppFolder,"atualizador.log");if(File.Exists(path)&&new FileInfo(path).Length>200000)File.WriteAllText(path,"");File.AppendAllText(path,DateTime.Now.ToString("s")+" "+message+Environment.NewLine);}catch{}
    }
    public static void SelfTest(string root) {
        Directory.CreateDirectory(root);string target=Path.Combine(root,"Documentos","MKTZAP","MKT ORGANIZER");Bundle.Install(target);
        int[] nextParts=ParseVersion(Bundle.Version);nextParts[2]++;string nextVersion=nextParts[0]+"."+nextParts[1]+"."+nextParts[2];
        string zipPath=Path.Combine(root,"nova-versao.zip");
        using(var zip=new ZipArchive(File.Create(zipPath),ZipArchiveMode.Create))foreach(var file in Directory.GetFiles(target,"*",SearchOption.AllDirectories)) {
            string name=file.Substring(target.Length+1).Replace('\\','/');var entry=zip.CreateEntry(name);
            using(var output=entry.Open()) {
                byte[] bytes=File.ReadAllBytes(file);
                if(name=="manifest.json")bytes=Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(bytes).Replace(Bundle.Version,nextVersion));
                if(name=="update-state.json")bytes=Encoding.UTF8.GetBytes(Json.Serialize(new{ready=true,version=nextVersion}));
                output.Write(bytes,0,bytes.Length);
            }
        }
        var feed=ParseFeed(Json.Serialize(new Feed{version=nextVersion,archiveUrl="https://github.com/"+Repository+"/releases/download/v"+nextVersion+"/extension.zip",sha256=Bundle.Hash(zipPath)}));
        if(!Apply(feed,zipPath,target)||ReadVersion(target)!=nextVersion||Apply(feed,zipPath,target))throw new Exception("Atualização de versão falhou.");
        feed.sha256=new string('0',64);bool hashBlocked=false;try{Apply(feed,zipPath,target);}catch(InvalidDataException){hashBlocked=true;}if(!hashBlocked)throw new Exception("Pacote adulterado aceito.");
        bool foreign=false;try{ParseFeed(Json.Serialize(new Feed{version="3.3.49",archiveUrl="https://github.com/outro/projeto/releases/download/v3.3.49/extension.zip",sha256=new string('0',64)}));}catch(InvalidDataException){foreign=true;}if(!foreign)throw new Exception("Origem externa aceita.");
        string hostile=Path.Combine(root,"hostil.zip");using(var zip=ZipFile.Open(hostile,ZipArchiveMode.Create)){zip.CreateEntry("../fora.js");}bool traversal=false;try{ArchiveIndex(hostile);}catch(InvalidDataException){traversal=true;}if(!traversal)throw new Exception("Caminho externo aceito.");
        var xml=new System.Xml.XmlDocument();xml.LoadXml(TaskXml(@"C:\Documentos com acentuação & nome\Atualizador.exe","S-1-5-21-123"));
        string sid=WindowsIdentity.GetCurrent().User.Value;
        dynamic service=Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));service.Connect();dynamic taskFolder=service.GetFolder("\\");
        // TASK_VALIDATE_ONLY (1) validates Windows' task schema without installing a task.
        taskFolder.RegisterTask("MKT ORGANIZER - Validacao",TaskXml(@"C:\Documentos com acentuação\Atualizador.exe",sid),1,sid,null,3,null);
        File.WriteAllText(Path.Combine(root,"resultado-atualizador.txt"),"PASS: atualização "+Bundle.Version+" → "+nextVersion+"; idempotência; verificação SHA-256; origem limitada ao repositório; proteção contra traversal; tarefa agendada XML; versão final pronta.");
    }
}

internal static class UpdaterProgram {
    [STAThread] static int Main(string[] args) {
        bool interactive=args.Contains("--interactive");
        ServicePointManager.SecurityProtocol|=SecurityProtocolType.Tls12;
        try {
            using(var gate=new Mutex(false,@"Local\MKTOrganizerUpdater-"+WindowsIdentity.GetCurrent().User.Value)) {
                bool acquired=false;try{acquired=gate.WaitOne(0);}catch(AbandonedMutexException){acquired=true;}
                if(!acquired)return 0;
                try{string result=AutoUpdater.Check().GetAwaiter().GetResult();AutoUpdater.Log(result);if(interactive)MessageBox.Show(result,"MKT ORGANIZER");}finally{gate.ReleaseMutex();}
            }return 0;
        }catch(Exception error){AutoUpdater.Log(error.Message);if(interactive)MessageBox.Show(error.Message,"Atualização indisponível");return 1;}
    }
}
