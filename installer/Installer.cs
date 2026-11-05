using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Instalar MKT ORGANIZER")]
[assembly: AssemblyProduct("MKT ORGANIZER")]
[assembly: AssemblyVersion("3.3.48.0")]
[assembly: AssemblyFileVersion("3.3.48.0")]

internal static class Bundle {
    public const string Version = "3.3.48";
    public static string DocumentsTarget {
        get {
            string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            if (String.IsNullOrEmpty(docs)) docs = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Documents");
            return Path.Combine(docs, "MKTZAP", "MKT ORGANIZER");
        }
    }
    public static Stream Resource(string name) {
        Stream result = Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
        if (result == null) throw new InvalidDataException("Recurso do instalador ausente: " + name);
        return result;
    }
    public static string Hash(string file) {
        using (var sha = SHA256.Create()) using (var stream = File.OpenRead(file))
            return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
    }
    public static string SafePath(string root, string relative) {
        if (String.IsNullOrWhiteSpace(relative) || Path.IsPathRooted(relative) || relative.Contains("\\") || relative.Split('/').Any(p => p == ".." || p == "." || p.Length == 0) || relative.Contains(":"))
            throw new InvalidDataException("Caminho inválido no pacote.");
        string prefix = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        string path = Path.GetFullPath(Path.Combine(prefix, relative.Replace('/', Path.DirectorySeparatorChar)));
        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Arquivo fora da pasta de instalação.");
        return path;
    }
    public static Dictionary<string, string> Index() {
        var files = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        using (var reader = new StreamReader(Resource("files.sha256"), Encoding.UTF8)) {
            string line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Length == 0) continue;
                string[] parts = line.Split('\t');
                if (parts.Length != 2 || parts[0].Length != 64 || files.ContainsKey(parts[1])) throw new InvalidDataException("Índice do pacote inválido.");
                SafePath(Path.GetTempPath(), parts[1]);
                files.Add(parts[1], parts[0]);
            }
        }
        if (!files.ContainsKey("manifest.json")) throw new InvalidDataException("Manifesto ausente.");
        return files;
    }
    public static string Install(string target, string archivePath = null) {
        string key;
        using(var sha=SHA256.Create())key=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(Path.GetFullPath(target).ToUpperInvariant()))).Replace("-","").Substring(0,24);
        using(var mutex=new System.Threading.Mutex(false,@"Local\MKTOrganizerFiles-"+key)) {
            bool acquired=false;
            try {try{acquired=mutex.WaitOne(TimeSpan.FromSeconds(60));}catch(System.Threading.AbandonedMutexException){acquired=true;}
                if(!acquired)throw new IOException("Outra instalação está em andamento. Tente novamente em instantes.");
                return InstallCore(target,archivePath);
            }finally{if(acquired)mutex.ReleaseMutex();}
        }
    }
    static string InstallCore(string target, string archivePath) {
        target = Path.GetFullPath(target);
        string parent = Path.GetDirectoryName(target);
        Directory.CreateDirectory(parent);
        string stage = Path.Combine(parent, ".mkt-organizer-stage-" + Guid.NewGuid().ToString("N"));
        string backup = Path.Combine(parent, "Backups MKT ORGANIZER", DateTime.Now.ToString("yyyy-MM-dd HH-mm-ss") + "-" + Guid.NewGuid().ToString("N").Substring(0, 6));
        var files = archivePath == null ? Index() : AutoUpdater.ArchiveIndex(archivePath);
        var changed = new List<string>();
        var existed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        Directory.CreateDirectory(stage);
        try {
            using (var zip = new ZipArchive(archivePath == null ? Resource("extension.zip") : File.OpenRead(archivePath), ZipArchiveMode.Read)) {
                var extracted = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var entry in zip.Entries) {
                    if (entry.FullName.EndsWith("/")) continue;
                    if (!files.ContainsKey(entry.FullName) || !extracted.Add(entry.FullName)) throw new InvalidDataException("Arquivo inesperado no pacote.");
                    string path = SafePath(stage, entry.FullName);
                    Directory.CreateDirectory(Path.GetDirectoryName(path));
                    using (var input = entry.Open()) using (var output = File.Create(path)) input.CopyTo(output);
                    if (Hash(path) != files[entry.FullName]) throw new InvalidDataException("Arquivo corrompido: " + entry.FullName);
                }
                if (extracted.Count != files.Count) throw new InvalidDataException("Pacote incompleto.");
            }
            string packageVersion=new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(SafePath(stage,"manifest.json")))["version"] as string;
            if(AutoUpdater.Newer(AutoUpdater.ReadVersion(target),packageVersion))throw new IOException("Uma versão mais recente já está instalada. Ela foi preservada.");
            // Back up every colliding file before changing any existing installation.
            foreach (string relative in files.Keys) {
                string path = SafePath(target, relative);
                if (!File.Exists(path)) continue;
                string saved = SafePath(backup, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(saved));
                File.Copy(path, saved, false);
                existed.Add(relative);
            }
            try {
                if(files.ContainsKey("update-state.json")) {
                    changed.Add("update-state.json");
                    Directory.CreateDirectory(target);
                    File.WriteAllText(SafePath(target,"update-state.json"),"{\"ready\":false}");
                }
                foreach (string relative in files.Keys.OrderBy(p => p == "update-state.json" ? 2 : p == "manifest.json" ? 1 : 0)) {
                    string path = SafePath(target, relative);
                    Directory.CreateDirectory(Path.GetDirectoryName(path));
                    if(!changed.Contains(relative))changed.Add(relative);
                    File.Copy(SafePath(stage, relative), path, true);
                    if (Hash(path) != files[relative]) throw new IOException("Falha ao verificar: " + relative);
                }
            } catch (Exception original) {
                var rollbackErrors = new List<string>();
                foreach (string relative in changed.AsEnumerable().Reverse()) {
                    try {
                        string path = SafePath(target, relative);
                        if (existed.Contains(relative)) File.Copy(SafePath(backup, relative), path, true);
                        else if (File.Exists(path)) File.Delete(path);
                    } catch (Exception e) { rollbackErrors.Add(relative + ": " + e.Message); }
                }
                if (rollbackErrors.Count != 0) throw new IOException("A instalação falhou. Seus arquivos anteriores estão em " + backup + ". Não foi possível restaurar: " + String.Join("; ", rollbackErrors), original);
                throw;
            }
            return existed.Count > 0 ? backup : "";
        } finally {
            // Only remove the uniquely named staging directory created by this run.
            string prefix = Path.GetFullPath(parent).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            if (stage.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) && Path.GetFileName(stage).StartsWith(".mkt-organizer-stage-", StringComparison.Ordinal)) {
                try { Directory.Delete(stage, true); } catch { }
            }
        }
    }
}

