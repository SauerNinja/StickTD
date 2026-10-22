using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace StickTD
{
    /// <summary>Every mesh is imported from the accompanying Blender source library.</summary>
    public static class AssetLibrary
    {
        static readonly Dictionary<string, GameObject> Models = new Dictionary<string, GameObject>();
        public static GameObject Spawn(string name, Vector3 position, Transform parent = null)
        {
            if (!Models.TryGetValue(name, out var prefab))
            {
                prefab = Resources.Load<GameObject>("Models/" + name);
                Models[name] = prefab;
            }
            if (!prefab)
            {
                Debug.LogError("Missing Blender asset: " + name);
                var empty = new GameObject("Missing " + name);
                empty.transform.SetParent(parent, false);
                empty.transform.position = position;
                return empty;
            }
            var instance = Object.Instantiate(prefab, position, Quaternion.identity, parent);
            instance.name = name;
            if (instance.GetComponentInChildren<Animation>() && !instance.GetComponent<ModelAnimator>())
                instance.AddComponent<ModelAnimator>();
            if (IsCharacter(name))
                instance.AddComponent<CharacterGrounding>();
            return instance;
        }

        public static bool IsCharacter(string name)
        {
            foreach (var definition in GameCatalog.Buildable) if (definition.Id == name) return true;
            foreach (var definition in GameCatalog.EnemyTypes) if (definition.Id == name) return true;
            return false;
        }

        // The native asset keeps its rig for the workshop. Fixed terrain uses a
        // shared baked Blender mesh so hundreds of tiles can batch efficiently.
        public static GameObject SpawnTerrain(string name,Vector3 position,Transform parent)
        {
            var parts=BlenderMeshCache.Get(name);
            if (parts.Count==0) return Spawn(name,position,parent);
            var root=new GameObject(name);
            root.transform.SetParent(parent,false);
            root.transform.position=position;
            foreach (var part in parts)
            {
                var obj=new GameObject("Baked Blender terrain");
                obj.transform.SetParent(root.transform,false);
                obj.AddComponent<MeshFilter>().sharedMesh=part.Mesh;
                var renderer=obj.AddComponent<MeshRenderer>();
                renderer.sharedMaterials=part.Materials;
                renderer.shadowCastingMode=ShadowCastingMode.On;
                renderer.receiveShadows=true;
            }
            return root;
        }
    }
}
