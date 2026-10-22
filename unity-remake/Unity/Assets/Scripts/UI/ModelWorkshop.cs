using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Rendering;
using UnityEngine.UI;

namespace StickTD
{
    public static class ModelWorkshop
    {
        static ModelWorkshopView current;
        public static bool IsOpen => current != null;
        public static void Open(GameObject owner)
        {
            if(current)return;
            var obj=new GameObject("Blender Model Workshop",typeof(RectTransform));
            current=obj.AddComponent<ModelWorkshopView>();
            current.Initialize(owner);
        }
        internal static void Closed(ModelWorkshopView view){if(current==view)current=null;}
    }

    /// <summary>A separate camera and Blender stage make every authored model and clip inspectable.</summary>
    public sealed class ModelWorkshopView : MonoBehaviour
    {
        const int GalleryLayer=31;
        static readonly Color Background=new Color32(12,27,23,255),Panel=new Color32(25,45,37,255),Raised=new Color32(39,62,49,255);
        static readonly Color Gold=new Color32(237,192,103,255),Paper=new Color32(240,235,215,255),Muted=new Color32(158,179,158,255),Rule=new Color32(65,87,66,255);
        readonly Vector3 origin=new Vector3(500,0,500);
        readonly Dictionary<Light,int> lightMasks=new Dictionary<Light,int>();
        readonly List<Button> assetButtons=new List<Button>();
        readonly Dictionary<string,Button> animationButtons=new Dictionary<string,Button>();
        readonly string[] animations={"Idle","Walk","Attack","Hit","Death","Special"};
        GameRoot game;
        bool wasPaused,closing,dragging;
        Font font;
        GameObject previewRoot,model,platform;
        Camera previewCamera;
        RenderTexture texture;
        RawImage preview;
        RectTransform canvasRect,assetContent;
        Text nameLabel,categoryLabel,descriptionLabel,countLabel,rigLabel,clipLabel;
        GameObject[] assets;
        ModelAnimator controller;
        int index;
        float rotation=22,zoom=1,fitSize=1,automaticTurnUntil;
        Vector2 lastPointer;
        Vector3 target;

        public void Initialize(GameObject owner)
        {
            game=owner?owner.GetComponent<GameRoot>():null;
            if(!game)game=FindFirstObjectByType<GameRoot>();
            if(game){wasPaused=game.Paused;game.Paused=true;}
            font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            assets=Resources.LoadAll<GameObject>("Models");
            Array.Sort(assets,(a,b)=>string.Compare(a.name,b.name,StringComparison.OrdinalIgnoreCase));
            if(!EventSystem.current)new GameObject("Workshop Event System",typeof(EventSystem),typeof(StandaloneInputModule));
            SetupPreview();BuildInterface();
            if(assets.Length>0)
            {
                int first=Array.FindIndex(assets,a=>a.name=="Swordsman");
                index=Mathf.Max(0,first);Select(index);
            }
        }

        void SetupPreview()
        {
            foreach(var light in FindObjectsByType<Light>(FindObjectsSortMode.None))
            {lightMasks[light]=light.cullingMask;light.cullingMask&=~(1<<GalleryLayer);}
            previewRoot=new GameObject("Workshop preview — Blender models only");
            previewRoot.hideFlags=HideFlags.DontSave;
            previewRoot.transform.position=origin;
            var cameraObject=new GameObject("Workshop camera");cameraObject.transform.SetParent(previewRoot.transform,false);
            previewCamera=cameraObject.AddComponent<Camera>();previewCamera.orthographic=true;previewCamera.orthographicSize=1.4f;
            previewCamera.clearFlags=CameraClearFlags.SolidColor;previewCamera.backgroundColor=new Color(.12f,.19f,.16f);
            previewCamera.cullingMask=1<<GalleryLayer;previewCamera.nearClipPlane=.025f;previewCamera.farClipPlane=35;
            previewCamera.allowHDR=true;previewCamera.allowMSAA=true;previewCamera.renderingPath=RenderingPath.Forward;
            previewCamera.useOcclusionCulling=false;previewCamera.depth=-50;
            // Render explicitly, including the opening frame before the UI is captured.
            previewCamera.enabled=false;
            texture=new RenderTexture(1024,768,24,RenderTextureFormat.ARGBHalf){name="Model Workshop 1024x768",antiAliasing=4};
            texture.Create();previewCamera.targetTexture=texture;
            var post=cameraObject.AddComponent<AtmospherePostEffect>();post.HeightMist=0;post.Exposure=.97f;post.Saturation=1.06f;post.Contrast=1.07f;post.Bloom=.20f;
            AddLight("Workshop warm key",new Color(1,.87f,.65f),1.32f,new Vector3(40,-35,0),true);
            AddLight("Workshop cool fill",new Color(.66f,.80f,.90f),.52f,new Vector3(24,48,0),false);
            AddLight("Workshop edge light",new Color(.68f,.85f,.86f),.35f,new Vector3(22,160,0),false);
            platform=AssetLibrary.Spawn("GrassTile",origin,previewRoot.transform);
            PrepareOwnedModel(platform);
            foreach(var animation in platform.GetComponentsInChildren<ModelAnimator>())animation.Bind(null);
        }