internal sealed class InstallerForm : Form {
    readonly Color ink=Color.FromArgb(25,48,64),teal=Color.FromArgb(22,124,103);
    readonly Button update,copy,folder;
    readonly CheckBox automatic;
    readonly Label status,version;
    readonly ProgressBar progress;
    bool busy;
    public InstallerForm(){
        Text="MKT ORGANIZER · Atualizar arquivos · "+Bundle.Version;Font=new Font("Segoe UI",10F);ForeColor=ink;BackColor=Color.FromArgb(246,249,251);
        AutoScaleMode=AutoScaleMode.Dpi;ClientSize=new Size(820,560);MinimumSize=new Size(760,580);StartPosition=FormStartPosition.CenterScreen;
        using(var stream=Bundle.Resource("app.ico"))Icon=new Icon(stream);
        var root=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=8,Padding=new Padding(28,22,28,20)};root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
        foreach(int height in new[]{82,72,32,42,60})root.RowStyles.Add(new RowStyle(SizeType.Absolute,height));root.RowStyles.Add(new RowStyle(SizeType.Percent,100));root.RowStyles.Add(new RowStyle(SizeType.Absolute,48));root.RowStyles.Add(new RowStyle(SizeType.Absolute,24));Controls.Add(root);
        var heading=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=2,Margin=Padding.Empty};heading.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,76));heading.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));heading.RowStyles.Add(new RowStyle(SizeType.Absolute,42));heading.RowStyles.Add(new RowStyle(SizeType.Absolute,30));
        var logo=new PictureBox{Dock=DockStyle.Fill,SizeMode=PictureBoxSizeMode.Zoom,Margin=new Padding(0,0,16,12)};using(var stream=Bundle.Resource("icon128.png"))logo.Image=new Bitmap(stream);heading.Controls.Add(logo,0,0);heading.SetRowSpan(logo,2);
        heading.Controls.Add(new Label{Text="MKT ORGANIZER",Font=new Font("Segoe UI",22F,FontStyle.Bold),AutoSize=true,Dock=DockStyle.Fill,Margin=Padding.Empty},1,0);heading.Controls.Add(new Label{Text="Baixar do GitHub e atualizar os arquivos",Dock=DockStyle.Fill,AutoSize=true,Margin=Padding.Empty},1,1);root.Controls.Add(heading,0,0);
        var destination=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=2,Margin=Padding.Empty};destination.RowStyles.Add(new RowStyle(SizeType.Absolute,28));destination.RowStyles.Add(new RowStyle(SizeType.Percent,100));destination.Controls.Add(new Label{Text="Pasta dos arquivos nos seus Documentos",Font=new Font(Font,FontStyle.Bold),Dock=DockStyle.Fill,AutoSize=true},0,0);destination.Controls.Add(new TextBox{Text=Bundle.DocumentsTarget,ReadOnly=true,Dock=DockStyle.Top,BackColor=Color.White,Margin=new Padding(0,4,0,0)},0,1);root.Controls.Add(destination,0,1);
        version=new Label{Text=VersionText(),Dock=DockStyle.Fill,AutoSize=true};root.Controls.Add(version,0,2);
        automatic=new CheckBox{Text="Verificar atualizações automaticamente a cada 30 minutos",Checked=true,AutoSize=true,Dock=DockStyle.Fill,Margin=Padding.Empty};root.Controls.Add(automatic,0,3);
        var actions=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=1,Margin=Padding.Empty};actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,290));actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));update=Button("Baixar / atualizar do GitHub",true);update.Click+=UpdateClicked;progress=new ProgressBar{Dock=DockStyle.Fill,Margin=new Padding(18,14,0,16)};actions.Controls.Add(update,0,0);actions.Controls.Add(progress,1,0);root.Controls.Add(actions,0,4);
        status=new Label{Text="Busca a publicação mais recente e atualiza esta pasta.\nMantém suas pastas, sinalizações e ajustes no navegador.\n\nNa primeira instalação, carregue a pasta no navegador. Depois disso, as versões publicadas chegam pelo atualizador.",Dock=DockStyle.Fill,AutoSize=true,Padding=new Padding(0,10,0,0)};root.Controls.Add(status,0,5);
        var helpers=new FlowLayoutPanel{Dock=DockStyle.Fill,WrapContents=false};copy=Button("Copiar caminho",false);copy.Width=180;copy.Click+=(s,e)=>{try{Clipboard.SetText(Bundle.DocumentsTarget);status.Text="Caminho copiado. Selecione essa pasta no navegador na primeira instalação.";}catch(Exception error){status.Text=error.Message;}};folder=Button("Abrir pasta",false);folder.Width=160;folder.Click+=(s,e)=>{try{if(Directory.Exists(Bundle.DocumentsTarget))Process.Start("explorer.exe","\""+Bundle.DocumentsTarget+"\"");else status.Text="Clique em Baixar / atualizar para criar a pasta.";}catch(Exception error){status.Text=error.Message;}};helpers.Controls.Add(copy);helpers.Controls.Add(folder);root.Controls.Add(helpers,0,6);
        root.Controls.Add(new Label{Text="Fonte: github.com/andresauloparacopias-blip/mktOrganizer · @andrz.wav",Dock=DockStyle.Fill,AutoSize=true,Font=new Font("Segoe UI",8.5F)},0,7);
        FormClosing+=(s,e)=>{if(busy){e.Cancel=true;status.Text="Aguarde a conclusão da atualização para fechar esta janela.";}};
    }
    string VersionText(){try{string installed=AutoUpdater.ReadVersion(Bundle.DocumentsTarget);return installed=="0"?"Extensão ainda não salva nesta pasta.":"Versão dos arquivos nesta pasta: "+installed;}catch{return "A versão será conferida durante a atualização.";}}
    Button Button(string text,bool primary){var result=new Button{Text=text,Height=42,Dock=primary?DockStyle.Fill:DockStyle.None,Margin=new Padding(0,2,8,6),FlatStyle=FlatStyle.Flat,BackColor=primary?teal:Color.FromArgb(237,244,247),ForeColor=primary?Color.White:ink,UseVisualStyleBackColor=false,Cursor=Cursors.Hand};result.FlatAppearance.BorderColor=primary?teal:Color.FromArgb(181,202,213);return result;}
    async void UpdateClicked(object sender,EventArgs e){
        busy=true;update.Enabled=false;automatic.Enabled=false;progress.Style=ProgressBarStyle.Marquee;status.Text="Consultando a versão mais recente no GitHub...";
        try{
            string result;bool fallback=false;
            try{result=await AutoUpdater.PullLatest(Bundle.DocumentsTarget);}
            catch(Exception error){
                if(File.Exists(Path.Combine(Bundle.DocumentsTarget,"manifest.json")))throw;
                fallback=true;result="GitHub indisponível: "+error.Message;
            }
            if(fallback){await System.Threading.Tasks.Task.Run(()=>Bundle.Install(Bundle.DocumentsTarget));result+="\nOs arquivos incluídos neste instalador ("+Bundle.Version+") foram salvos. A verificação automática tentará buscar versões novas depois.";}
            string schedule;
            try{if(automatic.Checked){await System.Threading.Tasks.Task.Run(()=>AutoUpdater.Configure(Bundle.DocumentsTarget));schedule="Verificação automática ativada (a cada 30 minutos).";}else{AutoUpdater.Disable();schedule="Verificação automática desativada.";}}catch(Exception error){schedule="Arquivos prontos, mas a verificação automática não foi ativada: "+error.Message;}
            progress.Style=ProgressBarStyle.Continuous;progress.Value=100;version.Text=VersionText();status.Text=result+"\n"+schedule+"\nAtualize a página do MKTZap quando terminar de escrever.";
        }catch(Exception error){progress.Style=ProgressBarStyle.Continuous;progress.Value=0;status.Text="Não foi possível buscar a atualização. Os arquivos existentes foram preservados.\n"+error.Message;}
        finally{busy=false;update.Enabled=true;automatic.Enabled=true;}
    }
    public void RenderPreview(string path,bool installed){if(installed){progress.Value=100;status.Text="Arquivos atualizados do GitHub.\nVerificação automática ativada (a cada 30 minutos).\nAtualize a página do MKTZap quando terminar de escrever.";}StartPosition=FormStartPosition.Manual;Location=new Point(-30000,-30000);ShowInTaskbar=false;Show();Application.DoEvents();PerformLayout();using(var bitmap=new Bitmap(Width,Height)){DrawToBitmap(bitmap,new Rectangle(0,0,Width,Height));bitmap.Save(path);}Hide();}
}

