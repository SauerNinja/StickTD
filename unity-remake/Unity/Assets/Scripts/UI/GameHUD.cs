using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace StickTD
{
    /// <summary>The entire game interface, built from resolution-independent Unity UI.</summary>
    public sealed class GameHUD : MonoBehaviour
    {
        static readonly Color Ink = new Color32(18, 38, 33, 255);
        static readonly Color Panel = new Color32(28, 51, 43, 246);
        static readonly Color Raised = new Color32(42, 66, 54, 255);
        static readonly Color Gold = new Color32(235, 190, 99, 255);
        static readonly Color Paper = new Color32(242, 235, 211, 255);
        static readonly Color Muted = new Color32(166, 183, 163, 255);
        static readonly Color Line = new Color32(76, 94, 71, 255);
        static readonly Color Red = new Color32(230, 122, 106, 255);
        static readonly Color Green = new Color32(129, 193, 132, 255);

        GameRoot game;
        Font font;
        Canvas canvas;
        RectTransform hud, title, modal, buildPage, defenderPage, campPage;
        readonly Dictionary<string, Text> labels = new Dictionary<string, Text>();
        readonly Dictionary<string, Button> buttons = new Dictionary<string, Button>();
        readonly Dictionary<string, Image> fills = new Dictionary<string, Image>();
        readonly Dictionary<string, Button> buildCards = new Dictionary<string, Button>();
        readonly Dictionary<string, Text> buildCosts = new Dictionary<string, Text>();
        readonly Dictionary<string, Text> buildStats = new Dictionary<string, Text>();
        readonly Dictionary<string, Text> buildDescriptions = new Dictionary<string, Text>();
        readonly List<TowerDefinition> baseDefinitions = new List<TowerDefinition>();
        int tab;
        bool inTitle = true, wasPausedBeforeModal;
        TowerUnit lastSelected;
        string modalKind = "";
        float nextRefresh;
        Text message, waveTitle;
        Image messagePanel;
        string previousMessage = "";
        float messageUntil;
        bool wasGameOver;
        float buildContentHeight = 794;

        public static bool ModalOpen { get; private set; }

        public static bool IsPointerOverUI()
        {
            return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
        }

        void Start()
        {
            game = GetComponent<GameRoot>();
            if (game == null) game = FindFirstObjectByType<GameRoot>();
            if (game == null) { enabled = false; return; }
            ModalOpen = true;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (EventSystem.current == null)
                new GameObject("UI Event System", typeof(EventSystem), typeof(StandaloneInputModule));
            var canvasObject = new GameObject("StickTD Interface", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasObject.transform.SetParent(transform, false);
            canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;
            hud = Rect("Game HUD", canvas.transform, 0, 0, 1920, 1080);
            Stretch(hud, 0, 0, 0, 0);
            BuildHeader();
            BuildSidebar();
            BuildFooter();
            BuildWeatherControls();
            BuildWorldMessages();
            BuildTitle();
            hud.gameObject.SetActive(false);
            game.Paused = true;
            Refresh();
        }

        void Update()
        {
            if (game == null) return;
            if (!inTitle && game.SelectedTower != lastSelected)
            {
                lastSelected = game.SelectedTower;
                if (lastSelected != null) SetTab(1);
            }
            if (!inTitle && game.GameOver && !wasGameOver)
            {
                CloseModal(false);
                ShowGameOver();
            }
            wasGameOver = game.GameOver;
            if (Time.unscaledTime < nextRefresh) return;
            nextRefresh = Time.unscaledTime + 0.12f;
            Refresh();
        }

        void BuildHeader()
        {
            var header = Box("Top command bar", hud, 18, 18, 1884, 72, Panel);
            TextAt(header, "STICK TD", 22, 4, 260, 42, 30, Gold, FontStyle.Bold);
            TextAt(header, "THE WOODLAND CAMPAIGN", 23, 46, 270, 22, 14, Muted);
            Box("Rule", header, 306, 14, 1, 44, Line);
            Resource(header, "gold", "GOLD", 338, Gold);
            Resource(header, "wood", "WOOD", 478, Muted);
            Resource(header, "stone", "STONE", 618, Muted);
            Resource(header, "lives", "LIVES", 758, Green);
            Box("Rule", header, 898, 14, 1, 44, Line);
            Label("wave", header, "WAVE  01", 926, 6, 220, 39, 26, Paper, FontStyle.Bold);
            Label("wavePhase", header, "PREPARE YOUR DEFENSE", 928, 46, 240, 22, 14, Muted);
            Label("fieldStatus", header, "READY TO DEPLOY", 1194, 23, 290, 31, 19, Gold);
            MakeButton("pause", header, "PAUSE", 1500, 14, 106, 44, () => game.TogglePause());
            MakeButton("speed", header, "1x", 1616, 14, 86, 44, () => game.CycleSpeed());
            MakeButton("menu", header, "MENU", 1712, 14, 150, 44, ShowMenu);
        }

        void Resource(Transform parent, string id, string caption, float x, Color color)
        {
            TextAt(parent, caption, x, 9, 122, 23, 14, Muted);
            Label(id, parent, "0", x, 29, 132, 39, 29, color, FontStyle.Bold);
        }

        void BuildSidebar()
        {
            var sidebar = Box("Field command", hud, 18, 108, 306, 886, Panel);
            sidebar.anchorMin = new Vector2(0, 0);
            sidebar.anchorMax = new Vector2(0, 1);
            sidebar.offsetMin = new Vector2(18, 86);
            sidebar.offsetMax = new Vector2(324, -108);
            MakeButton("tabBuild", sidebar, "BUILD", 12, 14, 94, 42, () => SetTab(0));
            MakeButton("tabDefender", sidebar, "INSPECT", 108, 14, 98, 42, () => SetTab(1), false, 16);
            MakeButton("tabCamp", sidebar, "CAMP", 208, 14, 86, 42, () => SetTab(2));
            Box("Rule", sidebar, 12, 70, 282, 1, Line);
            var scrollObject = new GameObject("Command pages", typeof(RectTransform), typeof(Image), typeof(ScrollRect));
            scrollObject.transform.SetParent(sidebar, false);
            var scrollRect = scrollObject.GetComponent<RectTransform>();
            Stretch(scrollRect, 10, 82, 10, 14);
            scrollObject.GetComponent<Image>().color = Color.clear;
            var viewport = Rect("Viewport", scrollRect, 0, 0, 286, 780);
            Stretch(viewport, 0, 0, 0, 0);
            viewport.gameObject.AddComponent<RectMask2D>();
            var content = Rect("Content", viewport, 0, 0, 286, 784);
            content.anchorMin = new Vector2(0, 1);
            content.anchorMax = new Vector2(1, 1);
            content.sizeDelta = new Vector2(0, 784);
            var scroll = scrollObject.GetComponent<ScrollRect>();
            scroll.viewport = viewport;
            scroll.content = content;
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 28;
            buildPage = Rect("Build page", content, 0, 0, 286, 784);
            defenderPage = Rect("Defender page", content, 0, 0, 286, 784);
            campPage = Rect("Camp page", content, 0, 0, 286, 784);
            BuildBuildPage();
            BuildDefenderPage();
            BuildCampPage();
            SetTab(0);
        }

        void BuildBuildPage()
        {
            TextAt(buildPage, "ASSEMBLE YOUR LINE", 7, 2, 272, 28, 20, Gold, FontStyle.Bold);
            TextAt(buildPage, "Choose a defender, then a free tile.", 7, 38, 270, 50, 19, Muted);
            string[] wanted = { "Swordsman", "Archer", "Mage", "Barricade" };
            for (int i = 0; i < wanted.Length; i++)
            {
                TowerDefinition definition = null;
                foreach (var d in GameCatalog.Buildable) if (d.Id == wanted[i]) { definition = d; break; }
                if (definition == null) continue;
                float y = 98 + i * 136;
                BuildCard(definition, i + 1, y);
            }
            Box("Hint rule", buildPage, 8, 655, 266, 1, Line);
            TextAt(buildPage, "A SMALL ARMY. A LONG ROAD.", 8, 674, 266, 25, 17, Gold, FontStyle.Bold);
            TextAt(buildPage, "Defenders gain XP and evolve. Collect timber and stone on the field to expand your territory.", 8, 714, 268, 76, 18, Muted);
            TextAt(buildPage, "SPECIALIST ROSTER", 8, 826, 268, 28, 21, Gold, FontStyle.Bold);
            int specialist = 0;
            foreach (var definition in GameCatalog.Buildable)
            {
                if (Array.IndexOf(wanted, definition.Id) >= 0) continue;
                BuildCard(definition, specialist + 5, 877 + specialist * 136);
                specialist++;
            }
            buildContentHeight = 893 + specialist * 136;
            buildPage.sizeDelta = new Vector2(286, buildContentHeight);
        }

        void BuildCard(TowerDefinition definition, int number, float y)
        {
            baseDefinitions.Add(definition);
            string id = definition.Id;
            var card = MakeButton("build_" + id, buildPage, "", 4, y, 276, 124, () => { game.SelectBuild(id); Refresh(); });
            card.GetComponent<Image>().color = Raised;
            var parent = card.transform;
            Box("Class stripe", parent, 0, 0, 4, 124, definition.Color);
            TextAt(parent, number.ToString("00"), 17, 13, 34, 24, 18, Muted);
            TextAt(parent, definition.Name.ToUpperInvariant(), 54, 11, 205, 29, definition.Name.Length > 12 ? 18 : 21, Paper, FontStyle.Bold);
            buildDescriptions[id] = TextAt(parent, ShortDescription(definition), 18, 45, 240, 41, 17, Muted);
            buildCosts[id] = TextAt(parent, definition.Cost + " G", 18, 94, 69, 21, 19, Gold, FontStyle.Bold);
            buildStats[id] = TextAt(parent, Stats(definition), 86, 95, 180, 22, 14, Paper);
            buildCards[id] = card;
        }

        static string ShortDescription(TowerDefinition definition)
        {
            switch (definition.Id)
            {
                case "Swordsman": return "Close-range fighter. Evolves through STR, DEX or INT.";
                case "Archer": return "Long-range arrows. Dexterity unlocks new ranged classes.";
                case "Mage": return "Armor-piercing frost orbs slow enemies.";
                case "Barricade": return "Road blocker. Stuns attackers until destroyed.";
                case "Hammerman": return "Heavy area strikes stun enemies.";
                case "Axeman": return "Fast sweeping attacks cut through groups.";
                case "Spearman": return "A long-reaching spear pierces armor.";
                case "Paladin": return "Holy strikes and a nearby healing aura.";
                case "Gatling": return "Rapid bullets overwhelm unarmored enemies.";
                case "Blowdart": return "Poison darts bypass armor over time.";
                case "Bomber": return "Explosions burn enemies across a wide area.";
                case "Gunalinder": return "Six rapid revolver shots, then a reload.";
                case "Sniper": return "Precise armor-piercing shots from afar.";
                case "DualSquirtGun": return "Twin water jets slow crowds of enemies.";
                case "Cleric": return "Holy bolts restore nearby defenders.";
                default: return definition.Description;
            }
        }

        static string Stats(TowerDefinition definition)
        {
            if (definition.Id == "Barricade") return "ROAD BLOCKER";
            return definition.Damage.ToString("0") + " ATK / " + definition.Range.ToString("0.0") + " R / " + definition.Cooldown.ToString("0.##") + "s";
        }

        void BuildDefenderPage()
        {
            Label("selectedName", defenderPage, "SELECT A DEFENDER", 7, 1, 272, 38, 25, Paper, FontStyle.Bold);
            Label("selectedClass", defenderPage, "Click a defender on the field.", 7, 43, 272, 43, 18, Muted);
            Label("hpText", defenderPage, "HEALTH", 7, 97, 272, 24, 16, Muted);
            Progress("hp", defenderPage, 7, 125, 270, 9, Green);
            Label("xpText", defenderPage, "EXPERIENCE", 7, 148, 272, 24, 16, Muted);
            Progress("xp", defenderPage, 7, 177, 270, 6, Gold);
            Label("selectedStats", defenderPage, "", 7, 205, 272, 54, 20, Paper);
            MakeButton("upgrade", defenderPage, "UPGRADE", 7, 280, 270, 48, () => game.UpgradeSelected(), true);
            Label("evolution", defenderPage, "", 7, 340, 270, 84, 17, Muted);
            MakeButton("target", defenderPage, "TARGET: FIRST", 7, 437, 270, 43, () => game.CycleTargeting());
            Box("Rule", defenderPage, 7, 499, 270, 1, Line);
            Label("points", defenderPage, "ATTRIBUTE POINTS  0", 7, 520, 270, 24, 18, Gold, FontStyle.Bold);
            MakeButton("strength", defenderPage, "STR +", 7, 560, 84, 44, () => game.SpendStat("strength"));
            MakeButton("dexterity", defenderPage, "DEX +", 100, 560, 84, 44, () => game.SpendStat("dexterity"));
            MakeButton("intelligence", defenderPage, "INT +", 193, 560, 84, 44, () => game.SpendStat("intelligence"));
            Label("attributes", defenderPage, "", 7, 617, 270, 60, 18, Muted);
            TextAt(defenderPage, "STR: power  /  DEX: attack speed\nINT: range and magical power", 7, 688, 270, 53, 16, Muted);
            MakeButton("sell", defenderPage, "DISMISS DEFENDER", 7, 763, 270, 44, () => game.SellSelected());
            defenderPage.sizeDelta = new Vector2(286, 834);
        }

        void BuildCampPage()
        {
            TextAt(campPage, "SUPPLY & STRATEGY", 7, 2, 272, 29, 21, Gold, FontStyle.Bold);
            Label("campTarget", campPage, "SELECT A DEFENDER FOR EQUIPMENT", 7, 49, 274, 32, 14, Muted);
            string[] gearNames = { "WEAPON", "BOOTS", "LENS", "CHARM" };
            string[] gearHints = { "+25% damage", "+18% attack speed", "+18% range", "+50% health" };
            for (int i = 0; i < 4; i++)
            {
                int slot = i;
                float y = 88 + i * 63;
                MakeButton("gear" + i, campPage, "", 7, y, 270, 53, () => game.BuyGear(slot));
                TextAt(buttons["gear" + i].transform, gearNames[i], 12, 6, 166, 23, 18, Paper, FontStyle.Bold);
                TextAt(buttons["gear" + i].transform, gearHints[i], 12, 30, 174, 18, 15, Muted);
                Label("gearPrice" + i, buttons["gear" + i].transform, "65 G", 182, 15, 78, 23, 18, Gold);
            }
            TextAt(campPage, "Four items awaken a hero: +20% damage.", 7, 351, 270, 44, 17, Muted);
            Box("Rule", campPage, 7, 409, 270, 1, Line);
            TextAt(campPage, "ARMY-WIDE TRAINING", 7, 431, 270, 24, 18, Gold, FontStyle.Bold);
            MakeButton("passiveStrength", campPage, "", 7, 472, 270, 43, () => game.BuyPassive("strength"));
            MakeButton("passiveDexterity", campPage, "", 7, 525, 270, 43, () => game.BuyPassive("dexterity"));
            MakeButton("passiveIntelligence", campPage, "", 7, 578, 270, 43, () => game.BuyPassive("intelligence"));
            MakeButton("life", campPage, "", 7, 646, 270, 45, () => game.BuyLife());
            TextAt(campPage, "EXPAND THE FRONTIER", 7, 720, 270, 24, 18, Gold, FontStyle.Bold);
            MakeButton("expand", campPage, "EXPAND TERRITORY", 7, 761, 270, 48, () => game.ExpandMap(), true);
            Label("expandHint", campPage, "Between waves only", 7, 821, 270, 42, 17, Muted);
            campPage.sizeDelta = new Vector2(286, 874);
        }

        void BuildFooter()
        {
            var footer = Box("Bottom controls", hud, 18, 1012, 1884, 50, Panel);
            footer.anchorMin = new Vector2(0, 0);
            footer.anchorMax = new Vector2(1, 0);
            footer.offsetMin = new Vector2(18, 18);
            footer.offsetMax = new Vector2(-18, 68);
            var footerHint = Label("selectionHint", footer, "Choose a defender to begin.", 19, 15, 600, 25, 15, Paper);
            footerHint.verticalOverflow = VerticalWrapMode.Truncate;
            TextAt(footer, "1-4  BUILD    SPACE  WAVE    P  PAUSE    ESC  CANCEL", 754, 15, 780, 22, 16, Muted);
            MakeButton("help", footer, "FIELD GUIDE", 1686, 7, 180, 36, ShowHelp);
            var next = MakeButton("nextWave", hud, "CALL WAVE 01   >", 1574, 924, 328, 70, StartNextWave, true);
            var nextRect = next.GetComponent<RectTransform>();
            nextRect.anchorMin = new Vector2(1, 0);
            nextRect.anchorMax = new Vector2(1, 0);
            nextRect.anchoredPosition = new Vector2(-346, 156);
            TextAt(next.transform, "SPACE", 236, 49, 77, 15, 13, Ink).alignment = TextAnchor.MiddleRight;
        }

        void BuildWorldMessages()
        {
            var toast = Box("Field message", hud, 662, 112, 920, 78, new Color32(18, 38, 33, 225));
            toast.anchorMin = new Vector2(0.5f, 1);
            toast.anchorMax = new Vector2(0.5f, 1);
            toast.anchoredPosition = new Vector2(-298, -112);
            messagePanel = toast.GetComponent<Image>();
            message = TextAt(toast, "", 22, 12, 876, 56, 22, Paper);
            message.alignment = TextAnchor.MiddleCenter;
            waveTitle = TextAt(hud, "", 630, 202, 960, 42, 25, Paper, FontStyle.Bold);
            waveTitle.alignment = TextAnchor.MiddleCenter;
            waveTitle.raycastTarget = false;
            message.raycastTarget = false;
            messagePanel.raycastTarget = false;
        }

        void BuildWeatherControls()
        {
            var controls=Rect("Weather controls",hud,354,928,518,52);
            controls.anchorMin=controls.anchorMax=new Vector2(0,0);
            controls.anchoredPosition=new Vector2(354,158);
            MakeButton("weather",controls,"GOLDEN HOUR   >",0,0,308,48,CycleWeather,false,18);
            MakeButton("weatherAuto",controls,"WEATHER: AUTO",320,0,184,48,ToggleWeatherAuto,false,16);
        }
        public void CycleWeather()
        {
            var weather=WeatherDirector.Instance;
            if (!weather) return;
            weather.SetAutoCycle(false);
            weather.SetWeather((WeatherKind)(((int)weather.CurrentWeather+1)%6));
        }
        void ToggleWeatherAuto()
        {
            var weather=WeatherDirector.Instance;
            if (weather) weather.SetAutoCycle(!weather.AutoCycle);
        }

        void BuildTitle()
        {
            title = Box("Title screen", canvas.transform, 0, 0, 1920, 1080, new Color32(13, 28, 23, 147));
            Stretch(title, 0, 0, 0, 0);
            var center = Rect("Title composition", title, 0, 0, 1200, 870);
            Center(center, 1200, 870);
            TextAt(center, "A UNITY REMAKE", 52, 32, 650, 28, 19, Gold, FontStyle.Bold);
            TextAt(center, "STICK", 43, 78, 720, 184, 154, Paper, FontStyle.Bold);
            TextAt(center, "TOWER DEFENSE", 53, 256, 710, 60, 48, Gold, FontStyle.Bold);
            Box("Title rule", center, 54, 346, 610, 2, Gold);
            TextAt(center, "A small army. An expanding frontier.\nMake every defender count.", 55, 385, 650, 108, 30, Paper);
            MakeButton("play", center, "PLAY CAMPAIGN    >", 55, 547, 540, 79, PlayNewGame, true, 28);
            MakeButton("loadTitle", center, "CONTINUE SAVED RUN", 55, 645, 540, 57, ContinueRun, false, 21);
            MakeButton("guideTitle", center, "FIELD GUIDE", 55, 720, 261, 50, ShowHelp);
            MakeButton("workshopTitle", center, "MODEL WORKSHOP", 334, 720, 261, 50, () => ModelWorkshop.Open(gameObject), false, 18);
            TextAt(center, "BLENDER-CRAFTED WORLD  /  UNITY 6", 55, 812, 730, 23, 16, Muted);
            var briefing = Box("Campaign briefing", center, 790, 112, 365, 640, Panel);
            Box("Gold edge", briefing, 0, 0, 365, 4, Gold);
            TextAt(briefing, "HOLD THE LINE", 28, 36, 310, 43, 30, Paper, FontStyle.Bold);
            TextAt(briefing, "01  PLAN", 28, 119, 310, 27, 22, Gold, FontStyle.Bold);
            TextAt(briefing, "Place your stickmen beside the road. Their weapons do the rest.", 28, 162, 310, 87, 22, Muted);
            TextAt(briefing, "02  GROW", 28, 280, 310, 27, 22, Gold, FontStyle.Bold);
            TextAt(briefing, "Gain experience, invest in attributes and equip your heroes.", 28, 323, 310, 87, 22, Muted);
            TextAt(briefing, "03  SURVIVE", 28, 441, 310, 27, 22, Gold, FontStyle.Bold);
            TextAt(briefing, "Gather resources. Expand the road. Face the next wave.", 28, 484, 310, 87, 22, Muted);
        }

        void PlayNewGame()
        {
            CloseModal(false);
            game.NewGame();
            inTitle = false;
            ModalOpen = false;
            wasGameOver = false;
            game.Paused = false;
            title.gameObject.SetActive(false);
            hud.gameObject.SetActive(true);
            lastSelected = null;
            SetTab(0);
            Refresh();
        }

        void ContinueRun()
        {
            game.LoadGame();
            inTitle = false;
            ModalOpen = false;
            game.Paused = false;
            wasGameOver = false;
            title.gameObject.SetActive(false);
            hud.gameObject.SetActive(true);
            CloseModal(false);
            Refresh();
        }

        void StartNextWave()
        {
            if (game.Paused && modal == null) game.Paused = false;
            game.StartWave();
        }

        void SetTab(int selected)
        {
            tab = selected;
            if (buildPage == null) return;
            buildPage.gameObject.SetActive(tab == 0);
            defenderPage.gameObject.SetActive(tab == 1);
            campPage.gameObject.SetActive(tab == 2);
            var content = buildPage.parent as RectTransform;
            content.sizeDelta = new Vector2(0, tab == 2 ? 874 : tab == 0 ? buildContentHeight : 834);
            content.anchoredPosition = Vector2.zero;
            foreach (string key in new[] { "tabBuild", "tabDefender", "tabCamp" }) buttons[key].GetComponent<Image>().color = Raised;
            buttons[selected == 0 ? "tabBuild" : selected == 1 ? "tabDefender" : "tabCamp"].GetComponent<Image>().color = new Color32(92, 104, 68, 255);
        }

        void Refresh()
        {
            var weather=WeatherDirector.Instance;
            if (weather)
            {
                SetButton("weather",weather.CurrentWeatherLabel+"   >",true);
                SetButton("weatherAuto",weather.AutoCycle?"WEATHER: AUTO":"WEATHER: HOLD",true);
            }
            if (game == null || hud == null) return;
            SetLabel("gold", game.Gold.ToString("N0"));
            SetLabel("wood", game.Wood.ToString("N0"));
            SetLabel("stone", game.Stone.ToString("N0"));
            SetLabel("lives", game.Lives.ToString());
            if (labels.ContainsKey("lives")) labels["lives"].color = game.Lives <= 10 ? Red : Green;
            SetLabel("wave", "WAVE  " + game.Wave.ToString("00"));
            SetLabel("wavePhase", game.WaveActive ? "DEFEND THE ROAD" : "PREPARE YOUR DEFENSE");
            SetLabel("fieldStatus", game.Paused ? "CAMPAIGN PAUSED" : game.WaveActive ? game.Enemies.Count + " HOSTILES ON THE FIELD" : "THE FIELD IS YOURS");
            SetButton("pause", game.Paused ? "RESUME" : "PAUSE", !game.GameOver);
            SetButton("speed", game.Speed.ToString("0.#") + "x", !game.GameOver);
            SetButton("loadTitle", "CONTINUE SAVED RUN", game.HasSave);
            SetButton("loadMenu", "LOAD CAMPAIGN", game.HasSave);
            SetButton("muteMenu", GameAudio.Muted ? "SOUND: OFF" : "SOUND: ON", true);
            SetButton("nextWave", game.WaveActive ? "WAVE IN PROGRESS" : "CALL WAVE " + (game.Wave + 1).ToString("00") + "   >", !game.WaveActive && !game.GameOver);
            string selectionHint = !string.IsNullOrEmpty(game.BuildSelection)
                ? "PLACING " + game.BuildSelection.ToUpperInvariant() + "  /  Click a free tile  /  Esc to cancel"
                : game.SelectedTower != null ? "Defender selected. DEFENDER to train / CAMP to equip."
                : "Click scenery to gather. Choose a build card to place a defender.";
            SetLabel("selectionHint", selectionHint);
            foreach (var d in baseDefinitions)
            {
                bool unlocked = game.IsUnlocked(d.Id);
                var card = buildCards[d.Id];
                card.interactable = unlocked && !game.GameOver;
                card.GetComponent<Image>().color = game.BuildSelection == d.Id ? new Color32(86, 95, 61, 255) : Raised;
                buildCosts[d.Id].text = unlocked ? d.Cost + " G" : "LOCKED";
                buildCosts[d.Id].color = !unlocked ? Muted : game.Gold >= d.Cost ? Gold : Red;
                buildStats[d.Id].text = unlocked ? Stats(d) : "TRAIN TO UNLOCK";
                buildDescriptions[d.Id].text = unlocked ? ShortDescription(d) : game.UnlockHint(d.Id);
            }
            TowerUnit t = game.SelectedTower;
            bool selected = t != null;
            SetLabel("selectedName", selected ? t.Definition.Name.ToUpperInvariant() : "SELECT A DEFENDER");
            SetLabel("selectedClass", selected ? (t.IsHero ? "HERO  /  " : "") + "LEVEL " + t.Level + "   /   TIER " + t.Tier + (string.IsNullOrEmpty(t.Element) ? "" : "\n" + t.Element) : "Click a defender on the field to inspect their progress.");
            SetLabel("hpText", selected ? "HEALTH   " + t.HP.ToString("0") + " / " + t.MaxHP.ToString("0") : "HEALTH");
            SetLabel("xpText", selected ? "XP   " + t.XP.ToString("0") + " / " + t.XPNeeded.ToString("0") : "EXPERIENCE");
            SetProgress("hp", selected && t.MaxHP > 0 ? t.HP / t.MaxHP : 0);
            SetProgress("xp", selected && t.XPNeeded > 0 ? t.XP / t.XPNeeded : 0);
            SetLabel("selectedStats", selected ? t.Damage.ToString("0.#") + " ATK    " + t.Range.ToString("0.0") + " RANGE\n" + t.Cooldown.ToString("0.00") + "s ATTACK    " + t.Kills + " KILLS" : "Your defenders gain XP in battle.");
            SetButton("upgrade", selected ? t.Tier >= 5 ? "HIGHEST TIER" : "UPGRADE    " + t.UpgradeCost + " G" : "UPGRADE", selected && t.Tier < 5 && !game.GameOver && game.Gold >= t.UpgradeCost);
            SetLabel("evolution", selected ? (string.IsNullOrEmpty(t.NextEvolution) ? "Final evolution reached." : "NEXT EVOLUTION\n" + t.NextEvolution) : "Select a defender to see their evolution.");
            SetButton("target", selected ? "TARGET: " + t.TargetMode.ToUpperInvariant() + "  >" : "TARGET PRIORITY", selected);
            SetLabel("points", "ATTRIBUTE POINTS  " + (selected ? t.Points.ToString() : "0"));
            bool canTrain = selected && t.Points > 0 && t.Definition.Id != "Barricade";
            SetButton("strength", "STR +", canTrain);
            SetButton("dexterity", "DEX +", canTrain);
            SetButton("intelligence", "INT +", canTrain);
            SetLabel("attributes", selected ? "STRENGTH " + t.Strength + "    DEXTERITY " + t.Dexterity + "\nINTELLIGENCE " + t.Intelligence + "    GEAR " + t.GearSlots + "/4" : "Place a defender to start building your army.");
            SetButton("sell", selected ? "DISMISS    +" + Mathf.FloorToInt(t.Investment * .65f) + " G" : "DISMISS DEFENDER", selected && !game.GameOver);
            SetLabel("campTarget", selected ? "OUTFITTING: " + t.Definition.Name.ToUpperInvariant() : "SELECT A DEFENDER FOR EQUIPMENT");
            for (int i = 0; i < 4; i++)
            {
                bool owned = selected && t.Gear != null && t.Gear.Length > i && t.Gear[i];
                SetLabel("gearPrice" + i, owned ? "EQUIPPED" : game.GearCost + " G");
                labels["gearPrice" + i].fontSize = owned ? 13 : 18;
                buttons["gear" + i].interactable = selected && t.Definition.Id != "Barricade" && !owned && game.Gold >= game.GearCost && !game.GameOver;
            }
            int strengthCost = game.PassiveCost("strength"), dexCost = game.PassiveCost("dexterity"), intCost = game.PassiveCost("intelligence");
            SetButton("passiveStrength", "+8% POWER      " + strengthCost + " G", game.Gold >= strengthCost && !game.GameOver);
            SetButton("passiveDexterity", "+6% SPEED      " + dexCost + " G", game.Gold >= dexCost && !game.GameOver);
            SetButton("passiveIntelligence", "+5% RANGE      " + intCost + " G", game.Gold >= intCost && !game.GameOver);
            SetButton("life", "+10 LIVES      " + game.LifeCost + " G", game.Gold >= game.LifeCost && game.Lives < 100 && !game.GameOver);
            bool fullMap = game.Map != null && game.Map.Radius >= 9;
            SetButton("expand", fullMap ? "FRONTIER COMPLETE" : "EXPAND    " + game.ExpansionCost + " G", !fullMap && !game.WaveActive && !game.GameOver && game.Gold >= game.ExpansionCost && game.Wood >= 20 && game.Stone >= 12);
            SetLabel("expandHint", fullMap ? "The full 19 x 19 field is open." : "20 WOOD  /  12 STONE\n" + (game.WaveActive ? "Clear the wave to expand." : "New road. New resources."));
            string currentMessage = game.Message ?? "";
            if (currentMessage != previousMessage)
            {
                previousMessage = currentMessage;
                messageUntil = Time.unscaledTime + 5;
            }
            bool showMessage = currentMessage.Length > 0 && Time.unscaledTime < messageUntil;
            messagePanel.gameObject.SetActive(showMessage);
            message.text = currentMessage;
            waveTitle.text = (game.WaveActive ? "NOW DEFENDING  /  " : "UP NEXT  /  ") + (game.WaveTitle ?? "").ToUpperInvariant();
        }

        public void ToggleMenu()
        {
            if (inTitle) return;
            if (modal != null) CloseModal(true); else ShowMenu();
        }

        void ShowMenu()
        {
            var panel = BeginModal("menu", "CAMPAIGN PAUSED", "Take a breath. The line can wait.", 690, 728);
            MakeButton("resumeMenu", panel, "RETURN TO THE FIELD", 50, 166, 590, 64, () => CloseModal(true), true, 24);
            MakeButton("saveMenu", panel, "SAVE CAMPAIGN", 50, 250, 284, 54, () => { game.SaveGame(); CloseModal(true); });
            MakeButton("loadMenu", panel, "LOAD CAMPAIGN", 354, 250, 286, 54, () => { game.LoadGame(); CloseModal(true); });
            MakeButton("guideMenu", panel, "FIELD GUIDE", 50, 326, 284, 54, ShowHelp);
            MakeButton("muteMenu", panel, GameAudio.Muted ? "SOUND: OFF" : "SOUND: ON", 354, 326, 286, 54, () => { GameAudio.ToggleMute(); Refresh(); });
            MakeButton("restartMenu", panel, "START A NEW CAMPAIGN", 50, 402, 590, 54, ConfirmNewGame);
            MakeButton("titleMenu", panel, "RETURN TO TITLE", 50, 478, 590, 54, ReturnToTitle);
            MakeButton("workshopMenu", panel, "MODEL WORKSHOP", 50, 542, 590, 42, () => ModelWorkshop.Open(gameObject), false, 18);
            TextAt(panel, "F5  SAVE     F9  LOAD     TAB  SPEED\nP  PAUSE     ESC  CLOSE", 50, 605, 590, 72, 20, Muted).alignment = TextAnchor.MiddleCenter;
        }

        void ShowHelp()
        {
            var panel = BeginModal("help", "FIELD GUIDE", "A few good defenders can change everything.", 1160, 844);
            GuideColumn(panel, "01  BUILD YOUR LINE", "Choose a build card (1-4), then click a free tile beside the road. Barricades can be placed on the road to hold enemies in place.", 48, 175);
            GuideColumn(panel, "02  GROW YOUR DEFENDERS", "Click a defender to inspect them. Kills earn XP. Spend attribute points, upgrade their class and equip all four items to awaken a hero.", 603, 175);
            GuideColumn(panel, "03  GATHER & EXPAND", "Click trees, rocks and chests to collect resources. Use the Camp tab to train your entire army and expand between waves.", 48, 395);
            GuideColumn(panel, "04  KEEP THE ROAD SAFE", "Call the next wave when you are ready. Survive each assault, protect your remaining lives and build for tougher enemies ahead.", 603, 395);
            Box("Rule", panel, 48, 619, 1064, 1, Line);
            TextAt(panel, "1-4  BUILD    SPACE  NEXT WAVE    P  PAUSE    TAB  SPEED\nF5  SAVE    F9  LOAD    ESC  CANCEL / MENU    MOUSE WHEEL  ZOOM", 48, 644, 1064, 76, 20, Muted).alignment = TextAnchor.MiddleCenter;
            MakeButton("closeHelp", panel, "GOT IT", 380, 748, 400, 56, () => { bool fromTitle = inTitle; CloseModal(true); if (fromTitle) game.Paused = true; }, true, 23);
        }

        void GuideColumn(Transform parent, string heading, string body, float x, float y)
        {
            TextAt(parent, heading, x, y, 508, 35, 24, Gold, FontStyle.Bold);
            TextAt(parent, body, x, y + 57, 508, 142, 23, Paper);
        }

        void ConfirmNewGame()
        {
            var panel = BeginModal("confirm", "A NEW CAMPAIGN?", "Your current field will be replaced.\nSave your run from the pause menu to keep it.", 740, 444);
            MakeButton("cancelNew", panel, "KEEP DEFENDING", 48, 321, 308, 63, ShowMenu);
            MakeButton("confirmNew", panel, "NEW CAMPAIGN", 380, 321, 310, 63, PlayNewGame, true, 22);
        }

        void ShowGameOver()
        {
            var panel = BeginModal("gameover", "THE LINE HAS FALLEN", "Every campaign leaves a story. Build a stronger line.", 880, 669);
            TextAt(panel, "WAVE " + game.Wave.ToString("00"), 55, 190, 770, 79, 67, Gold, FontStyle.Bold).alignment = TextAnchor.MiddleCenter;
            int kills = game.TotalKills;
            TextAt(panel, kills + " ENEMIES DEFEATED    /    " + game.Towers.Count + " DEFENDERS", 55, 301, 770, 46, 22, Muted).alignment = TextAnchor.MiddleCenter;
            MakeButton("retry", panel, "TRY AGAIN", 55, 402, 770, 67, PlayNewGame, true, 27);
            MakeButton("endTitle", panel, "RETURN TO TITLE", 55, 491, 770, 54, ReturnToTitle);
            TextAt(panel, "The forest remembers.", 55, 581, 770, 32, 20, Muted).alignment = TextAnchor.MiddleCenter;
        }

        void ReturnToTitle()
        {
            CloseModal(false);
            inTitle = true;
            ModalOpen = true;
            game.Paused = true;
            title.gameObject.SetActive(true);
            hud.gameObject.SetActive(false);
        }

        RectTransform BeginModal(string kind, string heading, string subtitle, float width, float height)
        {
            if (modal == null) wasPausedBeforeModal = game.Paused;
            else Destroy(modal.gameObject);
            game.Paused = true;
            modalKind = kind;
            ModalOpen = true;
            modal = Box("Modal " + kind, canvas.transform, 0, 0, 1920, 1080, new Color32(9, 22, 18, 219));
            Stretch(modal, 0, 0, 0, 0);
            var panel = Box("Paper panel", modal, 0, 0, width, height, Panel);
            Center(panel, width, height);
            Box("Accent", panel, 0, 0, width, 5, Gold);
            TextAt(panel, heading, 48, 46, width - 96, 58, 38, Paper, FontStyle.Bold);
            TextAt(panel, subtitle, 48, 116, width - 96, 85, 23, Muted);
            return panel;
        }

        void CloseModal(bool restorePause)
        {
            if (modal == null) return;
            Destroy(modal.gameObject);
            modal = null;
            modalKind = "";
            ModalOpen = inTitle;
            if (restorePause && !game.GameOver) game.Paused = wasPausedBeforeModal;
        }

        RectTransform Rect(string name, Transform parent, float x, float y, float w, float h)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(0, 1);
            rect.pivot = new Vector2(0, 1);
            rect.anchoredPosition = new Vector2(x, -y);
            rect.sizeDelta = new Vector2(w, h);
            return rect;
        }

        RectTransform Box(string name, Transform parent, float x, float y, float w, float h, Color color)
        {
            var rect = Rect(name, parent, x, y, w, h);
            rect.gameObject.AddComponent<Image>().color = color;
            return rect;
        }

        Text TextAt(Transform parent, string value, float x, float y, float w, float h, int size, Color color, FontStyle style = FontStyle.Normal)
        {
            var rect = Rect(value.Length > 24 ? value.Substring(0, 24) : value, parent, x, y, w, h);
            var text = rect.gameObject.AddComponent<Text>();
            text.font = font;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = color;
            text.text = value;
            text.alignment = TextAnchor.UpperLeft;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            text.supportRichText = true;
            return text;
        }

        Text Label(string id, Transform parent, string value, float x, float y, float w, float h, int size, Color color, FontStyle style = FontStyle.Normal)
        {
            var text = TextAt(parent, value, x, y, w, h, size, color, style);
            labels[id] = text;
            return text;
        }

        Button MakeButton(string id, Transform parent, string value, float x, float y, float w, float h, UnityEngine.Events.UnityAction action, bool primary = false, int fontSize = 19)
        {
            var rect = Box(id, parent, x, y, w, h, primary ? Gold : Raised);
            var button = rect.gameObject.AddComponent<Button>();
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color32(227, 239, 195, 255);
            colors.pressedColor = new Color32(169, 189, 143, 255);
            colors.selectedColor = Color.white;
            colors.disabledColor = new Color32(117, 133, 117, 210);
            colors.colorMultiplier = 1;
            colors.fadeDuration = 0.08f;
            button.colors = colors;
            button.targetGraphic = rect.GetComponent<Image>();
            button.navigation = new Navigation { mode = Navigation.Mode.None };
            button.onClick.AddListener(action);
            var label = TextAt(rect, value, 8, 0, w - 16, h, fontSize, primary ? Ink : Paper, FontStyle.Bold);
            label.alignment = TextAnchor.MiddleCenter;
            labels["button_" + id] = label;
            buttons[id] = button;
            return button;
        }

        void Progress(string id, Transform parent, float x, float y, float width, float height, Color color)
        {
            var track = Box(id + " track", parent, x, y, width, height, new Color32(13, 30, 25, 255));
            var fill = Box(id + " fill", track, 0, 0, width, height, color).GetComponent<Image>();
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Horizontal;
            fill.fillOrigin = 0;
            fill.fillAmount = 0;
            fills[id] = fill;
            Stretch(fill.rectTransform, 0, 0, 0, 0);
            fill.type = Image.Type.Simple;
        }

        void SetProgress(string id, float amount)
        {
            var rect = fills[id].rectTransform;
            rect.anchorMax = new Vector2(Mathf.Clamp01(amount), 1);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        void SetLabel(string id, string value)
        {
            Text text;
            if (labels.TryGetValue(id, out text) && text != null && text.text != value) text.text = value;
        }

        void SetButton(string id, string value, bool interactable)
        {
            Button button;
            if (!buttons.TryGetValue(id, out button) || button == null) return;
            button.interactable = interactable;
            SetLabel("button_" + id, value);
        }

        static void Stretch(RectTransform rect, float left, float top, float right, float bottom)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(left, bottom);
            rect.offsetMax = new Vector2(-right, -top);
        }

        static void Center(RectTransform rect, float width, float height)
        {
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(width, height);
        }
    }
}
