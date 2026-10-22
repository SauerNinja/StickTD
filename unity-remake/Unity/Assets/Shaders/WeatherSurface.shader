Shader "StickTD/WeatherSurface"
{
    Properties
    {
        _Color("Color",Color)=(.35,.48,.23,1)
        _MainTex("Albedo",2D)="white"{}
        _Glossiness("Smoothness",Range(0,1))=.15
        _Metallic("Metallic",Range(0,1))=0
        _WeatherResponse("Wetness response",Range(0,1))=1
    }
    SubShader
    {
        Tags {"RenderType"="Opaque"}
        LOD 200
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows addshadow
        #pragma target 3.0
        #pragma multi_compile_instancing
        sampler2D _MainTex;
        fixed4 _Color;
        half _Glossiness,_Metallic,_WeatherResponse;
        float _WeatherWetness,_CloudShadow,_WeatherTime;
        struct Input{float2 uv_MainTex;float3 worldPos;float3 worldNormal;};
        float hash(float2 p){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
        float noise(float2 p){float2 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(hash(i),hash(i+float2(1,0)),f.x),lerp(hash(i+float2(0,1)),hash(i+1),f.x),f.y);}
        void surf(Input IN,inout SurfaceOutputStandard o)
        {
            float cloud=noise(IN.worldPos.xz*.095+float2(_WeatherTime*.008,_WeatherTime*.004));
            float shadow=smoothstep(.23,.77,cloud)*_CloudShadow;
            float wet=_WeatherWetness*_WeatherResponse*saturate(IN.worldNormal.y);
            float variation=lerp(.94f,1.035f,noise(IN.worldPos.xz*1.4));
            o.Albedo=tex2D(_MainTex,IN.uv_MainTex).rgb*_Color.rgb*variation*(1-shadow*.27)*lerp(1,.73,wet);
            o.Metallic=_Metallic;
            o.Smoothness=lerp(_Glossiness,.72,wet);
            o.Occlusion=1;
            o.Alpha=1;
        }
        ENDCG
    }
    FallBack "Standard"
}