internal static class Program {
    [STAThread] static int Main(string[] args) {
        try {
            if(args.Length==2&&args[0]=="--updater-test"){AutoUpdater.SelfTest(Path.GetFullPath(args[1]));return 0;}
            if(args.Length==2&&args[0]=="--self-test"){SelfTest(Path.GetFullPath(args[1]));return 0;}
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            if(args.Length==2&&args[0]=="--render-preview"){using(var form=new InstallerForm())form.RenderPreview(args[1],false);return 0;}
            if(args.Length==2&&args[0]=="--render-installed"){using(var form=new InstallerForm())form.RenderPreview(args[1],true);return 0;}
            Application.Run(new InstallerForm());return 0;
        }catch(Exception e){if(args.Length>0){File.WriteAllText(Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),"installer-test-error.txt"),e.ToString());return 1;}MessageBox.Show(e.Message,"MKT ORGANIZER",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
    }
    static void Require(bool condition,string message){if(!condition)throw new Exception(message);}
    static void SelfTest(string root) {
        if(Directory.Exists(root))throw new Exception("Use uma pasta de teste nova.");
        Directory.CreateDirectory(root);string target=Path.Combine(root,"Documentos com acentuação","MKTZAP","MKT ORGANIZER");
        var index=Bundle.Index();Require(Bundle.Install(target)=="","Fresh installation should not create backup");
        foreach(var pair in index)Require(Bundle.Hash(Bundle.SafePath(target,pair.Key))==pair.Value,"Hash mismatch: "+pair.Key);
        File.WriteAllText(Path.Combine(target,"arquivo pessoal.txt"),"preservar");File.WriteAllText(Path.Combine(target,"early.js"),"versão anterior");
        string backup=Bundle.Install(target);Require(File.ReadAllText(Path.Combine(backup,"early.js"))=="versão anterior","Backup failed");Require(File.ReadAllText(Path.Combine(target,"arquivo pessoal.txt"))=="preservar","Unrelated file changed");
        string broken=Path.Combine(root,"rollback");Directory.CreateDirectory(broken);File.WriteAllText(Path.Combine(broken,"early.js"),"manter original");File.WriteAllText(Path.Combine(broken,"vendor"),"bloquear pasta");
        bool failed=false;try{Bundle.Install(broken);}catch(IOException){failed=true;}Require(failed,"Failure scenario did not fail");Require(File.ReadAllText(Path.Combine(broken,"early.js"))=="manter original","Rollback lost original");Require(!File.Exists(Path.Combine(broken,"manifest.json")),"Rollback left partial package");
        bool traversal=false;try{Bundle.SafePath(target,"../outside.txt");}catch(InvalidDataException){traversal=true;}Require(traversal,"Path traversal accepted");
        Require(!Directory.GetDirectories(root,".mkt-organizer-stage-*",SearchOption.AllDirectories).Any(),"Stage left behind");
        File.WriteAllText(Path.Combine(root,"resultado.txt"),"PASS: "+index.Count+" arquivos e hashes; instalação sem rede; caminhos Unicode; backup/atualização; preservação de arquivos; reversão em falha; proteção de caminhos; limpeza.\r\nDestino padrão: "+Bundle.DocumentsTarget);
    }
}
