Shader "StickTD/Puddle"
{
    Properties{_Color("Water tint",Color)=(.09,.20,.21,.58) _Glossiness("Smoothness",Range(0,1))=.92}
    SubShader
    {
        Tags{"Queue"="Transparent+2" "RenderType"="Transparent"}
        ZWrite Off
        Cull Off
        Offset -1,-1
        CGPROGRAM
        #pragma surface surf Standard alpha:fade fullforwardshadows
        #pragma target 3.0
        #pragma multi_compile_instancing
        fixed4 _Color;half _Glossiness;float _WeatherWetness,_WeatherTime;float4 _WeatherSkyColor;
        struct Input{float3 worldPos;float3 viewDir;};
        void surf(Input IN,inout SurfaceOutputStandard o)
        {
            float2 p=frac(IN.worldPos.xz*.64)-.5;
            float distance=length(p);
            float ripple=sin(distance*65-_WeatherTime*7)*pow(saturate(1-distance*1.8),3)*.026*_WeatherWetness;
            float fresnel=pow(1-saturate(dot(normalize(IN.viewDir),float3(0,0,1))),3);
            o.Albedo=_Color.rgb+max(0,ripple);
            o.Emission=_WeatherSkyColor.rgb*(.075+fresnel*.18)+max(0,ripple)*.3;
            o.Metallic=.15;o.Smoothness=_Glossiness;o.Alpha=_Color.a*smoothstep(.15,.7,_WeatherWetness);
        }
        ENDCG
    }
    FallBack "Transparent/Diffuse"
}
