using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Automation;
using System.Windows.Forms;

internal static class BrowserSetup {
    static AutomationElement Named(AutomationElement root, ControlType type, params string[] names) {
        foreach(AutomationElement node in root.FindAll(TreeScope.Descendants,new PropertyCondition(AutomationElement.ControlTypeProperty,type)))
            if(names.Any(name=>String.Equals(node.Current.Name,name,StringComparison.OrdinalIgnoreCase)))return node;
        return null;
    }
    static void Invoke(AutomationElement node) {
        object pattern;
        if(node==null||!node.TryGetCurrentPattern(InvokePattern.Pattern,out pattern))throw new InvalidOperationException("O navegador não disponibilizou este botão para a instalação assistida.");
        ((InvokePattern)pattern).Invoke();
    }
    static AutomationElement Wait(Func<AutomationElement> find,int seconds) {
        var watch=Stopwatch.StartNew();
        while(watch.Elapsed.TotalSeconds<seconds){try{var node=find();if(node!=null)return node;}catch(ElementNotAvailableException){}Thread.Sleep(350);}
        return null;
    }
    static string Executable(string browser) {
        string local=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),program=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),x86=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string relative=browser=="Chrome"?"Google\\Chrome\\Application\\chrome.exe":browser=="Opera GX"?"Programs\\Opera GX\\launcher.exe":"Programs\\Opera\\launcher.exe";
        var candidates=browser=="Chrome"?new[]{Path.Combine(program,relative),Path.Combine(x86,relative),Path.Combine(local,relative)}:new[]{Path.Combine(local,relative),Path.Combine(program,browser,"launcher.exe"),Path.Combine(x86,browser,"launcher.exe")};
        return candidates.FirstOrDefault(File.Exists);
    }
    public static void Show(IWin32Window owner) {
        if(!File.Exists(Path.Combine(Bundle.DocumentsTarget,"manifest.json"))){MessageBox.Show(owner,"Baixe os arquivos da extensão primeiro.","MKT ORGANIZER");return;}
        using(var form=new Form{Text="Ativar no navegador",ClientSize=new Size(570,320),StartPosition=FormStartPosition.CenterParent,FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false,Font=new Font("Segoe UI",10)}) {
            var select=new ComboBox{Left=20,Top=20,Width=220,DropDownStyle=ComboBoxStyle.DropDownList};select.Items.AddRange(new object[]{"Chrome","Opera","Opera GX"});select.SelectedIndex=0;
            var info=new Label{Left=20,Top=60,Width=530,Height=155,Text="Selecione o navegador e clique em Iniciar. Durante a tentativa, aguarde sem usar o mouse ou o teclado.\n\nA assistência tenta ativar o modo desenvolvedor e carregar a pasta da extensão. Se a interface não for reconhecida, conclua pela tela aberta: Modo desenvolvedor → Carregar sem compactação → escolha a pasta abaixo.\n\n"+Bundle.DocumentsTarget};
            var start=new Button{Left=20,Top=240,Width=250,Height=42,Text="Iniciar instalação assistida"};var copy=new Button{Left=285,Top=240,Width=180,Height=42,Text="Copiar caminho"};copy.Click+=(s,e)=>Clipboard.SetText(Bundle.DocumentsTarget);
            bool running=false;form.FormClosing+=(s,e)=>{if(running)e.Cancel=true;};
            start.Click+=async(s,e)=>{running=true;start.Enabled=false;select.Enabled=false;copy.Enabled=false;info.Text="Abrindo o navegador e procurando os controles de extensões. Aguarde…";string browser=(string)select.SelectedItem;try{info.Text=await Task.Run(()=>Run(browser));}catch(Exception error){info.Text="Conclua manualmente na tela de extensões: ative Modo desenvolvedor, clique em Carregar sem compactação e selecione:\n"+Bundle.DocumentsTarget+"\n\n"+error.Message;}finally{running=false;start.Enabled=true;select.Enabled=true;copy.Enabled=true;}};
            form.Controls.AddRange(new Control[]{select,info,start,copy});form.ShowDialog(owner);
        }
    }
    static string Run(string browser) {
        string exe=Executable(browser);if(exe==null)throw new FileNotFoundException("Navegador não encontrado na pasta padrão.");
        string url=browser=="Chrome"?"chrome://extensions/":"opera://extensions/";
        Process.Start(new ProcessStartInfo(exe,"--force-renderer-accessibility "+url){UseShellExecute=true});
        var window=Wait(()=>{
            foreach(AutomationElement item in AutomationElement.RootElement.FindAll(TreeScope.Children,new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.Window))) {
                try {var process=Process.GetProcessById(item.Current.ProcessId);if(!String.Equals(Path.GetFullPath(process.MainModule.FileName),Path.GetFullPath(exe),StringComparison.OrdinalIgnoreCase)&&!(browser!="Chrome"&&process.ProcessName=="opera"&&process.MainModule.FileName.StartsWith(Path.GetDirectoryName(exe),StringComparison.OrdinalIgnoreCase)))continue;
                    if(Named(item,ControlType.Button,"Load unpacked","Carregar sem compactação","Carregar extensão descompactada")!=null||Named(item,ControlType.CheckBox,"Developer mode","Modo do desenvolvedor","Modo desenvolvedor")!=null||Named(item,ControlType.Button,"Developer mode","Modo do desenvolvedor","Modo desenvolvedor")!=null)return item;
                }catch{}
            }return null;
        },20);
        if(window==null)throw new InvalidOperationException("A tela de extensões não expôs os controles esperados. Use a alternativa manual.");
        string[] loadNames={"Load unpacked","Carregar sem compactação","Carregar extensão descompactada"};
        var load=Named(window,ControlType.Button,loadNames);
        if(Named(window,ControlType.Text,"MKT ORGANIZER")!=null)return "MKT ORGANIZER já está listado neste navegador. Confira se está ativado. As atualizações futuras usam a mesma pasta.";
        if(load==null){var toggle=Named(window,ControlType.CheckBox,"Developer mode","Modo do desenvolvedor","Modo desenvolvedor");object pattern;if(toggle==null)toggle=Named(window,ControlType.Button,"Developer mode","Modo do desenvolvedor","Modo desenvolvedor");if(toggle==null)throw new InvalidOperationException("Ative Modo desenvolvedor na tela aberta.");if(toggle.TryGetCurrentPattern(TogglePattern.Pattern,out pattern)){var control=(TogglePattern)pattern;if(control.Current.ToggleState!=ToggleState.On)control.Toggle();}else Invoke(toggle);load=Wait(()=>Named(window,ControlType.Button,loadNames),5);}
        Invoke(load);
        var dialog=Wait(()=>{foreach(AutomationElement item in AutomationElement.RootElement.FindAll(TreeScope.Children,new PropertyCondition(AutomationElement.ClassNameProperty,"#32770")))if(item.Current.ProcessId==window.Current.ProcessId)return item;return window.FindFirst(TreeScope.Descendants,new PropertyCondition(AutomationElement.ClassNameProperty,"#32770"));},8);
        if(dialog==null)throw new InvalidOperationException("Selecione a pasta da extensão no diálogo do navegador.");
        var edit=dialog.FindFirst(TreeScope.Descendants,new PropertyCondition(AutomationElement.AutomationIdProperty,"1152"));object value;
        if(edit==null||!edit.TryGetCurrentPattern(ValuePattern.Pattern,out value))throw new InvalidOperationException("Cole o caminho no seletor de pasta aberto.");
        ((ValuePattern)value).SetValue(Bundle.DocumentsTarget);
        Invoke(Named(dialog,ControlType.Button,"Select Folder","Select folder","Selecionar pasta","Selecionar Pasta"));
        var installed=Wait(()=>Named(window,ControlType.Text,"MKT ORGANIZER"),12);
        return installed!=null?"MKT ORGANIZER localizado na tela de extensões. Confira se o interruptor da extensão está ativado.\n\nAs próximas versões serão baixadas pelo atualizador e a extensão recarregará automaticamente. Atualize as abas do MKTZap após terminar de escrever.":"A pasta foi enviada ao navegador. Confira se MKT ORGANIZER apareceu e está ativado. Se o seletor continuar aberto, confirme a pasta manualmente.\n\n"+Bundle.DocumentsTarget;
    }
}
