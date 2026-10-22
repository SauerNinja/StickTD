using UnityEngine;
using UnityEngine.Rendering;

namespace StickTD
{
    public enum WeatherKind { Clear, GoldenHour, Overcast, Rain, Mist, Storm }

    /// <summary>Built-in renderer lighting, wind and mesh weather. All visible geometry comes from Blender.</summary>
    public sealed class WeatherDirector : MonoBehaviour
    {
        public static WeatherDirector Instance { get; private set; }
        public Transform Sun, Fill;
        public bool AutoCycle { get; private set; } = true;
        public float Wetness => current.wetness;
        public float WindStrength => current.wind;
        public WeatherKind CurrentWeather { get; private set; } = WeatherKind.GoldenHour;
        public string CurrentWeatherLabel => CurrentWeather == WeatherKind.GoldenHour ? "GOLDEN HOUR" : CurrentWeather.ToString().ToUpperInvariant();
        public float CycleDuration = 75f, BlendDuration = 12f;

        struct Sky
        {
            public Color sun, sky, equator, ground, fog;
            public float key, fill, altitude, yaw, fogStart, fogEnd, haze, wind, rain, wetness, clouds, fireflies;
            public float exposure, saturation, contrast, bloom;
            public static Sky Blend(Sky a, Sky b, float t)
            {
                return new Sky {
                    sun=Color.Lerp(a.sun,b.sun,t),sky=Color.Lerp(a.sky,b.sky,t),equator=Color.Lerp(a.equator,b.equator,t),ground=Color.Lerp(a.ground,b.ground,t),fog=Color.Lerp(a.fog,b.fog,t),
                    key=Mathf.Lerp(a.key,b.key,t),fill=Mathf.Lerp(a.fill,b.fill,t),altitude=Mathf.Lerp(a.altitude,b.altitude,t),yaw=Mathf.LerpAngle(a.yaw,b.yaw,t),
                    fogStart=Mathf.Lerp(a.fogStart,b.fogStart,t),fogEnd=Mathf.Lerp(a.fogEnd,b.fogEnd,t),haze=Mathf.Lerp(a.haze,b.haze,t),wind=Mathf.Lerp(a.wind,b.wind,t),rain=Mathf.Lerp(a.rain,b.rain,t),
                    wetness=Mathf.Lerp(a.wetness,b.wetness,t),clouds=Mathf.Lerp(a.clouds,b.clouds,t),fireflies=Mathf.Lerp(a.fireflies,b.fireflies,t),
                    exposure=Mathf.Lerp(a.exposure,b.exposure,t),saturation=Mathf.Lerp(a.saturation,b.saturation,t),contrast=Mathf.Lerp(a.contrast,b.contrast,t),bloom=Mathf.Lerp(a.bloom,b.bloom,t)
                };
            }
        }

        Sky current, from, target;
        Light keyLight, fillLight;
        Camera view;
        AtmospherePostEffect post;
        ParticleSystem rain, leaves, fireflies;
        Material rainMaterial, leafMaterial, fireflyMaterial;
        AudioSource rainAudio,windAudio;
        GameRoot game;
        float clock, cycleClock, blendClock, nextLightning=13, flash;
        int cycleIndex, previousRadius;
        readonly WeatherKind[] sequence = { WeatherKind.GoldenHour, WeatherKind.Clear, WeatherKind.Overcast, WeatherKind.Rain, WeatherKind.Mist, WeatherKind.GoldenHour, WeatherKind.Storm, WeatherKind.Clear };
        readonly Vector2 windDirection = new Vector2(.88f,.47f).normalized;

        void Awake()
        {
            Instance=this;
            game=GetComponent<GameRoot>();
            current=target=from=Preset(WeatherKind.GoldenHour);
            blendClock=BlendDuration;
        }