        void AddLight(string label,Color color,float strength,Vector3 angles,bool shadows)
        {
            var obj=new GameObject(label);obj.transform.SetParent(previewRoot.transform,false);obj.transform.rotation=Quaternion.Euler(angles);
            var light=obj.AddComponent<Light>();light.type=LightType.Directional;light.color=color;light.intensity=strength;light.cullingMask=1<<GalleryLayer;
            light.shadows=shadows?LightShadows.Soft:LightShadows.None;light.shadowStrength=.87f;light.shadowBias=.02f;light.shadowNormalBias=.10f;light.shadowResolution=LightShadowResolution.VeryHigh;
        }

        void BuildInterface()
        {
            var canvas=gameObject.AddComponent<Canvas>();canvas.renderMode=RenderMode.ScreenSpaceOverlay;canvas.sortingOrder=200;
            var scaler=gameObject.AddComponent<CanvasScaler>();scaler.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize;scaler.referenceResolution=new Vector2(1920,1080);scaler.matchWidthOrHeight=.5f;
            gameObject.AddComponent<GraphicRaycaster>();
            canvasRect=GetComponent<RectTransform>();
            var background=Box("Workshop backdrop",canvasRect,0,0,1920,1080,Background);Stretch(background,0,0,0,0);
            TextAt(background,"THE BLENDER COLLECTION",54,35,900,26,18,Gold,FontStyle.Bold);
            TextAt(background,"MODEL WORKSHOP",50,77,1160,62,45,Paper,FontStyle.Bold);
            TextAt(background,"Explore every model. Preview the rig. See the motion.",54,143,1060,38,23,Muted);
            ButtonAt(background,"RETURN TO CAMPAIGN   X",1494,55,370,59,Close,true,21);
            Box("Header divider",background,54,204,1810,1,Rule);
            var info=Box("Asset library",background,54,232,422,794,Panel);
            countLabel=TextAt(info,"",24,22,374,28,17,Gold,FontStyle.Bold);
            nameLabel=TextAt(info,"",23,63,378,93,36,Paper,FontStyle.Bold);
            categoryLabel=TextAt(info,"",24,167,374,28,17,Gold,FontStyle.Bold);
            descriptionLabel=TextAt(info,"",24,209,374,125,22,Muted);
            rigLabel=TextAt(info,"",24,347,374,59,17,Muted);
            ButtonAt(info,"<  PREVIOUS",22,426,182,49,()=>Step(-1),false,18);
            ButtonAt(info,"NEXT  >",218,426,182,49,()=>Step(1),false,18);
            Box("Library divider",info,22,494,378,1,Rule);
            TextAt(info,"MODEL LIBRARY",23,511,374,26,16,Gold,FontStyle.Bold);
            BuildAssetList(info);

            var frame=Box("Studio preview",background,514,232,1350,681,new Color32(17,34,28,255));
            Box("Studio gold top rule",frame,0,0,1350,3,Gold);
            var imageArea=Rect("Camera framing",frame,16,18,1318,605);
            var rawObject=new GameObject("Model camera image",typeof(RectTransform),typeof(RawImage),typeof(AspectRatioFitter));
            rawObject.transform.SetParent(imageArea,false);var rawRect=rawObject.GetComponent<RectTransform>();Stretch(rawRect,0,0,0,0);
            preview=rawObject.GetComponent<RawImage>();preview.texture=texture;preview.color=Color.white;
            var aspect=rawObject.GetComponent<AspectRatioFitter>();aspect.aspectMode=AspectRatioFitter.AspectMode.FitInParent;aspect.aspectRatio=4f/3;
            TextAt(frame,"DRAG TO ROTATE    /    SCROLL TO ZOOM    /    LEFT & RIGHT ARROWS TO BROWSE",26,638,1300,28,17,Muted).alignment=TextAnchor.MiddleCenter;
            var states=Rect("Animation controls",background,514,936,1350,90);
            for(int i=0;i<animations.Length;i++)
            {
                string state=animations[i];
                animationButtons[state]=ButtonAt(states,state.ToUpperInvariant(),i*226,0,218,55,()=>Play(state),i==0,20);
            }
            clipLabel=TextAt(states,"Choose an animation to inspect its authored motion.",0,68,1350,28,18,Muted);clipLabel.alignment=TextAnchor.MiddleCenter;
        }

