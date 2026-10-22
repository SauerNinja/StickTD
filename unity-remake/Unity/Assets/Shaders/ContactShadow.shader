Shader "StickTD/ContactShadow"
{
    Properties { _Color ("Shadow tint", Color) = (0.025,0.055,0.065,0.28) _ShadowRadius("Radius",Float)=0.5 _ShadowCenter("Center",Vector)=(0,0,0,0) }
    SubShader
    {
        Tags { "Queue"="Transparent-10" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off
        Offset -1,-1
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            struct appdata { float4 vertex:POSITION; };
            struct v2f { float4 position:SV_POSITION; float2 local:TEXCOORD0; };
            fixed4 _Color;
            float4 _ShadowCenter; float _ShadowRadius;
            v2f vert(appdata v) { v2f o; o.position=UnityObjectToClipPos(v.vertex); o.local=(mul(unity_ObjectToWorld,v.vertex).xz-_ShadowCenter.xy)/max(.001,_ShadowRadius); return o; }
            fixed4 frag(v2f i):SV_Target
            {
                float radial = saturate(1-dot(i.local,i.local));
                return fixed4(_Color.rgb, _Color.a*radial*radial);
            }
            ENDCG
        }
    }
}
