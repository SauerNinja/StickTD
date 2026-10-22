using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using StickTD;

public static class StickTDProject
{
    [MenuItem("StickTD/Create or rebuild game scene")]
    public static void Setup()
    {
        Directory.CreateDirectory("Assets/Scenes");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var root = new GameObject("StickTD — Game");
        root.AddComponent<GameRoot>();
        root.AddComponent<GameAudio>();
        root.AddComponent<WorldHealthBars>();
        root.AddComponent<WeatherDirector>();
        var camera = new GameObject("Main Camera");
        camera.tag = "MainCamera";
        camera.AddComponent<Camera>();
        camera.AddComponent<BattlefieldView>();
        var sunlight = new GameObject("Golden hour sun").AddComponent<Light>();
        sunlight.type = LightType.Directional;
        sunlight.color = new Color(1f, .89f, .69f);
        sunlight.intensity = 1.3f;
        sunlight.shadows = LightShadows.Soft;
        sunlight.shadowStrength = .72f;
        sunlight.transform.rotation = Quaternion.Euler(48, -32, 0);
        var fill = new GameObject("Cool forest bounce").AddComponent<Light>();
        fill.type = LightType.Directional;
        fill.color = new Color(.6f, .78f, .85f);
        fill.intensity = .28f;
        fill.transform.rotation = Quaternion.Euler(26, 155, 0);
        RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(.56f, .65f, .63f);
        RenderSettings.ambientEquatorColor = new Color(.32f, .4f, .34f);
        RenderSettings.ambientGroundColor = new Color(.2f, .25f, .19f);
        RenderSettings.fog = true;
        RenderSettings.fogColor = new Color(.075f, .13f, .13f);
        RenderSettings.fogMode = FogMode.Linear;
        RenderSettings.fogStartDistance = 47;
        RenderSettings.fogEndDistance = 100;
        QualitySettings.antiAliasing = 4;
        QualitySettings.shadowDistance = 80;
        QualitySettings.shadows = ShadowQuality.All;
        QualitySettings.shadowResolution = ShadowResolution.VeryHigh;
        QualitySettings.shadowCascades = 4;
        QualitySettings.shadowProjection = ShadowProjection.StableFit;
        QualitySettings.pixelLightCount = 4;
        QualitySettings.vSyncCount = 1;
        PlayerSettings.companyName = "StickTD Remake";
        PlayerSettings.productName = "Stick Tower Defense — Unity";
        PlayerSettings.defaultScreenWidth = 1600;
        PlayerSettings.defaultScreenHeight = 900;
        PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
        PlayerSettings.resizableWindow = true;
        PlayerSettings.runInBackground = true;
        PlayerSettings.colorSpace = ColorSpace.Linear;
        IncludeShaders();
        PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
        var settings = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
        var input = settings.FindProperty("activeInputHandler");
        if (input != null) { input.intValue = 0; settings.ApplyModifiedPropertiesWithoutUndo(); }
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/StickTD.unity");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/StickTD.unity", true) };
        AssetDatabase.SaveAssets();
        Debug.Log("STICKTD_SETUP_OK");
    }

    [MenuItem("StickTD/Build Windows game")]
    public static void BuildWindows()
    {
        Setup();
        string output = Path.GetFullPath("../Builds/StickTD-Enhanced/StickTD.exe");
        Directory.CreateDirectory(Path.GetDirectoryName(output));
        BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
            scenes = new[] { "Assets/Scenes/StickTD.unity" }, locationPathName = output,
            target = BuildTarget.StandaloneWindows64, options = BuildOptions.Development
        });
        if (report.summary.result != BuildResult.Succeeded) throw new Exception("Build failed: " + report.summary.result);
        File.Copy(Path.GetFullPath("../LICENSE"), Path.Combine(Path.GetDirectoryName(output), "LICENSE.txt"), true);
        Debug.Log("STICKTD_BUILD_OK " + output + " " + report.summary.totalSize);
    }

    public static string ValidateAssets()
    {
        var expected = new[] { "Swordsman","Archer","Mage","Barricade","Hammerman","Axeman","Spearman","Paladin","Gatling","Blowdart","Bomber","Gunalinder","Sniper","DualSquirtGun","Cleric","Grunt","Swarm","Tank","Runner","Boss","Fire","Ice","Splitter","Splitmini","Boulder","Healer","Shielded","Wolf","Troll","Zombie","Wraith","Skeleton","Reaper","GrassTile","PathTile","Foundation","Tree","Rock","Chest","Relic","Portal","Core","Arrow","Orb","Bullet","Bomb","HitSpark","SelectionRing","RangeRing","HeroCrown","GrassTuft","FlowerPatch","Fern","Mushroom","Log","Stump","SmallStone","Reed","LeafParticle","RainDrop","Firefly","Cloud","ContactShadow","Puddle" };
        foreach (string name in expected)
        {
            var asset = Resources.Load<GameObject>("Models/" + name);
            if (!asset || asset.GetComponentsInChildren<Renderer>().Length == 0) throw new Exception("Missing Blender mesh " + name);
        }
        for (int radius = 3; radius <= 9; radius += 2)
        {
            var path = GameMap.Spiral(radius);
            var seen = new System.Collections.Generic.HashSet<Vector2Int>();
            for (int i = 0; i < path.Count; i++)
            {
                if (!seen.Add(path[i])) throw new Exception("Spiral intersects itself at " + path[i]);
                if (i > 0 && Mathf.Abs(path[i].x-path[i-1].x)+Mathf.Abs(path[i].y-path[i-1].y) != 1) throw new Exception("Spiral has discontinuity");
            }
            if (radius > 3)
            {
                var inner = GameMap.Spiral(radius-2);
                for (int i = 0; i < inner.Count; i++)
                    if (inner[i] != path[path.Count-inner.Count+i]) throw new Exception("Expansion changed the existing path");
            }
        }
        Debug.Log("STICKTD_ASSETS_OK: 64 Blender models, 4 continuous nested spirals");
        return "64 Blender models and nested maps validated";
    }

    static void IncludeShaders()
    {
        var settings = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);
        var included = settings.FindProperty("m_AlwaysIncludedShaders");
        foreach (string name in new[] {"StickTD/GrassWind", "StickTD/WeatherSurface", "StickTD/WeatherParticle", "StickTD/ContactShadow", "StickTD/Puddle", "Hidden/StickTD/Atmosphere"})
        {
            var shader = Shader.Find(name);
            if (!shader) continue;
            bool exists = false;
            for (int i = 0; i < included.arraySize; i++) if (included.GetArrayElementAtIndex(i).objectReferenceValue == shader) exists = true;
            if (!exists) { int index = included.arraySize++; included.GetArrayElementAtIndex(index).objectReferenceValue = shader; }
        }
        settings.ApplyModifiedPropertiesWithoutUndo();
    }
}