        void BuildAssetList(Transform parent)
        {
            var viewport=Box("Library scroll viewport",parent,20,550,382,223,new Color32(20,39,31,255));
            viewport.gameObject.AddComponent<RectMask2D>();
            var scroll=viewport.gameObject.AddComponent<ScrollRect>();scroll.horizontal=false;scroll.movementType=ScrollRect.MovementType.Clamped;scroll.scrollSensitivity=28;
            assetContent=Rect("Available models",viewport,0,0,382,Mathf.Max(223,assets.Length*41));
            scroll.viewport=viewport;scroll.content=assetContent;
            for(int i=0;i<assets.Length;i++)
            {
                int selected=i;
                var button=ButtonAt(assetContent,(i+1).ToString("00")+"   "+FriendlyName(assets[i].name),0,i*41,382,38,()=>Select(selected),false,17);
                button.GetComponentInChildren<Text>().alignment=TextAnchor.MiddleLeft;
                assetButtons.Add(button);
            }
        }

        void Step(int delta){if(assets.Length>0)Select((index+delta+assets.Length)%assets.Length);}
        void Select(int selected)
        {
            index=selected;rotation=22;zoom=1;
            Reload();
            string id=assets[index].name;
            countLabel.text="MODEL "+(index+1).ToString("00")+" / "+assets.Length.ToString("00");
            nameLabel.text=FriendlyName(id).ToUpperInvariant();
            categoryLabel.text=Category(id);
            descriptionLabel.text=Description(id);
            for(int i=0;i<assetButtons.Count;i++)assetButtons[i].GetComponent<Image>().color=i==index?new Color32(83,96,59,255):Raised;
            float listHeight=assets.Length*41;
            assetContent.anchoredPosition=new Vector2(0,Mathf.Clamp(index*41-82,0,Mathf.Max(0,listHeight-223)));
            clipLabel.text="IDLE  /  Drag the model to explore its silhouette.";
            HighlightAnimation("Idle");
            RenderPreview();
        }

        void Reload()
        {
            if(model){model.SetActive(false);Destroy(model);}
            model=AssetLibrary.Spawn(assets[index].name,origin,previewRoot.transform);PrepareOwnedModel(model);
            model.transform.rotation=Quaternion.Euler(0,rotation,0);
            controller=model.GetComponent<ModelAnimator>();if(!controller&&model.GetComponentInChildren<Animation>())controller=model.AddComponent<ModelAnimator>();
            if(controller){controller.Bind(null);controller.Idle();}
            var renderers=model.GetComponentsInChildren<Renderer>();
            Bounds bounds=new Bounds(origin+Vector3.up*.5f,Vector3.one);
            bool first=true;
            int vertices=0;var bones=new HashSet<Transform>();
            foreach(var renderer in renderers)
            {
                if(renderer.name.Contains("ContactShadow"))continue;
                if(assets[index].name=="Puddle")
                {
                    var properties=new MaterialPropertyBlock();renderer.GetPropertyBlock(properties);properties.SetFloat("_WeatherWetness",1);renderer.SetPropertyBlock(properties);
                }
                if(first){bounds=renderer.bounds;first=false;}else bounds.Encapsulate(renderer.bounds);
                if(renderer is SkinnedMeshRenderer skin)
                {if(skin.sharedMesh)vertices+=skin.sharedMesh.vertexCount;foreach(var bone in skin.bones)if(bone)bones.Add(bone);skin.updateWhenOffscreen=true;}
                else{var filter=renderer.GetComponent<MeshFilter>();if(filter&&filter.sharedMesh)vertices+=filter.sharedMesh.vertexCount;}
            }
            target=bounds.center;
            float span=Mathf.Max(bounds.size.x,bounds.size.y,bounds.size.z);
            fitSize=Mathf.Max(.35f,span*.73f);
            float stageScale=Mathf.Max(.9f,span*1.65f);
            platform.transform.position=new Vector3(origin.x,bounds.min.y-.045f,origin.z);platform.transform.localScale=new Vector3(stageScale,.55f,stageScale);
            rigLabel.text=bones.Count+" BONES  /  "+(controller?controller.AnimationCount:0)+" CLIPS\n"+vertices.ToString("N0")+" VERTICES  /  BLENDER FBX";
            foreach(var pair in animationButtons)pair.Value.interactable=controller&&controller.HasState(pair.Key);
            UpdateCamera();automaticTurnUntil=Time.unscaledTime+3;
        }