        void Start()
        {
            foreach(var light in FindObjectsByType<Light>(FindObjectsSortMode.None))
            {
                if(light.type!=LightType.Directional)continue;
                if(light.name.Contains("sun")||light.name.Contains("Sun")){keyLight=light;Sun=light.transform;}
                else if(light.name.Contains("bounce")||light.name.Contains("Fill")){fillLight=light;Fill=light.transform;}
            }
            if(Sun)keyLight=Sun.GetComponent<Light>();
            if(Fill)fillLight=Fill.GetComponent<Light>();
            if(!keyLight){keyLight=new GameObject("Weather sun").AddComponent<Light>();keyLight.type=LightType.Directional;Sun=keyLight.transform;}
            if(!fillLight){fillLight=new GameObject("Weather sky bounce").AddComponent<Light>();fillLight.type=LightType.Directional;Fill=fillLight.transform;}
            keyLight.shadows=LightShadows.Soft;
            keyLight.shadowStrength=.88f;
            keyLight.shadowBias=.025f;
            keyLight.shadowNormalBias=.18f;
            keyLight.shadowResolution=LightShadowResolution.VeryHigh;
            fillLight.shadows=LightShadows.None;
            fillLight.transform.rotation=Quaternion.Euler(28,145,0);
            RenderSettings.sun=keyLight;
            RenderSettings.ambientMode=AmbientMode.Trilight;
            RenderSettings.reflectionIntensity=.48f;
            RenderSettings.fog=true;
            RenderSettings.fogMode=FogMode.Linear;
            QualitySettings.shadows=ShadowQuality.All;
            QualitySettings.shadowProjection=ShadowProjection.StableFit;
            QualitySettings.shadowResolution=ShadowResolution.VeryHigh;
            QualitySettings.shadowCascades=2;
            QualitySettings.shadowDistance=75;
            TryCamera();
            rain=MakeParticles("RainDrop","Weather rain",new Vector3(0,12,0),2000,new Color(.68f,.82f,.88f,.36f),out rainMaterial);
            leaves=MakeParticles("LeafParticle","Windborne leaves",new Vector3(0,4.2f,0),160,new Color(.72f,.73f,.35f,.8f),out leafMaterial);
            fireflies=MakeParticles("Firefly","Evening fireflies",new Vector3(0,.8f,0),100,new Color(1,.82f,.32f,.85f),out fireflyMaterial);
            ConfigureRain();ConfigureLeaves();ConfigureFireflies();
            rainAudio=MakeLoop("weather_rain");windAudio=MakeLoop("weather_wind");
            Apply();
        }

        public void SetWeather(WeatherKind kind,bool immediate=false)
        {
            CurrentWeather=kind;
            from=current;target=Preset(kind);blendClock=immediate?BlendDuration:0;cycleClock=0;
            if(kind==WeatherKind.Storm)nextLightning=Random.Range(11f,19f);
            if(immediate){current=target;Apply();}
        }
        public void SetAutoCycle(bool enabled){AutoCycle=enabled;cycleClock=0;}

        void Update()
        {
            float dt=Mathf.Min(.1f,Time.unscaledDeltaTime);clock+=dt;cycleClock+=dt;
            if(AutoCycle&&cycleClock>=Mathf.Max(20,CycleDuration)){cycleIndex=(cycleIndex+1)%sequence.Length;SetWeather(sequence[cycleIndex]);}
            blendClock=Mathf.Min(BlendDuration,blendClock+dt);
            float blend=BlendDuration<=0?1:Mathf.SmoothStep(0,1,blendClock/BlendDuration);
            current=Sky.Blend(from,target,blend);
            flash=Mathf.MoveTowards(flash,0,dt*4);
            nextLightning-=dt;
            if(CurrentWeather==WeatherKind.Storm&&nextLightning<=0){flash=.36f;nextLightning=Random.Range(11f,19f);GameAudio.Play("weather_thunder");}
            if(CurrentWeather!=WeatherKind.Storm)nextLightning=Mathf.Max(nextLightning,2);
            if(!view)TryCamera();
            int radius=game&&game.Map?game.Map.Radius:3;
            if(radius!=previousRadius){previousRadius=radius;ResizeParticles(radius);}
            Apply();
        }

        void TryCamera()
        {
            view=Camera.main;
            if(!view)return;
            view.allowHDR=true;
            view.depthTextureMode|=DepthTextureMode.Depth;
            post=view.GetComponent<AtmospherePostEffect>();
            if(!post)post=view.gameObject.AddComponent<AtmospherePostEffect>();
        }

