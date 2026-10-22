using UnityEngine;

namespace StickTD
{
    public class BattlefieldView : MonoBehaviour
    {
        Camera view;
        GameRoot game;
        Vector3 focus, desiredFocus;
        float zoom = 10.5f, desiredZoom = 10.5f;
        int previousRadius;
        Vector3 dragStart;
        GameObject hover;
        Vector2Int lastHover = new Vector2Int(999, 999);
        readonly Plane ground = new Plane(Vector3.up, Vector3.zero);

        void Start()
        {
            game = FindFirstObjectByType<GameRoot>();
            view = GetComponent<Camera>();
            if (!view) view = gameObject.AddComponent<Camera>();
            view.orthographic = true;
            view.orthographicSize = zoom;
            view.rect = new Rect(0.18f, 0, 0.82f, 1);
            view.clearFlags = CameraClearFlags.SolidColor;
            view.backgroundColor = new Color(0.075f, 0.13f, 0.13f);
            view.nearClipPlane = 0.1f;
            view.farClipPlane = 160;
            view.allowHDR = true;
            view.transform.rotation = Quaternion.Euler(49, -30, 0);
            view.transform.position = -(view.transform.rotation * Vector3.forward) * 34;
            if (!GetComponent<AudioListener>()) gameObject.AddComponent<AudioListener>();
        }

        void Update()
        {
            if (!game || !game.Map) return;
            if (ModelWorkshop.IsOpen) return;
            if (game.Map.Radius != previousRadius)
            {
                previousRadius = game.Map.Radius;
                desiredZoom = 3.7f + previousRadius * 1.9f;
                desiredFocus = Vector3.zero;
            }
            bool modal = GameHUD.ModalOpen;
            bool overUI = GameHUD.IsPointerOverUI();
            if (Input.GetKeyDown(KeyCode.Escape) && modal) game.GetComponent<GameHUD>()?.ToggleMenu();
            if (!modal)
            {
                if (Input.GetKeyDown(KeyCode.Space)) game.StartWave();
                if (Input.GetKeyDown(KeyCode.P)) game.TogglePause();
                if (Input.GetKeyDown(KeyCode.Tab)) game.CycleSpeed();
                if (Input.GetKeyDown(KeyCode.Alpha1)) game.SelectBuild("Swordsman");
                if (Input.GetKeyDown(KeyCode.Alpha2)) game.SelectBuild("Archer");
                if (Input.GetKeyDown(KeyCode.Alpha3)) game.SelectBuild("Mage");
                if (Input.GetKeyDown(KeyCode.Alpha4)) game.SelectBuild("Barricade");
                if (Input.GetKeyDown(KeyCode.Escape)) game.CancelSelection();
                if (Input.GetKeyDown(KeyCode.F5)) game.SaveGame();
                if (Input.GetKeyDown(KeyCode.F9)) game.LoadGame();
                if (Input.GetKeyDown(KeyCode.M)) GameAudio.ToggleMute();
                if (Input.GetKeyDown(KeyCode.V)) game.GetComponent<GameHUD>()?.CycleWeather();
                if (Input.GetKeyDown(KeyCode.F)) { desiredFocus = Vector3.zero; desiredZoom = 3.7f + previousRadius * 1.9f; }
                Vector3 movement = new Vector3(Input.GetAxisRaw("Horizontal"), 0, Input.GetAxisRaw("Vertical"));
                if (Input.GetKey(KeyCode.W)) movement.z += 1;
                if (Input.GetKey(KeyCode.S)) movement.z -= 1;
                if (Input.GetKey(KeyCode.A)) movement.x -= 1;
                if (Input.GetKey(KeyCode.D)) movement.x += 1;
                desiredFocus += movement * (Time.unscaledDeltaTime * zoom * 0.65f);
                float limit = previousRadius * GameMap.CellSize;
                desiredFocus.x = Mathf.Clamp(desiredFocus.x, -limit, limit);
                desiredFocus.z = Mathf.Clamp(desiredFocus.z, -limit, limit);
            }
            if (!modal && !overUI)
            {
                desiredZoom = Mathf.Clamp(desiredZoom - Input.mouseScrollDelta.y * 0.8f, 4.5f, 28);
                if (Input.GetMouseButtonDown(2)) dragStart = WorldPoint();
                if (Input.GetMouseButton(2)) desiredFocus += (dragStart - WorldPoint()) * 0.5f;
                if (Input.GetMouseButtonDown(1)) game.CancelSelection();
                Vector2Int tile = game.Map.WorldToTile(WorldPoint());
                if (Input.GetMouseButtonDown(0) && !game.GameOver)
                {
                    bool occupied = false;
                    foreach (var tower in game.Towers)
                        if (tower && game.Map.WorldToTile(tower.transform.position) == tile) { occupied = true; break; }
                    if (occupied || !game.Map.TryHarvest(tile)) game.HandleTileClick(tile);
                }
                if (game.Map.InBounds(tile) && !string.IsNullOrEmpty(game.BuildSelection))
                {
                    if (!hover) hover = AssetLibrary.Spawn("SelectionRing", Vector3.zero, game.Map.transform);
                    hover.SetActive(true);
                    hover.transform.position = game.Map.TilePosition(tile) + Vector3.up * 0.055f;
                    hover.transform.localScale = Vector3.one * 0.75f;
                    lastHover = tile;
                }
                else if (hover) hover.SetActive(false);
            }
            else if (hover) hover.SetActive(false);
            focus = Vector3.Lerp(focus, desiredFocus, Time.unscaledDeltaTime * 8);
            zoom = Mathf.Lerp(zoom, desiredZoom, Time.unscaledDeltaTime * 7);
            view.orthographicSize = zoom;
            view.transform.position = focus - (view.transform.rotation * Vector3.forward) * 34;
        }

        Vector3 WorldPoint()
        {
            Ray ray = view.ScreenPointToRay(Input.mousePosition);
            return ground.Raycast(ray, out float distance) ? ray.GetPoint(distance) : Vector3.zero;
        }
    }
}