        void PrepareOwnedModel(GameObject owned)
        {
            foreach(var grounding in owned.GetComponentsInChildren<CharacterGrounding>(true))DestroyImmediate(grounding);
            foreach(var node in owned.GetComponentsInChildren<Transform>(true))node.gameObject.layer=GalleryLayer;
            foreach(var animator in owned.GetComponentsInChildren<ModelAnimator>(true))animator.Bind(null);
        }

        void Play(string state)
        {
            Reload();
            if(controller)controller.Play(state,.1f,1);
            HighlightAnimation(state);
            string caption=state=="Idle"?"A living resting pose.":state=="Walk"?"A looping walk cycle, played in place.":state=="Attack"?"An authored attack, then a return to idle.":state=="Hit"?"Impact reaction and recovery.":state=="Death"?"The final pose is held. Choose another clip to reset.":"A signature action for this model.";
            clipLabel.text=state.ToUpperInvariant()+"  /  "+caption;
            automaticTurnUntil=Time.unscaledTime+3;
            RenderPreview();
        }

        void HighlightAnimation(string state)
        {
            foreach(var pair in animationButtons)
            {
                pair.Value.GetComponent<Image>().color=pair.Key==state?Gold:Raised;
                pair.Value.GetComponentInChildren<Text>().color=pair.Key==state?Background:Paper;
            }
        }

        void Update()
        {
            if(closing||!previewCamera)return;
            if(Input.GetKeyDown(KeyCode.Escape)){Close();return;}
            if(Input.GetKeyDown(KeyCode.LeftArrow))Step(-1);
            if(Input.GetKeyDown(KeyCode.RightArrow))Step(1);
            bool over=preview&&RectTransformUtility.RectangleContainsScreenPoint(preview.rectTransform,Input.mousePosition,null);
            if(over&&Input.GetMouseButtonDown(0)){dragging=true;lastPointer=Input.mousePosition;}
            if(!Input.GetMouseButton(0))dragging=false;
            if(dragging)
            {
                Vector2 pointer=Input.mousePosition;rotation-=(pointer.x-lastPointer.x)*.43f;lastPointer=pointer;
                automaticTurnUntil=Time.unscaledTime+5;
            }
            else if(Time.unscaledTime>automaticTurnUntil)rotation+=Time.unscaledDeltaTime*9;
            if(over&&Mathf.Abs(Input.mouseScrollDelta.y)>.01f)zoom=Mathf.Clamp(zoom-Input.mouseScrollDelta.y*.09f,.55f,1.8f);
            if(model)model.transform.rotation=Quaternion.Euler(0,rotation,0);
            UpdateCamera();
        }

        void UpdateCamera()
        {
            if(!previewCamera)return;
            previewCamera.orthographicSize=fitSize*zoom;
            previewCamera.transform.rotation=Quaternion.Euler(15,0,0);
            previewCamera.transform.position=target-previewCamera.transform.forward*Mathf.Max(6,fitSize*4);
        }

        void LateUpdate(){RenderPreview();}

        void RenderPreview()
        {
            if(closing||!previewCamera||!texture||!previewRoot||!previewRoot.activeInHierarchy)return;
            if(!texture.IsCreated())texture.Create();
            previewCamera.targetTexture=texture;
            previewCamera.Render();
        }

        public void Close()
        {
            if(closing)return;closing=true;
            gameObject.SetActive(false);
            if(previewRoot)previewRoot.SetActive(false);
            if(previewCamera)previewCamera.enabled=false;
            if(game)game.Paused=wasPaused;
            foreach(var pair in lightMasks)if(pair.Key)pair.Key.cullingMask=pair.Value;
            if(previewCamera)previewCamera.targetTexture=null;
            if(texture){if(RenderTexture.active==texture)RenderTexture.active=null;texture.Release();DestroyOwned(texture);}
            if(previewRoot)DestroyOwned(previewRoot);
            ModelWorkshop.Closed(this);DestroyOwned(gameObject);
        }
        void OnDestroy()
        {
            if(!closing)
            {
                if(previewRoot)previewRoot.SetActive(false);
                if(previewCamera)previewCamera.enabled=false;
                if(game)game.Paused=wasPaused;
                foreach(var pair in lightMasks)if(pair.Key)pair.Key.cullingMask=pair.Value;
                if(previewCamera)previewCamera.targetTexture=null;
                if(texture){if(RenderTexture.active==texture)RenderTexture.active=null;texture.Release();DestroyOwned(texture);}
                if(previewRoot)DestroyOwned(previewRoot);
            }
            ModelWorkshop.Closed(this);
        }

