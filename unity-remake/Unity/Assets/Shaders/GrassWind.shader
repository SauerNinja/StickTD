Shader "StickTD/GrassWind"
{
    Properties
    {
        _Color("Color",Color)=(.25,.46,.16,1)
        _MainTex("Albedo",2D)="white"{}
        _Glossiness("Smoothness",Range(0,1))=.13
        _WindFlex("Wind flexibility",Range(0,3))=1.5
        _RootHeight("Root height",Float)=0
        _UpNormalBlend("Soft foliage lighting",Range(0,1))=.82
    }
    SubShader
    {
        Tags {"RenderType"="Opaque"}
        Cull Off
        LOD 200
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows vertex:vert addshadow
        #pragma target 3.0
        #pragma multi_compile_instancing
        sampler2D _MainTex;
        fixed4 _Color;
        half _Glossiness,_WindFlex,_RootHeight,_UpNormalBlend;
        float4 _WindDirection;
        float _WindStrength,_WeatherWetness,_CloudShadow,_WeatherTime;
        struct Input{float2 uv_MainTex;float3 worldPos;};
        float hash(float2 p){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
        float noise(float2 p){float2 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(hash(i),hash(i+float2(1,0)),f.x),lerp(hash(i+float2(0,1)),hash(i+1),f.x),f.y);}
        void vert(inout appdata_full v)
        {
            float3 world=mul(unity_ObjectToWorld,v.vertex).xyz;
            float3 litNormal=normalize(lerp(UnityObjectToWorldNormal(v.normal),float3(0,1,0),_UpNormalBlend));
            v.normal=normalize(mul(transpose((float3x3)unity_ObjectToWorld),litNormal));
            float root=saturate((world.y-_RootHeight)*_WindFlex);
            float wave=sin(dot(world.xz,float2(.8,.6))*1.25+_WeatherTime*2.3)+sin(world.x*3.1+world.z*2.7+_WeatherTime*3.7)*.26;
            float3 bend=_WindDirection.xyz*wave*_WindStrength*.075*root;
            v.vertex.xyz+=mul((float3x3)unity_WorldToObject,bend);
        }
        void surf(Input IN,inout SurfaceOutputStandard o)
        {
            float cloud=noise(IN.worldPos.xz*.095+float2(_WeatherTime*.008,_WeatherTime*.004));
            float shade=smoothstep(.23,.77,cloud)*_CloudShadow;
            float groundBlend=lerp(.71,1.08,saturate(IN.worldPos.y*1.1));
            float variation=lerp(.92,1.08,noise(IN.worldPos.xz*.9));
            o.Albedo=tex2D(_MainTex,IN.uv_MainTex).rgb*_Color.rgb*groundBlend*variation*(1-shade*.25)*lerp(1,.82,_WeatherWetness);
            o.Metallic=0;o.Smoothness=lerp(_Glossiness,.39,_WeatherWetness);o.Occlusion=1;o.Emission=o.Albedo*.035;o.Alpha=1;
        }
        ENDCG
    }
    FallBack "Standard"
}
