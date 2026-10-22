using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace StickTD
{
    /// <summary>Instanced Blender foliage: thousands of wind-blown plants with a handful of draw calls.</summary>
    public sealed class MeadowVegetation : MonoBehaviour
    {
        sealed class MeshPart
        {
            public Mesh Mesh;
            public Material[] Materials;
            public Matrix4x4 Local;
        }
        sealed class PlantBatch
        {
            public string Name;
            public readonly List<Matrix4x4[]> Matrices = new List<Matrix4x4[]>();
            public MeshPart Part;
        }
        static readonly Dictionary<string,List<MeshPart>> prototypes = new Dictionary<string,List<MeshPart>>();
        readonly List<PlantBatch> batches = new List<PlantBatch>();
        public int PlantCount { get; private set; }

        public void Populate(GameMap map)
        {
            batches.Clear(); PlantCount = 0;
            var positions = new Dictionary<string,List<Matrix4x4>>();
            var random = new System.Random(8701 + map.Radius);
            int extent = map.Radius + 2;
            for (int x = -extent; x <= extent; x++)
            for (int z = -extent; z <= extent; z++)
            {
                var tile = new Vector2Int(x,z);
                bool road = map.IsPath(tile);
                int count = road ? 2 : map.InBounds(tile) ? 13 : 19;
                for (int i = 0; i < count; i++)
                {
                    float px = (float)random.NextDouble() - .5f;
                    float pz = (float)random.NextDouble() - .5f;
                    // Leave the middle of a build tile open for silhouettes and selection.
                    if (!road && map.InBounds(tile) && Mathf.Abs(px) < .23f && Mathf.Abs(pz) < .23f) continue;
                    if (road) { px = (i == 0 ? -.46f : .46f); pz *= .7f; }
                    Vector3 point = map.TilePosition(tile) + new Vector3(px * GameMap.CellSize, .015f, pz * GameMap.CellSize);
                    string kind = !road && random.NextDouble() < .06 ? "FlowerPatch" : "GrassTuft";
                    float size = (road ? .32f : .6f) + (float)random.NextDouble() * (road ? .22f : .65f);
                    Add(positions,kind,point,Quaternion.Euler(0,(float)random.NextDouble()*360,0),new Vector3(size,size*(.7f+(float)random.NextDouble()*.4f),size));
                }
                if (!road && !map.InBounds(tile) && random.NextDouble() < .3)
                {
                    string kind = random.NextDouble() < .6 ? "Fern" : "Mushroom";
                    Add(positions,kind,map.TilePosition(tile),Quaternion.Euler(0,(float)random.NextDouble()*360,0),Vector3.one*(.65f+(float)random.NextDouble()*.5f));
                }
                if (!road && random.NextDouble() < .15)
                    Add(positions,"SmallStone",map.TilePosition(tile)+new Vector3(.48f,0,.46f),Quaternion.Euler(0,random.Next(360),0),Vector3.one*(.35f+(float)random.NextDouble()*.45f));
            }
            foreach (var entry in positions)
            {
                var parts = GetPrototype(entry.Key);
                if (parts.Count == 0) continue;
                foreach (var part in parts)
                {
                    var batch = new PlantBatch { Name=entry.Key, Part=part };
                    for (int i=0;i<entry.Value.Count;i+=1023)
                    {
                        int count = Mathf.Min(1023,entry.Value.Count-i);
                        var array = new Matrix4x4[count];
                        for (int j=0;j<count;j++) array[j]=entry.Value[i+j]*part.Local;
                        batch.Matrices.Add(array);
                    }
                    batches.Add(batch);
                }
                PlantCount += entry.Value.Count;
            }
        }
        static void Add(Dictionary<string,List<Matrix4x4>> items,string name,Vector3 position,Quaternion rotation,Vector3 scale)
        {
            if (!items.TryGetValue(name,out var matrices)) { matrices=new List<Matrix4x4>(); items[name]=matrices; }
            matrices.Add(Matrix4x4.TRS(position,rotation,scale));
        }
        static List<MeshPart> GetPrototype(string name)
        {
            if (prototypes.TryGetValue(name,out var parts)) return parts;
            parts = new List<MeshPart>(); prototypes[name]=parts;
            foreach (var part in BlenderMeshCache.Get(name))
                parts.Add(new MeshPart { Mesh=part.Mesh, Materials=part.Materials, Local=Matrix4x4.identity });
            return parts;
        }
        void LateUpdate()
        {
            if (!SystemInfo.supportsInstancing) return;
            foreach (var batch in batches)
            foreach (var source in batch.Matrices)
            {
                var part=batch.Part;
                for (int sub=0;sub<part.Mesh.subMeshCount && sub<part.Materials.Length;sub++)
                {
                    var material=part.Materials[sub];
                    if (!material) continue;
                    Graphics.DrawMeshInstanced(part.Mesh,sub,material,source,source.Length,null,ShadowCastingMode.Off,true,gameObject.layer);
                }
            }
        }
    }
}
