using System.Collections.Generic;
using UnityEngine;

namespace StickTD
{
    /// <summary>Bakes an imported Blender bind pose once for GPU foliage and mesh weather particles.</summary>
    public static class BlenderMeshCache
    {
        public sealed class Part { public Mesh Mesh; public Material[] Materials; }
        static readonly Dictionary<string,List<Part>> cache = new Dictionary<string,List<Part>>();
        static readonly Dictionary<string,Mesh> particleMeshes = new Dictionary<string,Mesh>();
        public static Mesh Particle(string name)
        {
            if (particleMeshes.TryGetValue(name,out var mesh)) return mesh;
            var parts=Get(name);
            if (parts.Count==0) return null;
            mesh=Object.Instantiate(parts[0].Mesh);
            mesh.name="Particle silhouette: "+name;
            var triangles=mesh.triangles;
            mesh.subMeshCount=1;
            mesh.SetTriangles(triangles,0);
            particleMeshes[name]=mesh;
            return mesh;
        }
        public static List<Part> Get(string name)
        {
            if (cache.TryGetValue(name,out var parts)) return parts;
            parts=new List<Part>();
            var prefab=Resources.Load<GameObject>("Models/"+name);
            if (!prefab) return parts;
            cache[name]=parts;
            var sample=Object.Instantiate(prefab,Vector3.zero,Quaternion.identity);
            sample.name="Blender mesh preparation: "+name;
            foreach (var animation in sample.GetComponentsInChildren<Animation>())
            {
                animation.Stop();
                foreach (AnimationState state in animation)
                    if (state.name.Contains("Idle")) { state.clip.SampleAnimation(sample,0); break; }
                animation.enabled=false;
            }
            foreach (var renderer in sample.GetComponentsInChildren<Renderer>())
            {
                Mesh mesh=null;
                if (renderer is SkinnedMeshRenderer skin)
                { mesh=new Mesh { name="Baked Blender "+name }; skin.BakeMesh(mesh); }
                else if (renderer.GetComponent<MeshFilter>())
                    mesh=Object.Instantiate(renderer.GetComponent<MeshFilter>().sharedMesh);
                if (!mesh) continue;
                var local=sample.transform.worldToLocalMatrix*renderer.transform.localToWorldMatrix;
                var vertices=mesh.vertices;
                for (int i=0;i<vertices.Length;i++) vertices[i]=local.MultiplyPoint3x4(vertices[i]);
                mesh.vertices=vertices;
                var normals=mesh.normals;
                var normalMatrix=local.inverse.transpose;
                for (int i=0;i<normals.Length;i++) normals[i]=normalMatrix.MultiplyVector(normals[i]).normalized;
                if (name=="GrassTuft" || name=="Reed")
                    for (int i=0;i<normals.Length;i++) normals[i]=Vector3.Lerp(normals[i],Vector3.up,.8f).normalized;
                mesh.normals=normals;
                mesh.RecalculateBounds();
                foreach (var material in renderer.sharedMaterials) if (material) material.enableInstancing=true;
                parts.Add(new Part { Mesh=mesh,Materials=renderer.sharedMaterials });
            }
            sample.SetActive(false); Object.Destroy(sample);
            return parts;
        }
    }
}
