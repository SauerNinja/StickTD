using UnityEngine;

namespace StickTD
{
    public class WorldHealthBars : MonoBehaviour
    {
        GameRoot game;
        GUIStyle numberStyle;
        void Start() { game = GetComponent<GameRoot>(); }
        void OnGUI()
        {
            if (!game || !Camera.main || GameHUD.ModalOpen) return;
            if (numberStyle == null) numberStyle = new GUIStyle(GUI.skin.label) { fontSize = 10, alignment = TextAnchor.MiddleCenter, normal = { textColor = new Color(1, .94f, .76f) } };
            foreach (var enemy in game.Enemies)
                if (enemy && enemy.HP < enemy.MaxHP) Bar(enemy.transform.position + Vector3.up * 1.4f, enemy.HP, enemy.MaxHP, new Color(.95f, .35f, .28f), 32);
            foreach (var tower in game.Towers)
                if (tower && (tower == game.SelectedTower || tower.HP < tower.MaxHP)) Bar(tower.transform.position + Vector3.up * 1.45f, tower.HP, tower.MaxHP, new Color(.42f, .85f, .55f), 40);
        }
        void Bar(Vector3 point, float hp, float max, Color color, float width)
        {
            Vector3 screen = Camera.main.WorldToScreenPoint(point);
            if (screen.z < 0 || screen.x < Screen.width * .18f) return;
            float x = screen.x - width * .5f, y = Screen.height - screen.y;
            GUI.color = new Color(.035f, .075f, .07f, .9f);
            GUI.DrawTexture(new Rect(x - 1, y - 1, width + 2, 6), Texture2D.whiteTexture);
            GUI.color = color;
            GUI.DrawTexture(new Rect(x, y, width * Mathf.Clamp01(hp / Mathf.Max(1,max)), 4), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }
    }
}
