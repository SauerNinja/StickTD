using System;
using System.Collections.Generic;
using UnityEngine;

namespace StickTD
{
    public class GameMap : MonoBehaviour
    {
        public const float CellSize = 1.6f;
        public float TileSize => CellSize;
        public int Radius { get; private set; } = 3;
        public List<Vector3> Path { get; private set; } = new List<Vector3>();
        public readonly HashSet<Vector2Int> Road = new HashSet<Vector2Int>();
        readonly Dictionary<Vector2Int, GameObject> resources = new Dictionary<Vector2Int, GameObject>();
        readonly Dictionary<Vector2Int, string> resourceKinds = new Dictionary<Vector2Int, string>();
        readonly HashSet<string> harvested = new HashSet<string>();
        Transform terrain, scenery;
        GameObject rangeRing;
        GameRoot game;

        public void Initialize(GameRoot owner) { game = owner; }
        public Vector3 TilePosition(Vector2Int tile) => new Vector3(tile.x * TileSize, 0, tile.y * TileSize);
        public Vector2Int WorldToTile(Vector3 point) => new Vector2Int(Mathf.RoundToInt(point.x / TileSize), Mathf.RoundToInt(point.z / TileSize));
        public bool IsPath(Vector2Int tile) => Road.Contains(tile);
        public bool InBounds(Vector2Int tile) => Mathf.Abs(tile.x) <= Radius && Mathf.Abs(tile.y) <= Radius;

        // The outer loop is prepended when the map grows: every old bend stays in place.
        public static List<Vector2Int> Spiral(int radius)
        {
            var list = new List<Vector2Int>();
            var cursor = new Vector2Int(-radius, -radius);
            list.Add(cursor);
            var directions = new[] { Vector2Int.right, Vector2Int.up, Vector2Int.left, Vector2Int.down };
            int length = radius * 2;
            for (int segment = 0; length > 0; segment++)
            {
                for (int i = 0; i < length; i++) { cursor += directions[segment % 4]; list.Add(cursor); }
                if (segment >= 2 && segment % 2 == 0) length -= 2;
            }
            return list;
        }

        public void Rebuild(int radius)
        {
            Radius = Mathf.Clamp(radius, 3, 9);
            if (terrain) { terrain.gameObject.SetActive(false); Destroy(terrain.gameObject); }
            if (scenery) { scenery.gameObject.SetActive(false); Destroy(scenery.gameObject); }
            terrain = new GameObject("Blender terrain tiles").transform;
            terrain.SetParent(transform);
            scenery = new GameObject("Harvestable woodland").transform;
            scenery.SetParent(transform);
            Road.Clear(); Path.Clear(); resources.Clear(); resourceKinds.Clear();
            foreach (var tile in Spiral(Radius)) { Road.Add(tile); Path.Add(TilePosition(tile)); }
            int extent = Radius + 2;
            var foundation = AssetLibrary.SpawnTerrain("Foundation", new Vector3(0, -0.18f, 0), terrain);
            foundation.transform.localScale = new Vector3((extent * 2 + 1) * TileSize, 1, (extent * 2 + 1) * TileSize);
            for (int x = -extent; x <= extent; x++)
            for (int y = -extent; y <= extent; y++)
            {
                var tile = new Vector2Int(x, y);
                var model = AssetLibrary.SpawnTerrain(IsPath(tile) ? "PathTile" : "GrassTile", TilePosition(tile), terrain);
                model.transform.localScale = new Vector3(TileSize, 1, TileSize);
                model.transform.localRotation = Quaternion.Euler(0, ((x * 13 + y * 7) & 3) * 90, 0);
                if (InBounds(tile) && !IsPath(tile) && tile != new Vector2Int(0, 0)) AddResource(tile);
            }
            var portal = AssetLibrary.Spawn("Portal", Path[0] + new Vector3(-0.3f, 0, 0), scenery);
            portal.transform.localRotation = Quaternion.Euler(0, 90, 0);
            AssetLibrary.Spawn("Core", Path[Path.Count - 1], scenery);
            // The outer woodland gives the diorama an irregular, hand-built silhouette.
            for (int i = 0; i < 30; i++)
            {
                float angle = i * 2.399963f;
                float ring = Radius * TileSize + 2.7f + (i % 3) * 0.8f;
                var point = new Vector3(Mathf.Cos(angle) * ring, -0.08f, Mathf.Sin(angle) * ring);
                var prop = AssetLibrary.Spawn(i % 5 == 0 ? "Rock" : "Tree", point, scenery);
                prop.transform.localScale = Vector3.one * (0.8f + (i % 4) * 0.16f);
                prop.transform.rotation = Quaternion.Euler(0, i * 71, 0);
            }
            AddForestDetails(extent);
            var meadow = new GameObject("Wind-swept Blender meadow").AddComponent<MeadowVegetation>();
            meadow.transform.SetParent(terrain,false);
            meadow.Populate(this);
        }

