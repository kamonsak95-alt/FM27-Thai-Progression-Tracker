using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

internal static class Launcher
{
    private const string Url = "http://localhost:3000";

    [STAThread]
    private static void Main()
    {
        try
        {
            string root = AppDomain.CurrentDomain.BaseDirectory;
            if (!TrackerReady())
            {
                using (Process server = Process.Start(new ProcessStartInfo
                {
                    FileName = "node.exe",
                    Arguments = "server\\index.js",
                    WorkingDirectory = root,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }))
                {
                    for (int attempt = 0; attempt < 30 && !TrackerReady(); attempt++)
                    {
                        if (server.HasExited) break;
                        Thread.Sleep(250);
                    }
                    if (!TrackerReady()) throw new InvalidOperationException("Tracker could not start on port 3000.");
                }
            }

            string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge))
                Process.Start(edge, "--app=" + Url);
            else
                Process.Start(new ProcessStartInfo(Url) { UseShellExecute = true });
        }
        catch (Exception error)
        {
            MessageBox.Show("Could not open FM27 Tracker. Make sure Node.js is installed.\n\n" + error.Message,
                "FM27 Tracker", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static bool TrackerReady()
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(Url + "/api/update-state");
            request.Proxy = null;
            request.Timeout = 400;
            using (var response = (HttpWebResponse)request.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream()))
                return response.StatusCode == HttpStatusCode.OK && reader.ReadToEnd().Contains("\"updateId\"");
        }
        catch (WebException)
        {
            return false;
        }
    }
}
