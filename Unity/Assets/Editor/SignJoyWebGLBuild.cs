using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class SignJoyWebGLBuild
{
    private const string BuildName = "SignJoyUnityWeb";

    [MenuItem("Build/Build SignJoy WebGL")]
    public static void BuildFromMenu()
    {
        Build();
    }

    public static void Build()
    {
        string outputRoot = GetOutputRoot();
        string[] scenes = GetEnabledScenes();

        if (scenes.Length == 0)
        {
            scenes = new[] { "Assets/Scenes/SampleScene.unity" };
        }

        if (Directory.Exists(outputRoot))
        {
            Directory.Delete(outputRoot, true);
        }

        Directory.CreateDirectory(outputRoot);

        var previousCompression = PlayerSettings.WebGL.compressionFormat;
        var previousColorSpace = PlayerSettings.colorSpace;
        try
        {
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            if (PlayerSettings.colorSpace != ColorSpace.Gamma)
            {
                PlayerSettings.colorSpace = ColorSpace.Gamma;
            }

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                target = BuildTarget.WebGL,
                locationPathName = outputRoot,
                options = BuildOptions.None,
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new Exception($"WebGL build failed: {report.summary.result}");
            }

            Debug.Log($"SignJoy WebGL build completed at: {outputRoot}");
        }
        finally
        {
            PlayerSettings.colorSpace = previousColorSpace;
            PlayerSettings.WebGL.compressionFormat = previousCompression;
            AssetDatabase.Refresh();
        }
    }

    public static string GetOutputRoot()
    {
        string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));
        return Path.Combine(repoRoot, "-Sign-Joy_AI", "web", "static", "unity-webgl");
    }

    public static string GetBuildRoot()
    {
        return Path.Combine(GetOutputRoot(), "Build");
    }

    public static string GetBuildBasePath()
    {
        return Path.Combine(GetBuildRoot(), BuildName);
    }

    private static string[] GetEnabledScenes()
    {
        return EditorBuildSettings.scenes
            .Where(scene => scene.enabled)
            .Select(scene => scene.path)
            .ToArray();
    }
}
