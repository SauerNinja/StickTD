using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace StickTD
{
    public sealed class GameRoot : MonoBehaviour
    {
        public int Gold { get; private set; } = 200;
        public int Wood { get; private set; }
        public int Stone { get; private set; }
        public int Lives { get; private set; } = 100;
        public int Wave { get; private set; }
        public bool WaveActive { get; private set; }
        public bool Paused;
        public bool GameOver { get; private set; }
        public float Speed { get; private set; } = 1;
        public float Delta => Paused || GameOver ? 0 : Time.deltaTime * Speed;
        public string Message { get; private set; } = "Choose a defender, then click grass beside the road.";
        public string WaveTitle => GameCatalog.WaveName(WaveActive ? Mathf.Max(1,Wave) : Wave+1);
        public TowerUnit SelectedTower { get; private set; }
        public string BuildSelection { get; private set; } = "";
        public readonly List<TowerUnit> Towers = new List<TowerUnit>();
        public readonly List<EnemyUnit> Enemies = new List<EnemyUnit>();
        public GameMap Map { get; private set; }
        public int ExpansionCost => 90 + (Map == null ? 0 : (Map.Radius-3)*65);
        public int GearCost => 65;
        public int LifeCost => 75+lifePurchases*25;
        public bool HasSave => File.Exists(SavePath);
        public int PassiveStrength { get; private set; }
        public int PassiveDexterity { get; private set; }
        public int PassiveIntelligence { get; private set; }
        public int RemainingEnemies => Enemies.Count + Mathf.Max(0,spawnPlan.Count-spawnIndex);
        public int TotalKills { get; private set; }
        public string SavePath => Path.Combine(Application.persistentDataPath,"sticktd-save.json");
        readonly HashSet<string> unlocked = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        readonly List<string> spawnPlan = new List<string>();
        int spawnIndex,lifePurchases;
        float spawnTimer, clearTimer;

        void Start()
        {
            Map = GetComponentInChildren<GameMap>();
            if(Map==null) Map=new GameObject("Battlefield").AddComponent<GameMap>();
            Map.Initialize(this);
            NewGame();
            if(GetComponent<GameHUD>()==null) gameObject.AddComponent<GameHUD>();
        }

        public void NewGame()
        {
            if(Map==null) return;
            ClearActors();
            Gold=200;Wood=0;Stone=0;Lives=100;Wave=0;WaveActive=false;Paused=false;GameOver=false;Speed=1;
            PassiveStrength=PassiveDexterity=PassiveIntelligence=TotalKills=0;
            spawnIndex=lifePurchases=0;spawnTimer=0;clearTimer=0;spawnPlan.Clear();unlocked.Clear();
            foreach(var id in new[]{"Swordsman","Archer","Mage","Barricade"}) unlocked.Add(id);
            Map.ResetResources();Map.Rebuild(3);CancelSelection();
            Message="Choose a defender. Place fighters on grass, barricades on the road. Click trees or rocks to gather.";
        }

        void Update()
        {
            float dt=Delta;
            if(dt<=0)return;
            if(WaveActive)
            {
                spawnTimer-=dt;
                if(spawnIndex<spawnPlan.Count && spawnTimer<=0)
                {
                    SpawnEnemy(spawnPlan[spawnIndex++],0);
                    spawnTimer=Mathf.Max(.3f,.9f-Wave*.012f);
                }
                if(spawnIndex>=spawnPlan.Count && Enemies.Count==0)
                {
                    WaveActive=false;clearTimer=0;
                    int reward=30+Wave*5;
                    Gold+=reward;Wood+=8;Stone+=5;
                    foreach(var tower in Towers) { tower.Heal(tower.MaxHP*.3f); tower.GainXP(5+Wave*.5f); }
                    Message="Wave "+Wave+" cleared! +"+reward+" gold, +8 wood, +5 stone. Train your squad or expand the map.";
                    GameAudio.Play("clear");
                }
            }
            else clearTimer+=dt;
            if(SelectedTower!=null) Map.ShowRange(SelectedTower.transform.position,SelectedTower.Range);
        }

        public bool IsUnlocked(string id) => unlocked.Contains(GameCatalog.Tower(id).Id);
        public string UnlockHint(string id)
        {
            switch(GameCatalog.Tower(id).Id)
            {
                case "Hammerman":return "Swordsman: train STR to 4";
                case "Axeman":return "Swordsman: train DEX to 4";
                case "Spearman":return "Swordsman: train INT to 4";
                case "Paladin":return "Hammerman: STR 4 and INT 8";
                case "Gatling":return "Archer: train STR to 4";
                case "Blowdart":return "Archer: train DEX to 4";
                case "Bomber":return "Archer: train INT to 4";
                case "Sniper":return "Gunalinder: train INT to 12";
                case "DualSquirtGun":return "Blowdart: train DEX to 8";
                case "Gunalinder":return "Bomber: train INT to 8";
                case "Cleric":return "Mage: train INT to 4";
                default:return "Ready to build";
            }
        }
        public void Unlock(string id)
        { if(unlocked.Add(id)) Message="New class unlocked: "+GameCatalog.Tower(id).Name+"! Train and evolve your squad."; }

        public void SelectBuild(string id)
        {
            if(GameOver)return;
            var def=GameCatalog.Tower(id);
            if(!IsUnlocked(def.Id)){Message=UnlockHint(def.Id);return;}
            BuildSelection=def.Id;SelectedTower=null;Map.HideRange();
            Message="Place "+def.Name+" ("+def.Cost+" gold) "+(def.Id=="Barricade"?"on the road.":"on open grass beside the road.");
        }
        public void HandleTileClick(Vector2Int tile)
        {
            if(GameOver||!Map.InBounds(tile))return;
            foreach(var tower in Towers) if(tower.Tile==tile)
            { SelectedTower=tower;BuildSelection="";Message=tower.Definition.Name+" selected. Earn XP, spend training points and equip four items to become a Hero.";Map.ShowRange(tower.transform.position,tower.Range);return; }
            if(string.IsNullOrEmpty(BuildSelection)){CancelSelection();return;}
            var def=GameCatalog.Tower(BuildSelection);
            bool structure=def.Id=="Barricade";
            if(Map.IsPath(tile)!=structure){Message=structure?"Barricades must stand on the road.":"Defenders need grass beside the road.";return;}
            if(Gold<def.Cost){Message="You need "+def.Cost+" gold to build "+def.Name+".";return;}
            Gold-=def.Cost;
            var unit=CreateTower(def.Id,tile);SelectedTower=unit;BuildSelection="";
            GameAudio.Play("build");
            Map.ShowRange(unit.transform.position,unit.Range);
            Message=def.Name+" ready. Start the next wave when your squad is in position.";
        }
        TowerUnit CreateTower(string id,Vector2Int tile)
        {
            var holder=new GameObject(GameCatalog.Tower(id).Name);
            holder.transform.position=Map.TilePosition(tile);
            var tower=holder.AddComponent<TowerUnit>();tower.Initialize(this,id,tile);Towers.Add(tower);return tower;
        }
        public void CancelSelection(){SelectedTower=null;BuildSelection="";if(Map!=null)Map.HideRange();}
        public void StartWave()
        {
            if(WaveActive||GameOver)return;
            if(Towers.Count==0){Message="Build at least one defender before starting.";return;}
            Paused=false;Wave++;WaveActive=true;spawnIndex=0;spawnTimer=.6f;
            spawnPlan.Clear();spawnPlan.AddRange(GameCatalog.Wave(Wave,Map.Radius));
            int quickBonus=Wave>1?Mathf.Max(0,12-Mathf.FloorToInt(clearTimer)):0;
            Gold+=quickBonus;
            Message="Wave "+Wave+": "+WaveTitle+(quickBonus>0?" • +"+quickBonus+" quick-start gold":"");
            GameAudio.Play("wave");
        }
        public void TogglePause(){if(!GameOver)Paused=!Paused;}
        public void CycleSpeed(){Speed=Speed==1?2:Speed==2?3:1;}
        public void ExpandMap()
        {
            if(GameOver)return;
            if(WaveActive){Message="Clear the current wave before expanding the battlefield.";return;}
            if(Map.Radius>=9){Message="The full 19×19 battlefield is already open.";return;}
            int cost=ExpansionCost;
            if(Gold<cost||Wood<20||Stone<12){Message="Expansion costs "+cost+" gold, 20 wood and 12 stone. Click trees and rocks to gather.";return;}
            Gold-=cost;Wood-=20;Stone-=12;Map.Rebuild(Map.Radius+2);CancelSelection();
            Message="The road grows longer. New ground, resources and room for defenders!";
        }
        public void UpgradeSelected()
        {
            var t=SelectedTower;if(t==null||GameOver)return;
            if(t.Tier>=5){Message="This defender has the highest promotion tier.";return;}
            if(Gold<t.UpgradeCost){Message="Promotion costs "+t.UpgradeCost+" gold.";return;}
            int price=t.UpgradeCost;Gold-=price;t.Investment+=price;t.Promote();
            Message=t.Definition.Name+" promoted to tier "+t.Tier+". Damage, health and range improved.";
        }
        public void SellSelected()
        {
            var t=SelectedTower;if(t==null||GameOver)return;
            int value=Mathf.FloorToInt(t.Investment*.65f);Gold+=value;RemoveTower(t);Message="Defender dismissed. Refunded "+value+" gold.";
        }
        public void SpendStat(string stat)
        {
            var t=SelectedTower;if(t==null||t.Definition.Id=="Barricade"||GameOver)return;
            if(t.Points<1){Message="Earn experience in battle to gain more training points.";return;}
            string key=stat.ToLowerInvariant();
            if(key=="str"||key=="strength")t.Strength++;
            else if(key=="dex"||key=="dexterity")t.Dexterity++;
            else if(key=="int"||key=="intelligence")t.Intelligence++;
            else return;
            t.Points--;t.Heal(8);t.CheckEvolution();
        }
        public void CycleTargeting(){if(SelectedTower!=null)SelectedTower.CycleTargeting();}
        public void BuyGear(int slot)
        {
            var t=SelectedTower;if(t==null||slot<0||slot>3||GameOver||t.Definition.Id=="Barricade")return;
            if(t.Gear[slot]){Message="This equipment slot is already filled.";return;}
            if(Gold<GearCost){Message="Equipment costs "+GearCost+" gold per slot.";return;}
            Gold-=GearCost;t.Investment+=GearCost;t.Gear[slot]=true;t.Heal(t.MaxHP*.3f);
            Message=t.IsHero?t.Definition.Name+" becomes a Hero! All four items equipped; +20% damage.":"Equipment added. Fill all four slots to become a Hero.";
            t.RefreshHeroVisual();
        }
        public int PassiveCost(string stat)
        {string key=stat.ToLowerInvariant();int level=key=="strength"||key=="str"?PassiveStrength:key=="dexterity"||key=="dex"?PassiveDexterity:PassiveIntelligence;return 80+level*60;}
        public void BuyPassive(string stat)
        {
            if(GameOver)return;int cost=PassiveCost(stat);
            if(Gold<cost){Message="Squad training costs "+cost+" gold.";return;}
            string key=stat.ToLowerInvariant();
            if(key=="strength"||key=="str")PassiveStrength++;
            else if(key=="dexterity"||key=="dex")PassiveDexterity++;
            else if(key=="intelligence"||key=="int")PassiveIntelligence++;
            else return;
            Gold-=cost;Message="Squad training improved every current and future defender.";
        }
        public void BuyLife()
        {
            if(GameOver)return;if(Lives>=100){Message="The camp is already at full health.";return;}
            if(Gold<LifeCost){Message="Camp supplies cost "+LifeCost+" gold.";return;}
            Gold-=LifeCost;lifePurchases++;Lives=Mathf.Min(100,Lives+10);Message="Supplies restored 10 camp health.";
        }
        public void AwardResources(int gold,int wood,int stone)
        {if(GameOver)return;Gold+=gold;Wood+=wood;Stone+=stone;Message="Gathered "+(gold>0?gold+" gold ":"")+(wood>0?wood+" wood ":"")+(stone>0?stone+" stone":"")+".";}

        public EnemyUnit SpawnEnemy(string id,float progress,bool revived=false)
        {
            var holder=new GameObject(id);var enemy=holder.AddComponent<EnemyUnit>();
            enemy.Initialize(this,id,progress,revived);Enemies.Add(enemy);return enemy;
        }
        public void EnemyKilled(EnemyUnit enemy,TowerUnit killer)
        {
            if(!Enemies.Remove(enemy))return;
            // Skeletons get up once. A revival is not yet a paid kill.
            if(enemy.Id=="Skeleton"&&!enemy.Revived){SpawnEnemy("Skeleton",enemy.Progress,true);return;}
            Gold+=enemy.GoldReward;TotalKills++;
            float xp=4+enemy.MaxHP*.045f;
            foreach(var tower in Towers)
                if(tower!=null && tower.Definition.Id!="Barricade" && (tower==killer||Vector3.Distance(tower.transform.position,enemy.transform.position)<tower.Range+1.6f))
                    tower.GainXP(xp*(tower==killer?1.3f:.7f));
            if(killer!=null)killer.Kills++;
            if(enemy.Id=="Splitter")for(int i=0;i<2;i++)SpawnEnemy("Splitmini",Mathf.Max(0,enemy.Progress-i*.4f));
            if(enemy.Id=="Boss"||enemy.Id=="Reaper")
            {Wood+=15;Stone+=10;foreach(var t in Towers)t.GainXP(15);Message="Boss defeated! +15 wood, +10 stone and bonus squad XP.";}
        }
        public void EnemyEscaped(EnemyUnit enemy)
        {
            if(!Enemies.Remove(enemy))return;
            Lives=Mathf.Max(0,Lives-enemy.Definition.Leak);
            Message=enemy.Id+" broke through! Camp health -"+enemy.Definition.Leak+".";
            if(Lives==0){GameOver=true;Paused=false;Message="The camp has fallen. Start a new expedition to try a different defense.";}
        }
        public void RemoveTower(TowerUnit tower)
        {
            Towers.Remove(tower);if(SelectedTower==tower)CancelSelection();
            if(tower!=null){tower.gameObject.SetActive(false);Destroy(tower.gameObject);}
        }
        void ClearActors()
        {
            ModelAnimator.ClearRetired();
            foreach(var t in Towers)if(t!=null){t.gameObject.SetActive(false);Destroy(t.gameObject);}
            foreach(var e in Enemies)if(e!=null){e.gameObject.SetActive(false);Destroy(e.gameObject);}
            foreach(var effect in FindObjectsByType<CombatProjectile>(FindObjectsSortMode.None)){effect.gameObject.SetActive(false);Destroy(effect.gameObject);}
            foreach(var effect in FindObjectsByType<CombatEffect>(FindObjectsSortMode.None)){effect.gameObject.SetActive(false);Destroy(effect.gameObject);}
            Towers.Clear();Enemies.Clear();CancelSelection();
        }

        public void SaveGame()
        {
            if(Map==null)return;
            try
            {
                var data=new RunSave{version=1,gold=Gold,wood=Wood,stone=Stone,lives=Lives,wave=Wave,radius=Map.Radius,waveActive=WaveActive,paused=Paused,gameOver=GameOver,speed=Speed,
                    passiveStrength=PassiveStrength,passiveDexterity=PassiveDexterity,passiveIntelligence=PassiveIntelligence,totalKills=TotalKills,lifePurchases=lifePurchases,spawnIndex=spawnIndex,spawnTimer=spawnTimer,clearTimer=clearTimer,
                    unlocked=new List<string>(unlocked),spawnPlan=new List<string>(spawnPlan),harvested=Map.GetHarvested()};
                foreach(var t in Towers)data.towers.Add(t.Capture());
                foreach(var e in Enemies)data.enemies.Add(e.Capture());
                foreach(var p in FindObjectsByType<CombatProjectile>(FindObjectsSortMode.None)){var record=p.Capture();if(record!=null)data.projectiles.Add(record);}
                Directory.CreateDirectory(Application.persistentDataPath);
                string temp=SavePath+".tmp";File.WriteAllText(temp,JsonUtility.ToJson(data,true));File.Copy(temp,SavePath,true);File.Delete(temp);
                Message="Expedition saved. Load restores this map, squad, equipment and wave.";
            }
            catch(Exception ex){Message="Save could not be written: "+ex.Message;Debug.LogException(ex);}
        }
        public void LoadGame()
        {
            if(Map==null)return;
            if(!File.Exists(SavePath)){Message="No saved expedition yet. Use Save to create one.";return;}
            try
            {
                var d=JsonUtility.FromJson<RunSave>(File.ReadAllText(SavePath));
                if(d==null||d.version!=1||d.towers==null||d.enemies==null||d.radius<3||d.radius>9)throw new InvalidDataException("The save format is not supported.");
                ClearActors();Gold=d.gold;Wood=d.wood;Stone=d.stone;Lives=d.lives;Wave=d.wave;WaveActive=d.waveActive;Paused=true;GameOver=d.gameOver;Speed=Mathf.Clamp(d.speed,1,3);
                PassiveStrength=d.passiveStrength;PassiveDexterity=d.passiveDexterity;PassiveIntelligence=d.passiveIntelligence;TotalKills=d.totalKills;lifePurchases=d.lifePurchases;
                Map.Rebuild(d.radius);Map.RestoreHarvested(d.harvested??new List<string>());
                unlocked.Clear();foreach(var id in d.unlocked??new List<string>())unlocked.Add(id);
                foreach(var id in new[]{"Swordsman","Archer","Mage","Barricade"})unlocked.Add(id);
                foreach(var record in d.towers){var t=CreateTower(record.id,new Vector2Int(record.x,record.z));t.Restore(record);}
                foreach(var record in d.enemies){var e=SpawnEnemy(record.id,record.progress,record.revived);e.Restore(record);}
                if(d.projectiles!=null)foreach(var record in d.projectiles)CombatProjectile.Restore(this,record);
                spawnPlan.Clear();spawnPlan.AddRange(d.spawnPlan??new List<string>());spawnIndex=Mathf.Clamp(d.spawnIndex,0,spawnPlan.Count);spawnTimer=d.spawnTimer;clearTimer=d.clearTimer;
                Message="Expedition loaded and paused. Press P or Resume to continue.";
            }
            catch(Exception ex){Message="Save could not be loaded: "+ex.Message;Debug.LogException(ex);}
        }
    }

    [Serializable] public sealed class RunSave
    {
        public int version,gold,wood,stone,lives,wave,radius,passiveStrength,passiveDexterity,passiveIntelligence,totalKills,lifePurchases,spawnIndex;
        public bool waveActive,paused,gameOver;public float speed,spawnTimer,clearTimer;
        public List<string> unlocked=new List<string>(),spawnPlan=new List<string>(),harvested=new List<string>();
        public List<TowerSave> towers=new List<TowerSave>();public List<EnemySave> enemies=new List<EnemySave>();
        public List<ProjectileSave> projectiles=new List<ProjectileSave>();
    }
    [Serializable] public sealed class TowerSave
    {
        public string id,baseClass,targetMode; public int x,z,level,tier,points,strength,dexterity,intelligence,kills,investment;
        public float hp,xp,attackTimer,healTimer;public int burstShots;public bool[] gear;
    }
    [Serializable] public sealed class EnemySave
    {
        public string id;public float hp,progress,slowTimer,slowMultiplier,burnTimer,burnDps,poisonTimer,poisonDps,stunTimer,attackTimer,abilityTimer;public bool revived;
        public int burnSource=-1,poisonSource=-1;
    }
    [Serializable] public sealed class ProjectileSave
    {
        public string model;public int ownerIndex,targetIndex;public Vector3 position,destination;public float age;
    }
}