        void AddForestDetails(int extent)
        {
            var random = new System.Random(5213+Radius);
            for (int i=0;i<22;i++)
            {
                float angle = i * 2.399963f + .3f;
                float ring = Radius*TileSize+1.3f+(i%4)*.37f;
                var point = new Vector3(Mathf.Cos(angle)*ring,0,Mathf.Sin(angle)*ring);
                string kind = i%5==0 ? "Log" : i%5==1 ? "Stump" : i%5==2 ? "Mushroom" : "Fern";
                if (!Resources.Load<GameObject>("Models/"+kind)) continue;
                var detail = AssetLibrary.Spawn(kind,point,scenery);
                detail.transform.localScale = Vector3.one*(.65f+(float)random.NextDouble()*.5f);
                detail.transform.rotation = Quaternion.Euler(0,random.Next(360),0);
            }
            if (Resources.Load<GameObject>("Models/Puddle"))
                for (int i=0;i<10;i++)
                {
                    int index = 2+i*Mathf.Max(1,(Path.Count-4)/10);
                    index = Mathf.Min(index,Path.Count-2);
                    var puddle = AssetLibrary.Spawn("Puddle",Path[index]+Vector3.up*.025f,scenery);
                    puddle.transform.localScale = new Vector3(.4f+(float)random.NextDouble()*.5f,1,.5f+(float)random.NextDouble()*.4f);
                    puddle.transform.rotation = Quaternion.Euler(0,random.Next(360),0);
                }
        }

        void AddResource(Vector2Int tile)
        {
            int hash = Mathf.Abs(unchecked(tile.x * 73856093 ^ tile.y * 19349663 ^ 9851));
            // Keep central and best opening build spaces clear.
            if (hash % 100 > 32 || (Mathf.Abs(tile.x) <= 1 && Mathf.Abs(tile.y) <= 1)) return;
            string key = tile.x + "," + tile.y;
            if (harvested.Contains(key)) return;
            string type = hash % 13 == 0 ? "Chest" : hash % 3 == 0 ? "Rock" : "Tree";
            var obj = AssetLibrary.Spawn(type, TilePosition(tile), scenery);
            obj.transform.localScale = Vector3.one * (type == "Tree" ? 0.77f : 0.8f);
            obj.transform.rotation = Quaternion.Euler(0, hash % 360, 0);
            resources[tile] = obj;
            resourceKinds[tile] = type;
        }

        public bool HasResource(Vector2Int tile) => resources.ContainsKey(tile);
        public bool TryHarvest(Vector2Int tile)
        {
            if (!resources.TryGetValue(tile, out var obj)) return false;
            string kind = resourceKinds[tile];
            game.AwardResources(kind == "Chest" ? 35 : 0, kind == "Tree" ? 16 : kind == "Chest" ? 5 : 0, kind == "Rock" ? 12 : kind == "Chest" ? 5 : 0);
            harvested.Add(tile.x + "," + tile.y);
            resources.Remove(tile); resourceKinds.Remove(tile);
            Destroy(obj);
            GameAudio.Play(kind == "Rock" ? "stone" : "wood");
            return true;
        }
        public List<string> GetHarvested() => new List<string>(harvested);
        public void RestoreHarvested(List<string> ids) { harvested.Clear(); if (ids != null) foreach (string id in ids) harvested.Add(id); Rebuild(Radius); }
        public void ResetResources() { harvested.Clear(); }
        public void ShowRange(Vector3 center, float radius)
        {
            if (!rangeRing) rangeRing = AssetLibrary.Spawn("RangeRing", center, transform);
            rangeRing.SetActive(true);
            rangeRing.transform.position = center + Vector3.up * 0.06f;
            rangeRing.transform.localScale = new Vector3(radius, 1, radius);
        }
        public void HideRange() { if (rangeRing) rangeRing.SetActive(false); }
    }
}
