using UnityEngine;
using UnityEngine.Rendering;

namespace StickTD
{
    /// <summary>A soft contact shadow supplements the directional light at tiny isometric scales.</summary>
    public sealed class CharacterGrounding : MonoBehaviour
    {
        static Material shadowMaterial;
        GameObject shadow;
        Renderer[] shadowRenderers;
        MaterialPropertyBlock properties;

        void Start()
        {
            var asset = Resources.Load<GameObject>("Models/ContactShadow");
            if (!asset) return;
            shadow = Instantiate(asset, transform);
            shadow.name = "Soft contact shadow";
            shadow.transform.localScale = Vector3.one * (name.Contains("Boss") || name.Contains("Boulder") ? 1.25f : .82f);
            foreach (var animation in shadow.GetComponentsInChildren<Animation>()) animation.enabled = false;
            if (!shadowMaterial)
            {
                var shader = Shader.Find("StickTD/ContactShadow");
                if (!shader) return;
                shadowMaterial = new Material(shader) { name = "Soft forest contact" };
            }
            shadowRenderers=shadow.GetComponentsInChildren<Renderer>();
            properties=new MaterialPropertyBlock();
            foreach (var renderer in shadowRenderers)
            {
                renderer.sharedMaterial = shadowMaterial;
                renderer.shadowCastingMode = ShadowCastingMode.Off;
                renderer.receiveShadows = false;
            }
        }
        void LateUpdate()
        {
            if (!shadow) return;
            Vector3 point = transform.position;
            point.y = .035f;
            shadow.transform.position = point;
            shadow.transform.rotation = Quaternion.identity;
            properties.SetVector("_ShadowCenter",new Vector4(point.x,point.z,0,0));
            properties.SetFloat("_ShadowRadius",.5f*Mathf.Max(shadow.transform.lossyScale.x,shadow.transform.lossyScale.z));
            foreach (var renderer in shadowRenderers) renderer.SetPropertyBlock(properties);
        }
    }
}
