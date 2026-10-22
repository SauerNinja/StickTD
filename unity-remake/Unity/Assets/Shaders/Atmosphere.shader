Shader "Hidden/StickTD/Atmosphere"
{
    Properties{_MainTex("Source",2D)="white"{} _BloomTex("Bloom",2D)="black"{}}
    SubShader
    {
        Cull Off ZWrite Off ZTest Always
        CGINCLUDE
        #include "UnityCG.cginc"
        sampler2D _MainTex,_BloomTex;
        UNITY_DECLARE_DEPTH_TEXTURE(_CameraDepthTexture);
        float4 _MainTex_TexelSize,_Grade,_Weather;
        float4 _MistColor;
        float4x4 _InverseViewProjection;
        float hash(float2 p){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
        float noise(float2 p){float2 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(hash(i),hash(i+float2(1,0)),f.x),lerp(hash(i+float2(0,1)),hash(i+1),f.x),f.y);}
        float4 extract(v2f_img i):SV_Target
        {
            float3 col=tex2D(_MainTex,i.uv).rgb;
            float brightness=max(col.r,max(col.g,col.b));
            return float4(col*max(0,brightness-.95)/max(.01,brightness),1);
        }
        float4 blurHorizontal(v2f_img i):SV_Target
        {
            float2 d=float2(_MainTex_TexelSize.x*1.8,0);
            return tex2D(_MainTex,i.uv)*.227027+(tex2D(_MainTex,i.uv+d*1.384615)+tex2D(_MainTex,i.uv-d*1.384615))*.316216+(tex2D(_MainTex,i.uv+d*3.230769)+tex2D(_MainTex,i.uv-d*3.230769))*.070270;
        }
        float4 blurVertical(v2f_img i):SV_Target
        {
            float2 d=float2(0,_MainTex_TexelSize.y*1.8);
            return tex2D(_MainTex,i.uv)*.227027+(tex2D(_MainTex,i.uv+d*1.384615)+tex2D(_MainTex,i.uv-d*1.384615))*.316216+(tex2D(_MainTex,i.uv+d*3.230769)+tex2D(_MainTex,i.uv-d*3.230769))*.070270;
        }
        float4 composite(v2f_img i):SV_Target
        {
            float3 col=tex2D(_MainTex,i.uv).rgb;
            float2 depthUV=i.uv;
            #if UNITY_UV_STARTS_AT_TOP
                if(_MainTex_TexelSize.y<0)depthUV.y=1-depthUV.y;
            #endif
            float raw=SAMPLE_DEPTH_TEXTURE(_CameraDepthTexture,depthUV);
            float clipDepth=raw;
            #if defined(SHADER_API_GLCORE) || defined(SHADER_API_GLES) || defined(SHADER_API_GLES3)
                clipDepth=raw*2-1;
            #endif
            float4 world=mul(_InverseViewProjection,float4(depthUV*2-1,clipDepth,1));
            world.xyz/=max(.00001,world.w);
            float mistHeight=exp(-max(0,world.y-.025)*5.2);
            float drift=noise(world.xz*.27+float2(_Weather.x*.017,-_Weather.x*.011));
            drift=lerp(drift,noise(world.xz*.66-float2(_Weather.x*.024,0)),.25);
            float eyeDepth=LinearEyeDepth(raw);
            if(_Weather.w>.5)
            {
                #if UNITY_REVERSED_Z
                    eyeDepth=lerp(_ProjectionParams.z,_ProjectionParams.y,raw);
                #else
                    eyeDepth=lerp(_ProjectionParams.y,_ProjectionParams.z,raw);
                #endif
            }
            float depthMask=smoothstep(16,48,eyeDepth)*(1-step(_ProjectionParams.z*.98,eyeDepth));
            float mist=saturate(_Weather.y*mistHeight*lerp(.30,1.2,drift)*depthMask);
            col=lerp(col,_MistColor.rgb,mist);
            col+=tex2D(_BloomTex,i.uv).rgb*_Grade.w;
            col*=_Grade.x;
            float lum=dot(col,float3(.2126,.7152,.0722));
            col=lerp(lum.xxx,col,_Grade.y);
            col=(col-.18)*_Grade.z+.18;
            col*=lerp(float3(.96,1.01,1.035),float3(1.035,1.015,.97),saturate(lum));
            col=max(0,col);
            col=saturate((col*(2.51*col+.03))/(col*(2.43*col+.59)+.14));
            float2 centered=(i.uv-.5)*float2(1.1,1);
            float vignette=1-smoothstep(.13,.65,dot(centered,centered))*.13;
            col*=vignette;
            return float4(col,1);
        }
        ENDCG
        Pass{CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment extract
            #pragma target 3.0
        ENDCG}
        Pass{CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment blurHorizontal
            #pragma target 3.0
        ENDCG}
        Pass{CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment blurVertical
            #pragma target 3.0
        ENDCG}
        Pass{CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment composite
            #pragma target 3.0
        ENDCG}
    }
    Fallback Off
}
