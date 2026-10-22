using UnityEngine;

namespace StickTD
{
    [RequireComponent(typeof(Camera))]
    public sealed class AtmospherePostEffect : MonoBehaviour
    {
        public Color FogColor=new Color(.3f,.4f,.36f);
        public float HeightMist=.035f,WeatherTime,Exposure=1.05f,Saturation=1.12f,Contrast=1.08f,Bloom=.18f,Lightning;
        Material material;
        Camera view;
        void OnEnable()
        {
            view=GetComponent<Camera>();view.depthTextureMode|=DepthTextureMode.Depth;
            var shader=Shader.Find("Hidden/StickTD/Atmosphere");
            if(shader&&shader.isSupported){material=new Material(shader);material.hideFlags=HideFlags.HideAndDontSave;}
        }
        void OnRenderImage(RenderTexture source,RenderTexture destination)
        {
            if(!material){Graphics.Blit(source,destination);return;}
            material.SetVector("_Grade",new Vector4(Exposure,Saturation,Contrast,Bloom));
            material.SetColor("_MistColor",FogColor);
            material.SetVector("_Weather",new Vector4(WeatherTime,HeightMist,Lightning,view.orthographic?1:0));
            material.SetMatrix("_InverseViewProjection",(GL.GetGPUProjectionMatrix(view.projectionMatrix,true)*view.worldToCameraMatrix).inverse);
            int width=Mathf.Max(8,source.width/4),height=Mathf.Max(8,source.height/4);
            var a=RenderTexture.GetTemporary(width,height,0,RenderTextureFormat.DefaultHDR);
            var b=RenderTexture.GetTemporary(width,height,0,RenderTextureFormat.DefaultHDR);
            a.filterMode=b.filterMode=FilterMode.Bilinear;
            Graphics.Blit(source,a,material,0);
            Graphics.Blit(a,b,material,1);
            Graphics.Blit(b,a,material,2);
            material.SetTexture("_BloomTex",a);
            Graphics.Blit(source,destination,material,3);
            RenderTexture.ReleaseTemporary(a);RenderTexture.ReleaseTemporary(b);
        }
        void OnDisable(){if(material)DestroyImmediate(material);material=null;}
    }
}
