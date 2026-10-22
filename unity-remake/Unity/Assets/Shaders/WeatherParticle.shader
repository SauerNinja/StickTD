Shader "StickTD/WeatherParticle"
{
    Properties{_Color("Tint",Color)=(.75,.85,.9,.4) _Brightness("Brightness",Float)=1}
    SubShader
    {
        Tags{"Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True"}
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "UnityCG.cginc"
            fixed4 _Color;float _Brightness,_ParticleGroundY;
            struct appdata{float4 vertex:POSITION;fixed4 color:COLOR;};
            struct v2f{float4 pos:SV_POSITION;fixed4 color:COLOR;float3 world:TEXCOORD0;UNITY_FOG_COORDS(1)};
            v2f vert(appdata v){v2f o;o.pos=UnityObjectToClipPos(v.vertex);o.world=mul(unity_ObjectToWorld,v.vertex).xyz;o.color=v.color*_Color;UNITY_TRANSFER_FOG(o,o.pos);return o;}
            fixed4 frag(v2f i):SV_Target{clip(i.world.y-_ParticleGroundY);fixed4 c=i.color;c.rgb*=_Brightness;UNITY_APPLY_FOG(i.fogCoord,c);return c;}
            ENDCG
        }
    }
}
