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
[assembly: AssemblyVersion("3.3.47.0")]
[assembly: AssemblyFileVersion("3.3.47.0")]

internal static class Bundle {
    public const string Version = "3.3.47";
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
    readonly Color Ink = Color.FromArgb(25, 48, 64), Teal = Color.FromArgb(22, 124, 103);
    readonly TextBox pathBox;
    readonly Button install, chrome, opera, copy, folder;
    readonly Label status;
    readonly ProgressBar progress;
    bool busy;
    readonly CheckBox automatic;
    public InstallerForm() {
        Text = "Instalar MKT ORGANIZER · " + Bundle.Version;
        Font = new Font("Segoe UI", 10F);
        ForeColor = Ink; BackColor = Color.FromArgb(246, 249, 251);
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(820, 660); MinimumSize = new Size(760, 690);
        StartPosition = FormStartPosition.CenterScreen;
        using (var stream = Bundle.Resource("app.ico")) Icon = new Icon(stream);
        var root = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 7, Padding = new Padding(28, 24, 28, 20) };
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 86));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 92));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 54));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 64));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 174));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        Controls.Add(root);
        var heading = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 2, Margin = Padding.Empty };
        heading.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 76));heading.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
        heading.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));heading.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        var picture = new PictureBox { Dock = DockStyle.Fill, SizeMode = PictureBoxSizeMode.Zoom, Margin = new Padding(0, 0, 16, 12) };
        using(var stream=Bundle.Resource("icon128.png")) picture.Image=new Bitmap(stream);
        heading.Controls.Add(picture,0,0);heading.SetRowSpan(picture,2);
        heading.Controls.Add(new Label { Text="MKT ORGANIZER",Font=new Font("Segoe UI",22F,FontStyle.Bold),AutoSize=true,Dock=DockStyle.Fill,Margin=Padding.Empty },1,0);
        heading.Controls.Add(new Label { Text="Instalação para Chrome e Opera GX · versão "+Bundle.Version,AutoSize=true,Dock=DockStyle.Fill,Margin=Padding.Empty },1,1);
        root.Controls.Add(heading,0,0);
        var destination=new TableLayoutPanel { Dock=DockStyle.Fill,ColumnCount=1,RowCount=2,Margin=Padding.Empty };
        destination.RowStyles.Add(new RowStyle(SizeType.Absolute,28));destination.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        destination.Controls.Add(new Label{Text="1. Salvar a extensão nos seus Documentos",AutoSize=true,Font=new Font(Font,FontStyle.Bold),Dock=DockStyle.Fill},0,0);
        pathBox=new TextBox{Text=Bundle.DocumentsTarget,ReadOnly=true,Dock=DockStyle.Top,BackColor=Color.White,Margin=new Padding(0,4,0,0)};destination.Controls.Add(pathBox,0,1);root.Controls.Add(destination,0,1);
        var installRow=new TableLayoutPanel { Dock=DockStyle.Fill,ColumnCount=2,RowCount=1,Margin=Padding.Empty };
        installRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,260));installRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
        install=MakeButton("Instalar / atualizar arquivos",true);install.Click+=InstallClicked;
        installRow.Controls.Add(install,0,0);
        progress=new ProgressBar{Dock=DockStyle.Fill,Style=ProgressBarStyle.Continuous,Margin=new Padding(18,14,0,16)};installRow.Controls.Add(progress,1,0);root.Controls.Add(installRow,0,3);
        automatic=new CheckBox{Text="Receber atualizações automáticas do GitHub a cada 30 minutos",Checked=true,AutoSize=true,Dock=DockStyle.Fill,Margin=Padding.Empty};
        root.Controls.Add(automatic,0,2);
        var browserPanel=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=3,BackColor=Color.White,Padding=new Padding(14,12,14,10),Margin=new Padding(0,8,0,8)};
        browserPanel.RowStyles.Add(new RowStyle(SizeType.Absolute,29));browserPanel.RowStyles.Add(new RowStyle(SizeType.Absolute,55));browserPanel.RowStyles.Add(new RowStyle(SizeType.Percent,100));
        browserPanel.Controls.Add(new Label{Text="2. Ativar no navegador · somente na primeira instalação",Font=new Font(Font,FontStyle.Bold),AutoSize=true,Dock=DockStyle.Fill},0,0);
        browserPanel.Controls.Add(new Label{Text="Ative o Modo de desenvolvedor → Carregar sem compactação.\nCole o caminho acima e selecione a pasta MKT ORGANIZER.",AutoSize=true,Dock=DockStyle.Fill},0,1);
        var actions=new FlowLayoutPanel{Dock=DockStyle.Fill,FlowDirection=FlowDirection.LeftToRight,WrapContents=false,Margin=Padding.Empty};
        chrome=MakeButton("Abrir Chrome",false);chrome.Width=150;chrome.Click+=(s,e)=>OpenBrowser(false);
        opera=MakeButton("Abrir Opera GX",false);opera.Width=165;opera.Click+=(s,e)=>OpenBrowser(true);
        copy=MakeButton("Copiar caminho",false);copy.Width=155;copy.Click+=(s,e)=>CopyPath();
        folder=MakeButton("Abrir pasta",false);folder.Width=130;folder.Click+=(s,e)=>OpenFolder();
        foreach(var button in new[]{chrome,opera,copy,folder}){button.Enabled=false;actions.Controls.Add(button);}
        browserPanel.Controls.Add(actions,0,2);root.Controls.Add(browserPanel,0,4);
        status=new Label{Text="Pronto para instalar. Não precisa executar como administrador.\nA ativação inicial é feita uma vez no navegador. As versões publicadas no GitHub chegam pelo atualizador.",AutoSize=true,Dock=DockStyle.Fill,Padding=new Padding(0,10,0,0)};root.Controls.Add(status,0,5);
        root.Controls.Add(new Label{Text="Extensão por @andrz.wav · Atualizações: andresauloparacopias-blip/mktOrganizer",AutoSize=true,Dock=DockStyle.Fill,Font=new Font("Segoe UI",8.5F),ForeColor=Color.FromArgb(89,108,120)},0,6);
        FormClosing+=(s,e)=>{if(busy)e.Cancel=true;};
    }
    Button MakeButton(string text,bool primary) {
        var button=new Button{Text=text,Height=42,Dock=primary?DockStyle.Fill:DockStyle.None,Margin=new Padding(0,2,8,6),FlatStyle=FlatStyle.Flat,BackColor=primary?Teal:Color.FromArgb(237,244,247),ForeColor=primary?Color.White:Ink,UseVisualStyleBackColor=false,Cursor=Cursors.Hand};
        button.FlatAppearance.BorderColor=primary?Teal:Color.FromArgb(181,202,213);button.FlatAppearance.BorderSize=1;
        return button;
    }
    async void InstallClicked(object sender,EventArgs e) {
        busy=true;install.Enabled=false;foreach(var button in new[]{chrome,opera,copy,folder})button.Enabled=false;
        progress.Style=ProgressBarStyle.Marquee;status.Text="Preparando e verificando os arquivos...";
        try {
            bool enableUpdates=automatic.Checked;
            string backup=await System.Threading.Tasks.Task.Run(()=>Bundle.Install(Bundle.DocumentsTarget));
            string updateStatus;
            try {
                if(enableUpdates){await System.Threading.Tasks.Task.Run(()=>AutoUpdater.Configure(Bundle.DocumentsTarget));updateStatus="Atualizador automático ativado: verifica o GitHub a cada 30 minutos.";}
                else {AutoUpdater.Disable();updateStatus="Atualização automática desativada.";}
            } catch(Exception updateError){updateStatus="Arquivos instalados, mas o atualizador não foi ativado: "+updateError.Message;}
            progress.Style=ProgressBarStyle.Continuous;progress.Value=100;
            status.Text="Versão "+Bundle.Version+" salva nos seus Documentos.\n"+updateStatus+"\nNa primeira instalação, faça o passo 2. Depois, atualize a página do MKTZap.";
            install.Text="Reinstalar arquivos";foreach(var button in new[]{chrome,opera,copy,folder})button.Enabled=true;
        } catch(Exception error) {
            progress.Style=ProgressBarStyle.Continuous;progress.Value=0;
            status.Text="Não foi possível concluir. Seus arquivos anteriores foram preservados.\n"+error.Message;
            MessageBox.Show(this,error.Message,"Não foi possível instalar",MessageBoxButtons.OK,MessageBoxIcon.Error);
        } finally {busy=false;install.Enabled=true;}
    }
    void CopyPath(){try{Clipboard.SetText(Bundle.DocumentsTarget);status.Text="Caminho copiado. No navegador, use Carregar sem compactação e cole-o na seleção de pasta.";}catch(Exception e){MessageBox.Show(this,e.Message,"Copiar caminho");}}
    void OpenFolder(){try{Process.Start("explorer.exe","\""+Bundle.DocumentsTarget+"\"");}catch(Exception e){MessageBox.Show(this,e.Message,"Abrir pasta");}}
    public static string FindBrowser(bool operaGX) {
        string local=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),program=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),x86=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        var candidates=operaGX?new[]{Path.Combine(local,"Programs","Opera GX","launcher.exe"),Path.Combine(local,"Programs","Opera GX","opera.exe"),Path.Combine(program,"Opera GX","launcher.exe"),Path.Combine(x86,"Opera GX","launcher.exe")}:new[]{Path.Combine(program,"Google","Chrome","Application","chrome.exe"),Path.Combine(x86,"Google","Chrome","Application","chrome.exe"),Path.Combine(local,"Google","Chrome","Application","chrome.exe")};
        foreach(string path in candidates)if(File.Exists(path))return path;
        if(!operaGX) foreach(var hive in new[]{Registry.CurrentUser,Registry.LocalMachine})using(var key=hive.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")){string value=key==null?null:key.GetValue(null) as string;if(value!=null&&File.Exists(value.Trim('"')))return value.Trim('"');}
        return null;
    }
    void OpenBrowser(bool isOpera) {
        try {
            string browser=FindBrowser(isOpera),url=isOpera?"opera://extensions":"chrome://extensions/";
            if(browser==null){Clipboard.SetText(url);MessageBox.Show(this,"Não encontrei o "+(isOpera?"Opera GX":"Chrome")+" nesta instalação. Abra o navegador e cole este endereço:\n\n"+url+"\n\nO endereço foi copiado.","Abrir extensões");return;}
            Process.Start(new ProcessStartInfo(browser,url){UseShellExecute=true});
            status.Text="No navegador: ative Modo de desenvolvedor → Carregar sem compactação. Use Copiar caminho para selecionar a pasta.";
        }catch(Exception error){MessageBox.Show(this,error.Message,"Abrir navegador");}
    }
    public void RenderPreview(string path,bool installed) {
        if(installed){progress.Value=100;status.Text="Arquivos da versão "+Bundle.Version+" salvos nos seus Documentos.\nAgora abra o navegador e faça a ativação do passo 2.";foreach(var button in new[]{chrome,opera,copy,folder})button.Enabled=true;}
        StartPosition=FormStartPosition.Manual;Location=new Point(-30000,-30000);ShowInTaskbar=false;
        Show();Application.DoEvents();PerformLayout();
        using(var bitmap=new Bitmap(Width,Height)){DrawToBitmap(bitmap,new Rectangle(0,0,Width,Height));bitmap.Save(path);}
        Hide();
    }
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