public class BlenderModelImport : AssetPostprocessor
{
    void OnPreprocessModel()
    {
        if (!assetPath.StartsWith("Assets/Resources/Models/")) return;
        var model = (ModelImporter)assetImporter;
        model.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
        model.importAnimation = true;
        model.animationType = ModelImporterAnimationType.Legacy;
        model.animationCompression = ModelImporterAnimationCompression.Off;
        model.resampleCurves = true;
        model.optimizeGameObjects = false;
        model.importCameras = false;
        model.importLights = false;
        model.isReadable = true;
        model.globalScale = 1;
        model.useFileScale = true;
    }
    void OnPreprocessAnimation()
    {
        if (!assetPath.StartsWith("Assets/Resources/Models/")) return;
        var model = (ModelImporter)assetImporter;
        var clips = model.defaultClipAnimations;
        foreach (var clip in clips)
        {
            foreach (string state in new[] {"Special", "Attack", "Death", "Walk", "Idle", "Hit", "Wind", "Open"})
                if (clip.name.IndexOf(state, StringComparison.OrdinalIgnoreCase) >= 0) { clip.name = state; break; }
            bool loop = clip.name == "Idle" || clip.name == "Walk" || clip.name == "Wind";
            clip.loopTime = loop;
            clip.wrapMode = loop ? WrapMode.Loop : WrapMode.Once;
        }
        if (clips.Length > 0) model.clipAnimations = clips;
    }
    void OnPostprocessModel(GameObject model)
    {
        if (!assetPath.StartsWith("Assets/Resources/Models/")) return;
        foreach (var renderer in model.GetComponentsInChildren<Renderer>())
        {
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.receiveShadows = true;
            if (renderer is SkinnedMeshRenderer skin) skin.updateWhenOffscreen = true;
        }
        var animation = model.GetComponent<Animation>();
        if (animation) { animation.playAutomatically = false; animation.cullingType = AnimationCullingType.BasedOnRenderers; }
    }
    void OnPostprocessMaterial(Material material)
    {
        if (!assetPath.StartsWith("Assets/Resources/Models/")) return;
        string lowerName = material.name.ToLowerInvariant();
        bool ground = assetPath.Contains("GrassTile") || assetPath.Contains("PathTile") || assetPath.Contains("Foundation") || assetPath.Contains("Rock") || assetPath.Contains("SmallStone") || assetPath.Contains("Log") || assetPath.Contains("Stump");
        bool plant = (assetPath.Contains("Tree") || assetPath.Contains("GrassTuft") || assetPath.Contains("Fern") || assetPath.Contains("FlowerPatch") || assetPath.Contains("Reed")) && (lowerName.Contains("grass") || lowerName.Contains("moss") || lowerName.Contains("leaf") || lowerName.Contains("fern"));
        string shaderName = assetPath.Contains("ContactShadow") ? "StickTD/ContactShadow" : assetPath.Contains("Puddle") ? "StickTD/Puddle" : plant ? "StickTD/GrassWind" : ground ? "StickTD/WeatherSurface" : "Standard";
        material.shader = Shader.Find(shaderName) ?? Shader.Find("Standard");
        string[] tokens = material.name.Split('_');
        foreach (string token in tokens)
            if (token.Length == 6 && ColorUtility.TryParseHtmlString("#" + token, out var color)) { material.color = color; break; }
        material.SetFloat("_Glossiness", .25f);
        material.SetFloat("_Metallic", lowerName.Contains("steel") ? .55f : lowerName.Contains("gold") ? .65f : 0);
        material.enableInstancing = true;
        if (plant && material.HasProperty("_UpNormalBlend"))
            material.SetFloat("_UpNormalBlend",assetPath.Contains("Tree")?.18f:.82f);
        if (assetPath.Contains("Puddle")) material.SetColor("_Color", new Color(.08f,.18f,.19f,.58f));
        if (material.name.ToLowerInvariant().Contains("glow"))
        {
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", material.color * .6f);
        }
    }
}
