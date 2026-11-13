using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class Launcher
{
    [STAThread]
    private static int Main(string[] args)
    {
        bool smokeTest = args.Length == 1 && args[0] == "--check-runtime";
        bool serverTest = args.Length == 1 && args[0] == "--check-server";
        try
        {
            string directory = AppDomain.CurrentDomain.BaseDirectory;
            var launcherDirectory = new DirectoryInfo(directory);
            string root = string.Equals(launcherDirectory.Name, "bin", StringComparison.OrdinalIgnoreCase)
                ? launcherDirectory.Parent.FullName : directory;
            string runtime = Path.Combine(root, @"bin\node-runtime\node.exe");
            if (!File.Exists(runtime))
                throw new FileNotFoundException("ไม่พบ Node.js ที่มาพร้อม Tracker กรุณาแตก ZIP ใหม่หรือติดตั้ง Tracker ซ้ำ");

            if (smokeTest)
            {
                using (Process check = Process.Start(NodeStartInfo(runtime, root, "--version")))
                {
                    if (!check.WaitForExit(5000))
                    {
                        check.Kill();
                        return 1;
                    }
                    return check.ExitCode;
                }
            }

            string installId;
            using (var sha = SHA256.Create())
                installId = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(
                    root.TrimEnd(Path.DirectorySeparatorChar).ToUpperInvariant()))).Replace("-", "");
            int port;
            using (var mutex = new Mutex(false, @"Local\FM27-Tracker-" + installId))
            {
                try { mutex.WaitOne(); }
                catch (AbandonedMutexException) { }
                try
                {
                    port = StartTracker(runtime, root, installId);
                }
                finally { mutex.ReleaseMutex(); }
            }

            if (serverTest) return 0;
            string url = TrackerUrl(port);
            string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge))
                Process.Start(edge, "--app=" + url);
            else
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            return 0;
        }
        catch (Exception error)
        {
            if (smokeTest || serverTest) Console.Error.WriteLine(error.Message);
            if (!smokeTest && !serverTest)
            {
                string message = error is System.ComponentModel.Win32Exception
                    ? "เปิด Tracker ไม่สำเร็จ กรุณาแตก ZIP ใหม่หรือติดตั้ง Tracker ซ้ำ หากยังพบปัญหาให้ตรวจว่าไฟล์โปรแกรมเปิดได้บน Windows x64"
                    : error.Message;
                MessageBox.Show(message, "FM27 Tracker", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            return 1;
        }
    }

    private static int StartTracker(string runtime, string root, string installId)
    {
        string localData = Environment.GetEnvironmentVariable("LOCALAPPDATA");
        if (string.IsNullOrEmpty(localData))
            localData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string folder = Path.Combine(localData,
            "FM27 Tracker", "launcher");
        string portFile = Path.Combine(folder, installId + ".port");
        int previous;
        int[] candidates = { 3000, 39727, 39728, 39729, 39730, 39731 };
        if (File.Exists(portFile) && int.TryParse(File.ReadAllText(portFile), out previous))
        {
            int index = Array.IndexOf(candidates, previous);
            if (index >= 0)
            {
                candidates[index] = candidates[0];
                candidates[0] = previous;
            }
        }
        foreach (int port in candidates)
        {
            if (TrackerReady(port, installId)) return port;
        }
        foreach (int port in candidates)
        {
            var start = NodeStartInfo(runtime, root, @"server\index.js");
            start.EnvironmentVariables["PORT"] = port.ToString();
            start.EnvironmentVariables["FM27_DESKTOP_INSTALL"] = installId;
            using (Process server = Process.Start(start))
            {
                for (int attempt = 0; attempt < 40; attempt++)
                {
                    if (TrackerReady(port, installId))
                    {
                        Directory.CreateDirectory(folder);
                        File.WriteAllText(portFile, port.ToString());
                        return port;
                    }
                    if (server.WaitForExit(200)) break;
                }
                if (server.HasExited && server.ExitCode == 73) continue;
                if (!server.HasExited) server.Kill();
                throw new InvalidOperationException("เซิร์ฟเวอร์ Tracker เริ่มทำงานไม่สำเร็จ กรุณาติดตั้งโปรแกรมซ้ำหรือติดต่อผู้ดูแล");
            }
        }
        throw new InvalidOperationException("Tracker เปิดพอร์ตในเครื่องไม่ได้ ทั้งพอร์ต 3000 และพอร์ตสำรองถูกใช้งานหรือถูก Windows จำกัด");
    }

    private static string TrackerUrl(int port) { return "http://localhost:" + port; }

    private static ProcessStartInfo NodeStartInfo(string runtime, string root, string arguments)
    {
        return new ProcessStartInfo
        {
            FileName = runtime,
            Arguments = arguments,
            WorkingDirectory = root,
            UseShellExecute = false,
            CreateNoWindow = true
        };
    }

    private static bool TrackerReady(int port, string installId)
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/update-state");
            request.Proxy = null;
            request.Timeout = 400;
            using (var response = (HttpWebResponse)request.GetResponse())
                return response.StatusCode == HttpStatusCode.OK && response.Headers["X-FM27-Desktop"] == installId;
        }
        catch (WebException)
        {
            return false;
        }
    }
}
