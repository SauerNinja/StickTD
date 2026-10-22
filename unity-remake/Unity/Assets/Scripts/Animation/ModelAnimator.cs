using System;
using System.Collections.Generic;
using UnityEngine;

namespace StickTD
{
    /// <summary>
    /// Samples the deformation clips authored in Blender. Legacy state times and
    /// crossfade weights follow the game's simulation clock, including pause.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ModelAnimator : MonoBehaviour
    {
        static readonly List<ModelAnimator> retired = new List<ModelAnimator>();
        static GameRoot cachedGame;
        readonly Dictionary<string, AnimationState> states = new Dictionary<string, AnimationState>(StringComparer.OrdinalIgnoreCase);
        readonly Dictionary<AnimationState,float> blendFrom = new Dictionary<AnimationState,float>();
        readonly Dictionary<string,Transform> bones = new Dictionary<string,Transform>(StringComparer.OrdinalIgnoreCase);
        UnityEngine.Animation legacy;
        GameRoot game;
        AnimationState current;
        string currentName="",baseName="Idle";
        float playbackSpeed=1,walkSpeed=1,blendTime,blendDuration,oneShotTime,hitCooldown,retireTime;
        bool oneShot,dying,isRetired,initialized;

        public int AnimationCount { get { EnsureInitialized();return states.Count; } }
        public bool IsRigged => AnimationCount>0&&GetComponentInChildren<SkinnedMeshRenderer>(true)!=null;
        public bool HasClips => AnimationCount>0;
        public string CurrentState => currentName;
        public bool IsPlayingOneShot => oneShot;
        public bool IsRetired => isRetired;

        void Awake(){EnsureInitialized();}
        void OnDestroy(){retired.Remove(this);}
        public void Bind(GameRoot owner){game=owner;if(owner!=null)cachedGame=owner;}
        public bool HasState(string state){EnsureInitialized();return !string.IsNullOrEmpty(state)&&states.ContainsKey(Canonical(state));}
        public Transform GetBone(string bone)
        {
            if(string.IsNullOrEmpty(bone))return null;
            if(bones.TryGetValue(bone,out var found))return found;
            foreach(var node in GetComponentsInChildren<Transform>(true))
            {
                string name=node.name;
                if(name.Equals(bone,StringComparison.OrdinalIgnoreCase)||name.EndsWith(":"+bone,StringComparison.OrdinalIgnoreCase)||name.EndsWith("_"+bone,StringComparison.OrdinalIgnoreCase))
                {bones[bone]=node;return node;}
            }
            return null;
        }
        void EnsureInitialized()
        {
            if(initialized)return;initialized=true;
            if(game==null){if(cachedGame==null)cachedGame=FindFirstObjectByType<GameRoot>();game=cachedGame;}
            legacy=GetComponentInChildren<UnityEngine.Animation>(true);
            if(legacy==null)
            {
                // ModelImporter Legacy normally supplies Animation. This also
                // supports prefabs whose imported clips are present as subassets.
                var clips=Resources.LoadAll<AnimationClip>("Models/"+name.Replace("(Clone)","").Trim());
                foreach(var clip in clips)
                {
                    if(clip==null||!clip.legacy)continue;
                    if(legacy==null)legacy=gameObject.AddComponent<UnityEngine.Animation>();
                    legacy.AddClip(clip,clip.name);
                }
            }
            if(legacy==null)return;
            legacy.playAutomatically=false;legacy.Stop();legacy.cullingType=AnimationCullingType.AlwaysAnimate;
            foreach(AnimationState state in legacy)
            {
                string key=Canonical(state.name);
                state.speed=0;state.weight=0;state.enabled=false;state.layer=0;state.blendMode=AnimationBlendMode.Blend;
                if(!states.ContainsKey(key))states.Add(key,state);
            }
            if(states.Count==0)return;
            legacy.enabled=true;
            if(!states.ContainsKey("Idle"))
                foreach(var pair in states){baseName=pair.Key;break;}
            Begin(baseName,0,1,false);
        }
        static string Canonical(string name)
        {
            string value=(name??"").Trim();
            string[] known={"Idle","Walk","Attack","Hit","Death","Special","Wind","Open"};
            foreach(string key in known)
                if(value.Equals(key,StringComparison.OrdinalIgnoreCase)||value.EndsWith("|"+key,StringComparison.OrdinalIgnoreCase)||value.EndsWith("_"+key,StringComparison.OrdinalIgnoreCase)||value.EndsWith("/"+key,StringComparison.OrdinalIgnoreCase)||value.EndsWith("@"+key,StringComparison.OrdinalIgnoreCase))return key;
            return value;
        }
        public void Idle(){SetMoving(false);}
        public void Walk(float speed=1){SetMoving(true,speed);}
        public void SetMoving(bool moving,float speed=1)
        {
            EnsureInitialized();baseName=moving&&states.ContainsKey("Walk")?"Walk":"Idle";walkSpeed=Mathf.Clamp(speed,.15f,4);
            if(!oneShot&&!dying)Begin(baseName,.16f,baseName=="Walk"?walkSpeed:1,false);
        }
        public void Attack(float speed=1){Play("Attack",.07f,speed);}
        public void Hit()
        {
            if(hitCooldown>0||dying)return;
            hitCooldown=.18f;Play("Hit",.045f,1.1f);
        }
        public void Die(){Play("Death",.09f,1);}
        public void Special(){Play("Special",.12f,1);}
        public void Play(string state,float blend=.12f,float speed=1)
        {
            EnsureInitialized();string key=Canonical(state);
            if(dying&&key!="Death")return;
            if(!states.ContainsKey(key))return;
            if(key=="Idle"||key=="Walk"){SetMoving(key=="Walk",speed);return;}
            if(key=="Death"){if(dying)return;dying=true;}
            // Combat events can occur rapidly, but a loop request never resets
            // its time. A short retrigger guard lets recoil remain readable.
            if(oneShot&&currentName==key&&oneShotTime<.075f)return;
            Begin(key,blend,speed,true);
        }
        void Begin(string name,float blend,float speed,bool single)
        {
            if(!states.TryGetValue(name,out var target))return;
            speed=Mathf.Clamp(speed,.1f,5);
            if(current==target&&!single){playbackSpeed=speed;return;}
            blendFrom.Clear();
            foreach(var pair in states)
                if(pair.Value.enabled&&pair.Value.weight>.0001f)blendFrom[pair.Value]=pair.Value.weight;
            current=target;currentName=name;playbackSpeed=speed;oneShot=single;oneShotTime=0;
            current.enabled=true;current.speed=0;current.time=0;current.wrapMode=single?WrapMode.ClampForever:WrapMode.Loop;
            blendDuration=Mathf.Max(0,blend);blendTime=0;
            if(blendDuration<=0||blendFrom.Count==0)
            {
                foreach(var pair in states){bool active=pair.Value==current;pair.Value.enabled=active;pair.Value.weight=active?1:0;}
                blendDuration=0;
            }
            else if(!blendFrom.ContainsKey(current))current.weight=0;
            legacy.Sample();
        }
        void LateUpdate()
        {
            float dt=game!=null?game.Delta:Time.deltaTime;
            if(isRetired&&game!=null&&game.GameOver&&!game.Paused)dt=Time.deltaTime*game.Speed;
            if(dt<=0)return;
            if(isRetired)
            {
                retireTime-=dt;
                if(retireTime<=0){Destroy(gameObject);return;}
            }
            if(current==null||legacy==null)return;
            hitCooldown=Mathf.Max(0,hitCooldown-dt);oneShotTime+=dt;
            foreach(var pair in states)
                if(pair.Value.enabled)
                {
                    var state=pair.Value;float rate=state==current?playbackSpeed:1;
                    state.time+=dt*rate;state.speed=0;
                }
            if(blendDuration>0)
            {
                blendTime+=dt;float t=Mathf.SmoothStep(0,1,Mathf.Clamp01(blendTime/blendDuration));
                foreach(var pair in states)
                {
                    var state=pair.Value;float from=blendFrom.TryGetValue(state,out var weight)?weight:0;
                    state.weight=Mathf.Lerp(from,state==current?1:0,t);state.enabled=state.weight>.0001f||state==current;
                }
                if(t>=1)blendDuration=0;
            }
            if(oneShot&&!dying&&current.time>=Mathf.Max(.04f,current.length-.08f))
                Begin(baseName,.12f,baseName=="Walk"?walkSpeed:1,false);
            legacy.Sample();
        }

        /// <summary>Detach the render hierarchy, retaining its pose and scale, so logical death can resolve immediately.</summary>
        public static void RetireVisual(GameObject model,GameRoot owner)
        {
            if(model==null)return;
            var controller=model.GetComponent<ModelAnimator>();
            if(controller==null)controller=model.AddComponent<ModelAnimator>();
            controller.Bind(owner);
            if(controller.isRetired)return;
            model.transform.SetParent(null,true);model.name+=" (fallen)";
            controller.isRetired=true;retired.Add(controller);
            controller.Die();
            controller.retireTime=controller.states.TryGetValue("Death",out var death)?Mathf.Max(.65f,death.length+.45f):.45f;
            model.SetActive(true);
        }
        public static void ClearRetired()
        {
            foreach(var controller in retired.ToArray())
                if(controller!=null){controller.gameObject.SetActive(false);Destroy(controller.gameObject);}
            retired.Clear();
        }
    }
}
