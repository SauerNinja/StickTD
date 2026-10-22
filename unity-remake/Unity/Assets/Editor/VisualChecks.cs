using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using StickTD;
using UnityEditor;
using UnityEngine;

/// <summary>Checks imported skeletal art and asynchronous real-frame animation without touching campaign actors or saves.</summary>
public static class VisualChecks
{
    static readonly string[] RequiredStates={"Idle","Walk","Attack","Hit","Death","Special"};
    static GameObject sample;
    static ModelAnimator animator;
    static GameRoot game;
    static bool originalPause,walkVerified,pauseVerified,attackVerified,deathVerified;
    static int towerCount,enemyCount;
    static Transform[] sampleBones;
    static Matrix4x4[] baseline;
    static string sampleState;
    static float capturedAt;
    static int automaticPhase;
    static double automaticDeadline;
    public static string MotionResult { get; private set; } = "NOT_RUN";

    public static string ValidateImports()
    {
        string[] files=Directory.GetFiles("Assets/Resources/Models","*.fbx",SearchOption.TopDirectoryOnly);
        Require(files.Length>=64,"expected at least 64 authored FBX models; found "+files.Length);
        int clips=0,bones=0,skins=0,deformationChecks=0;
        foreach(string file in files)
        {
            string path=file.Replace('\\','/');string name=Path.GetFileNameWithoutExtension(path);
            var importer=AssetImporter.GetAtPath(path) as ModelImporter;
            Require(importer!=null&&importer.importAnimation&&importer.animationType==ModelImporterAnimationType.Legacy,name+" must import Legacy animation");
            var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(path);
            Require(prefab!=null,name+" model prefab must exist");
            var imported=AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c=>!c.name.StartsWith("__preview__")).ToArray();
            foreach(string state in RequiredStates)
            {
                var clip=imported.FirstOrDefault(c=>StateName(c.name)==state);
                Require(clip!=null,name+" is missing "+state);
                Require(clip.legacy&&clip.length>.025f,name+" "+state+" must be a nonempty Legacy clip");
                Require(AnimationUtility.GetCurveBindings(clip).Length>0,name+" "+state+" must have authored animation curves");clips++;
            }
            var renderers=prefab.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            Require(renderers.Length>0,name+" must contain an actual skinned mesh, not only an Animation component");
            foreach(var skin in renderers)
            {
                Require(skin.sharedMesh!=null&&skin.sharedMesh.vertexCount>0,name+" has an empty skinned mesh");
                Require(skin.bones!=null&&skin.bones.Length>0&&skin.sharedMesh.bindposes.Length>0,name+" has no bound deformation bones");
                Require(skin.bones.All(b=>b!=null),name+" contains missing bone references");
                bones+=skin.bones.Length;skins++;
            }
            if(name=="Swordsman"||name=="Archer"||name=="Mage")
            {
                var nodes=prefab.GetComponentsInChildren<Transform>(true);
                Require(nodes.Any(n=>n.name=="Head"),name+" has no Head attachment bone");
                Require(nodes.Any(n=>n.name=="WeaponR"),name+" has no WeaponR projectile attachment bone");
                CheckImportedDeformation(prefab,imported.First(c=>StateName(c.name)=="Attack"),name);deformationChecks++;
            }
        }
        foreach(string required in new[]{"GrassTuft","FlowerPatch","Fern","Mushroom","SmallStone","ContactShadow","Puddle"})
            Require(files.Any(p=>Path.GetFileNameWithoutExtension(p)==required),"missing visual asset "+required);
        return "STICKTD_VISUAL_IMPORTS_OK: "+files.Length+" rigged models, "+clips+" required Legacy clips, "+skins+" skinned meshes, "+bones+" bone bindings; "+deformationChecks+" character attack clips verified to deform vertices.";
    }
    static void CheckImportedDeformation(GameObject prefab,AnimationClip clip,string name)
    {
        var instance=UnityEngine.Object.Instantiate(prefab);instance.hideFlags=HideFlags.HideAndDontSave;
        var before=new Mesh();var after=new Mesh();
        try
        {
            foreach(var animation in instance.GetComponentsInChildren<Animation>(true))animation.enabled=false;
            var skin=instance.GetComponentInChildren<SkinnedMeshRenderer>(true);
            clip.SampleAnimation(instance,0);skin.BakeMesh(before);
            clip.SampleAnimation(instance,clip.length*.37f);skin.BakeMesh(after);
            var a=before.vertices;var b=after.vertices;
            Require(a.Length>0&&a.Length==b.Length,name+" vertex sample is invalid");
            float maxDelta=0;for(int i=0;i<a.Length;i++)maxDelta=Mathf.Max(maxDelta,(a[i]-b[i]).sqrMagnitude);
            Require(maxDelta>.000001f,name+" Attack has curves but does not visibly deform any skinned vertices");
        }
        finally{UnityEngine.Object.DestroyImmediate(before);UnityEngine.Object.DestroyImmediate(after);UnityEngine.Object.DestroyImmediate(instance);}
    }
    static string StateName(string name)
    {
        foreach(string state in RequiredStates)
            if(name==state||name.EndsWith("|"+state,StringComparison.OrdinalIgnoreCase)||name.EndsWith("_"+state,StringComparison.OrdinalIgnoreCase))return state;
        return name;
    }
    static void Require(bool condition,string message)
    {if(!condition)throw new Exception("Visual check failed: "+message);}

    /// <summary>Call in Play Mode, then let at least 0.15 real seconds of frames run before EvaluateMotion(true).</summary>
    public static string BeginMotionCheck()
    {
        Require(EditorApplication.isPlaying,"motion checks require Play Mode");
        Cleanup();game=UnityEngine.Object.FindFirstObjectByType<GameRoot>();Require(game!=null&&game.Map!=null,"motion check needs an initialized game");
        originalPause=game.Paused;
        Require(!game.WaveActive,"run the visual probe between waves so campaign actor counts remain stable");
        towerCount=game.Towers.Count;enemyCount=game.Enemies.Count;
        sample=AssetLibrary.Spawn("Swordsman",new Vector3(80,0,80));sample.name="Animation verification sample";
        animator=sample.GetComponent<ModelAnimator>();Require(animator!=null&&animator.IsRigged,"runtime Swordsman needs ModelAnimator and a deformed skinned mesh");
        animator.Bind(game);foreach(string state in RequiredStates)Require(animator.HasState(state),"runtime controller missing "+state);
        sampleBones=sample.GetComponentsInChildren<SkinnedMeshRenderer>(true).SelectMany(s=>s.bones).Where(b=>b!=null).Distinct().ToArray();
        Require(sampleBones.Length>=8,"runtime character has too few animated bones");
        walkVerified=pauseVerified=attackVerified=deathVerified=false;
        game.Paused=false;animator.Walk(1.07f);CaptureSample();
        return "MOTION_SAMPLE_STARTED: Walk. Let frames run 0.15–0.35 seconds, then EvaluateMotion(true).";
    }
    public static string CaptureSample()
    {
        Require(sample!=null&&animator!=null,"call BeginMotionCheck first");
        baseline=Pose();sampleState=animator.CurrentState;capturedAt=Time.realtimeSinceStartup;
        return "Captured "+sampleState+" pose from "+sampleBones.Length+" bones.";
    }
    public static string EvaluateMotion(bool expectMovement)
    {
        Require(sample!=null&&baseline!=null,"animation sample is not active");
        Require(Time.realtimeSinceStartup-capturedAt>=.05f,"let real frames run for at least 0.05 seconds between animation samples");
        var now=Pose();float delta=0;
        for(int i=0;i<now.Length;i++)for(int k=0;k<16;k++)delta=Mathf.Max(delta,Mathf.Abs(now[i][k]-baseline[i][k]));
        if(expectMovement)
        {
            Require(delta>.00005f,sampleState+" must move actual skeleton bones across frames; largest matrix delta was "+delta);
            if(sampleState=="Walk")walkVerified=true;
            if(sampleState=="Attack")attackVerified=true;
            if(sampleState=="Death")deathVerified=true;
        }
        else
        {
            Require(game.Paused,"frozen-pose assertion requires a paused game");
            Require(delta<.00001f,"paused skeletal pose changed by "+delta);pauseVerified=true;
        }
        return "PASS "+sampleState+(expectMovement?" bone deformation":" paused freeze")+"; max matrix delta="+delta.ToString("G5");
    }
    public static string PauseSample()
    {Require(game!=null&&sample!=null,"sample is not active");game.Paused=true;CaptureSample();return "Sample paused. Let frames run, then EvaluateMotion(false).";}
    public static string PlaySample(string state)
    {
        Require(game!=null&&sample!=null&&animator!=null,"sample is not active");
        Require(state=="Attack"||state=="Walk"||state=="Idle"||state=="Hit"||state=="Special","use RetireSample for a real detached death");
        game.Paused=false;animator.Play(state,0,1);
        Require(animator.CurrentState==state,"requested "+state+" did not become the current skeletal state");CaptureSample();
        return "Playing "+state+". Let frames run 0.15–0.3 seconds, then EvaluateMotion(true).";
    }
    public static string RetireSample()
    {
        Require(game!=null&&sample!=null&&animator!=null,"sample is not active");
        game.Paused=false;ModelAnimator.RetireVisual(sample,game);
        Require(animator.IsRetired&&animator.CurrentState=="Death","retired render model must visibly play its Death clip");
        Require(game.Towers.Count==towerCount&&game.Enemies.Count==enemyCount,"visual retirement changed campaign actors");CaptureSample();
        return "Detached death playing. Let frames run 0.15–0.3 seconds, then EvaluateMotion(true) before its lifetime expires.";
    }
    public static string EndMotionCheck()
    {
        bool complete=walkVerified&&pauseVerified&&attackVerified&&deathVerified;
        string results="Walk="+walkVerified+", Pause="+pauseVerified+", Attack="+attackVerified+", Death="+deathVerified;
        Cleanup();Require(complete,"motion workflow incomplete: "+results);
        return "STICKTD_SKELETAL_MOTION_OK: "+results+". Probe removed and original pause restored.";
    }
    /// <summary>Single-dispatch alternative: poll MotionResult after about 1.1 seconds of actual Editor frames.</summary>
    public static string BeginAutomatedMotionCheck()
    {
        BeginMotionCheck();automaticPhase=0;automaticDeadline=EditorApplication.timeSinceStartup+.23;
        MotionResult="RUNNING: observing real-frame skeletal movement";
        EditorApplication.update+=AdvanceAutomaticCheck;
        return MotionResult;
    }
    static void AdvanceAutomaticCheck()
    {
        if(EditorApplication.timeSinceStartup<automaticDeadline)return;
        try
        {
            if(automaticPhase==0){EvaluateMotion(true);PauseSample();}
            else if(automaticPhase==1){EvaluateMotion(false);PlaySample("Attack");}
            else if(automaticPhase==2){EvaluateMotion(true);RetireSample();}
            else
            {
                EvaluateMotion(true);MotionResult=EndMotionCheck();
                EditorApplication.update-=AdvanceAutomaticCheck;return;
            }
            automaticPhase++;automaticDeadline=EditorApplication.timeSinceStartup+.23;
        }
        catch(Exception exception)
        {
            MotionResult="STICKTD_SKELETAL_MOTION_FAILED: "+exception.Message;
            Cleanup();Debug.LogError(MotionResult);
        }
    }
    public static void Cleanup()
    {
        EditorApplication.update-=AdvanceAutomaticCheck;
        if(sample!=null){sample.SetActive(false);UnityEngine.Object.Destroy(sample);}
        if(game!=null)game.Paused=originalPause;
        sample=null;animator=null;game=null;sampleBones=null;baseline=null;
    }
    static Matrix4x4[] Pose()
    {
        var result=new Matrix4x4[sampleBones.Length];
        for(int i=0;i<sampleBones.Length;i++)
        {
            var bone=sampleBones[i];Require(bone!=null,"sample bone disappeared before evaluation");
            result[i]=sample.transform.worldToLocalMatrix*bone.localToWorldMatrix;
        }
        return result;
    }
}