        static void DestroyOwned(UnityEngine.Object owned)
        {
            if(!owned)return;
            if(Application.isPlaying)Destroy(owned);else DestroyImmediate(owned);
        }

        static string FriendlyName(string id)
        {
            foreach(var tower in GameCatalog.Buildable)if(tower.Id==id)return tower.Name;
            var result="";
            for(int i=0;i<id.Length;i++){if(i>0&&char.IsUpper(id[i])&&char.IsLower(id[i-1]))result+=" ";result+=id[i];}
            return result;
        }
        static string Category(string id)
        {
            foreach(var tower in GameCatalog.Buildable)if(tower.Id==id)return "DEFENDER  /  "+tower.Family.ToUpperInvariant();
            foreach(var enemy in GameCatalog.EnemyTypes)if(enemy.Id==id)return "HOSTILE  /  FIELD BESTIARY";
            if(id.Contains("Grass")||id.Contains("Fern")||id.Contains("Flower")||id=="Tree")return "WOODLAND  /  LIVING SCENERY";
            if(id=="RainDrop"||id=="Firefly"||id=="LeafParticle"||id=="Cloud"||id=="Puddle")return "ATMOSPHERE  /  WEATHER LIBRARY";
            return "WORLD ASSET  /  BLENDER LIBRARY";
        }
        static string Description(string id)
        {
            foreach(var tower in GameCatalog.Buildable)if(tower.Id==id)return tower.Description;
            foreach(var enemy in GameCatalog.EnemyTypes)if(enemy.Id==id)return "A battlefield enemy with "+enemy.Health.ToString("0")+" base health and "+enemy.Speed.ToString("0.##")+" movement speed. Inspect its silhouette and authored animation poses.";
            if(id=="Tree")return "Layered woodland foliage and a sculpted trunk. Wind animation brings the forest to life.";
            if(id=="GrassTuft")return "Individual blades and a rooted silhouette. Instanced across the field and moved by the wind shader.";
            return "An original Blender model from the game's world and effects library. Rotate the view to inspect the geometry, materials and rig.";
        }

        RectTransform Rect(string label,Transform parent,float x,float y,float width,float height)
        {
            var obj=new GameObject(label,typeof(RectTransform));obj.transform.SetParent(parent,false);var rect=obj.GetComponent<RectTransform>();
            rect.anchorMin=rect.anchorMax=new Vector2(0,1);rect.pivot=new Vector2(0,1);rect.anchoredPosition=new Vector2(x,-y);rect.sizeDelta=new Vector2(width,height);return rect;
        }
        RectTransform Box(string label,Transform parent,float x,float y,float width,float height,Color color)
        {var rect=Rect(label,parent,x,y,width,height);rect.gameObject.AddComponent<Image>().color=color;return rect;}
        Text TextAt(Transform parent,string value,float x,float y,float width,float height,int size,Color color,FontStyle style=FontStyle.Normal)
        {
            var rect=Rect("Workshop text",parent,x,y,width,height);var text=rect.gameObject.AddComponent<Text>();text.font=font;text.text=value;text.fontSize=size;text.color=color;text.fontStyle=style;
            text.raycastTarget=false;text.horizontalOverflow=HorizontalWrapMode.Wrap;text.verticalOverflow=VerticalWrapMode.Overflow;return text;
        }
        Button ButtonAt(Transform parent,string value,float x,float y,float width,float height,UnityEngine.Events.UnityAction action,bool primary=false,int size=19)
        {
            var rect=Box(value,parent,x,y,width,height,primary?Gold:Raised);var button=rect.gameObject.AddComponent<Button>();button.targetGraphic=rect.GetComponent<Image>();button.onClick.AddListener(action);
            button.navigation=new Navigation{mode=Navigation.Mode.None};var colors=button.colors;colors.highlightedColor=new Color(.85f,.94f,.77f);colors.pressedColor=new Color(.62f,.76f,.57f);colors.disabledColor=new Color(.50f,.59f,.49f,.7f);button.colors=colors;
            var text=TextAt(rect,value,14,0,width-28,height,size,primary?Background:Paper,FontStyle.Bold);text.alignment=TextAnchor.MiddleCenter;return button;
        }
        static void Stretch(RectTransform rect,float left,float top,float right,float bottom)
        {rect.anchorMin=Vector2.zero;rect.anchorMax=Vector2.one;rect.offsetMin=new Vector2(left,bottom);rect.offsetMax=new Vector2(-right,-top);}
    }
}