        void Apply()
        {
            if(keyLight)
            {
                keyLight.color=Color.Lerp(current.sun,new Color(.77f,.86f,1),flash);
                keyLight.intensity=current.key+flash*1.35f;
                keyLight.shadowStrength=Mathf.Lerp(.87f,.72f,current.clouds);
                keyLight.transform.rotation=Quaternion.Euler(current.altitude,current.yaw+Mathf.Sin(clock*.008f)*3.5f,0);
            }
            if(fillLight){fillLight.color=new Color(.48f,.66f,.78f);fillLight.intensity=current.fill;}
            RenderSettings.ambientSkyColor=current.sky+Color.white*(flash*.10f);
            RenderSettings.ambientEquatorColor=current.equator;
            RenderSettings.ambientGroundColor=current.ground;
            RenderSettings.ambientIntensity=1;
            RenderSettings.fogColor=current.fog;
            RenderSettings.fogStartDistance=current.fogStart;
            RenderSettings.fogEndDistance=current.fogEnd;
            float gust=.85f+Mathf.Sin(clock*.63f)*.12f+Mathf.Sin(clock*.19f)*.09f;
            Shader.SetGlobalVector("_WindDirection",new Vector4(windDirection.x,0,windDirection.y,0));
            Shader.SetGlobalFloat("_WindStrength",current.wind*gust);
            Shader.SetGlobalFloat("_WeatherWetness",current.wetness);
            Shader.SetGlobalFloat("_CloudShadow",current.clouds);
            Shader.SetGlobalFloat("_WeatherTime",clock);
            Shader.SetGlobalFloat("_ParticleGroundY",.035f);
            Shader.SetGlobalColor("_WeatherSkyColor",current.sky);
            if(view)view.backgroundColor=Color.Lerp(new Color(.035f,.067f,.062f),current.fog,.23f);
            if(post)
            {
                post.FogColor=current.fog;post.HeightMist=current.haze;post.WeatherTime=clock;
                post.Exposure=current.exposure;post.Saturation=current.saturation;post.Contrast=current.contrast;post.Bloom=current.bloom;
                post.Lightning=flash;
            }
            if(rain)
            {
                var emission=rain.emission;emission.rateOverTime=current.rain;
                var velocity=rain.velocityOverLifetime;
                velocity.x=windDirection.x*current.wind*2.4f;velocity.z=windDirection.y*current.wind*2.4f;
            }
            if(leaves)
            {
                var emission=leaves.emission;emission.rateOverTime=Mathf.Lerp(1.1f,8,current.wind/1.8f);
                var velocity=leaves.velocityOverLifetime;velocity.x=windDirection.x*current.wind*1.15f;velocity.z=windDirection.y*current.wind*1.15f;
            }
            if(fireflies){var emission=fireflies.emission;emission.rateOverTime=current.fireflies*6;}
            if(rainAudio){rainAudio.volume=Mathf.Clamp01(current.rain/570f)*.18f;rainAudio.mute=GameAudio.Muted;}
            if(windAudio){windAudio.volume=Mathf.Clamp01(current.wind/1.8f)*.10f;windAudio.mute=GameAudio.Muted;}
        }

        AudioSource MakeLoop(string id)
        {
            var obj=new GameObject(id);obj.transform.SetParent(transform,false);
            var audio=obj.AddComponent<AudioSource>();audio.playOnAwake=false;audio.loop=true;audio.spatialBlend=0;audio.volume=0;audio.priority=192;
            audio.clip=Resources.Load<AudioClip>("Audio/"+id);if(audio.clip)audio.Play();return audio;
        }

        ParticleSystem MakeParticles(string model,string label,Vector3 position,int maximum,Color color,out Material material)
        {
            material=null;
            var particleMesh=BlenderMeshCache.Particle(model);
            if(!particleMesh)return null;
            var obj=new GameObject(label);obj.transform.SetParent(transform,false);obj.transform.position=position;
            var particles=obj.AddComponent<ParticleSystem>();particles.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
            var main=particles.main;main.simulationSpace=ParticleSystemSimulationSpace.World;main.useUnscaledTime=true;main.loop=true;main.maxParticles=maximum;main.startSpeed=0;main.playOnAwake=false;
            var shape=particles.shape;shape.enabled=true;shape.shapeType=ParticleSystemShapeType.Box;shape.scale=new Vector3(18,.2f,18);
            var renderer=particles.GetComponent<ParticleSystemRenderer>();renderer.renderMode=ParticleSystemRenderMode.Mesh;renderer.mesh=particleMesh;
            renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;
            var shader=Shader.Find("StickTD/WeatherParticle");
            if(shader){material=new Material(shader);material.SetColor("_Color",color);renderer.sharedMaterial=material;}
            var emission=particles.emission;emission.rateOverTime=0;
            var lifetimeColor=particles.colorOverLifetime;lifetimeColor.enabled=true;
            var gradient=new Gradient();gradient.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},new[]{new GradientAlphaKey(0,0),new GradientAlphaKey(1,.12f),new GradientAlphaKey(1,.75f),new GradientAlphaKey(0,1)});lifetimeColor.color=gradient;
            particles.Play();return particles;
        }

        void ConfigureRain()
        {
            if(!rain)return;
            var main=rain.main;main.startLifetime=1.2f;main.startSize=new ParticleSystem.MinMaxCurve(.7f,1.1f);main.startRotation3D=true;main.startRotationZ=-.16f;
            var velocity=rain.velocityOverLifetime;velocity.enabled=true;velocity.space=ParticleSystemSimulationSpace.World;velocity.y=-15;
            if(rainMaterial)rainMaterial.SetFloat("_Brightness",1.05f);
        }
        void ConfigureLeaves()
        {
            if(!leaves)return;
            var main=leaves.main;main.startLifetime=new ParticleSystem.MinMaxCurve(7,12);main.startSize=new ParticleSystem.MinMaxCurve(.7f,1.4f);main.startRotation3D=true;main.startRotation=new ParticleSystem.MinMaxCurve(0,6.28f);
            var velocity=leaves.velocityOverLifetime;velocity.enabled=true;velocity.space=ParticleSystemSimulationSpace.World;velocity.y=-.38f;
            var noise=leaves.noise;noise.enabled=true;noise.strength=.32f;noise.frequency=.14f;noise.scrollSpeed=.16f;noise.octaveCount=1;
            var rotation=leaves.rotationOverLifetime;rotation.enabled=true;rotation.separateAxes=true;rotation.x=.7f;rotation.y=.4f;rotation.z=.55f;
        }
        void ConfigureFireflies()
        {
            if(!fireflies)return;
            var main=fireflies.main;main.startLifetime=new ParticleSystem.MinMaxCurve(5,11);main.startSize=new ParticleSystem.MinMaxCurve(.7f,1.25f);
            var shape=fireflies.shape;shape.scale=new Vector3(16,1.2f,16);
            var noise=fireflies.noise;noise.enabled=true;noise.strength=.16f;noise.frequency=.28f;noise.scrollSpeed=.14f;
            if(fireflyMaterial)fireflyMaterial.SetFloat("_Brightness",3.5f);
        }
        void ResizeParticles(int radius)
        {
            float width=(radius+1)*GameMap.CellSize*2;
            foreach(var particles in new[]{rain,leaves,fireflies})
            {
                if(!particles)continue;
                var shape=particles.shape;shape.scale=new Vector3(width,particles==fireflies?1.2f:.2f,width);
            }
        }

        static Sky Preset(WeatherKind kind)
        {
            var p=new Sky{sun=new Color(1,.96f,.88f),sky=new Color(.42f,.52f,.56f),equator=new Color(.28f,.38f,.30f),ground=new Color(.13f,.20f,.15f),fog=new Color(.25f,.37f,.35f),key=1.12f,fill=.26f,altitude=48,yaw=-35,fogStart=41,fogEnd=88,haze=.025f,wind=.40f,rain=0,wetness=0,clouds=.15f,fireflies=0,exposure=1.05f,saturation=1.06f,contrast=1.06f,bloom=.15f};
            switch(kind)
            {
                case WeatherKind.GoldenHour:p.sun=new Color(1,.86f,.65f);p.key=1.25f;p.fill=.22f;p.altitude=31;p.yaw=-48;p.sky=new Color(.38f,.45f,.50f);p.equator=new Color(.27f,.34f,.27f);p.fog=new Color(.33f,.38f,.31f);p.haze=.035f;p.fireflies=.65f;p.exposure=1.02f;p.bloom=.22f;break;
                case WeatherKind.Overcast:p.sun=new Color(.74f,.84f,.92f);p.key=.66f;p.fill=.21f;p.sky=new Color(.36f,.43f,.47f);p.equator=new Color(.25f,.33f,.29f);p.altitude=54;p.fog=new Color(.29f,.39f,.40f);p.fogStart=36;p.fogEnd=76;p.wind=.85f;p.clouds=.62f;p.haze=.07f;p.exposure=1.13f;break;
                case WeatherKind.Rain:p.sun=new Color(.67f,.79f,.87f);p.key=.54f;p.fill=.20f;p.sky=new Color(.31f,.40f,.45f);p.equator=new Color(.20f,.30f,.27f);p.fog=new Color(.28f,.39f,.40f);p.fogStart=34;p.fogEnd=67;p.wind=1.15f;p.rain=310;p.wetness=.85f;p.clouds=.72f;p.haze=.09f;p.exposure=1.19f;p.saturation=1.03f;p.bloom=.18f;break;
                case WeatherKind.Mist:p.sun=new Color(.90f,.96f,.84f);p.key=.85f;p.fill=.18f;p.altitude=38;p.sky=new Color(.34f,.43f,.45f);p.equator=new Color(.24f,.33f,.28f);p.fog=new Color(.40f,.51f,.47f);p.fogStart=30;p.fogEnd=61;p.wind=.23f;p.wetness=.35f;p.haze=.25f;p.clouds=.30f;p.fireflies=.3f;p.exposure=1.08f;p.saturation=1.05f;break;
                case WeatherKind.Storm:p.sun=new Color(.56f,.69f,.85f);p.key=.32f;p.fill=.15f;p.sky=new Color(.25f,.32f,.41f);p.equator=new Color(.15f,.23f,.24f);p.ground=new Color(.08f,.12f,.13f);p.fog=new Color(.19f,.28f,.33f);p.fogStart=33;p.fogEnd=67;p.wind=1.8f;p.rain=570;p.wetness=1;p.clouds=.95f;p.haze=.10f;p.exposure=1.28f;p.saturation=.98f;p.bloom=.22f;break;
            }
            return p;
        }

        void OnDestroy()
        {
            if(Instance==this)Instance=null;
            foreach(var material in new[]{rainMaterial,leafMaterial,fireflyMaterial})if(material)Destroy(material);
        }
    }
}
