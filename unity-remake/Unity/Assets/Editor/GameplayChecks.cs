using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using StickTD;
using UnityEditor;
using UnityEngine;

/// <summary>Synchronous state checks against the running game. Leaves a clean campaign and preserves the user's manual save.</summary>
public static class GameplayChecks
{
    static int assertions;
    static StringBuilder report;

    [MenuItem("StickTD/Run gameplay smoke checks (Play Mode)")]
    public static void RunFromMenu() { Debug.Log(Run()); }

    public static string Run()
    {
        if(!EditorApplication.isPlaying)throw new InvalidOperationException("GameplayChecks.Run requires Play Mode with the StickTD scene running.");
        var game=UnityEngine.Object.FindFirstObjectByType<GameRoot>();
        if(game==null||game.Map==null)throw new InvalidOperationException("GameplayChecks.Run could not find an initialized GameRoot.");
        bool originalPaused=game.Paused;
        bool hadSave=File.Exists(game.SavePath);
        byte[] originalSave=hadSave?File.ReadAllBytes(game.SavePath):null;
        assertions=0;report=new StringBuilder();
        try
        {
            CheckBuildAndProgression(game);
            CheckResourcesAndExpansion(game);
            CheckEnemyDeathBehaviors(game);
            CheckActiveSaveRoundTrip(game);
            return "STICKTD_GAMEPLAY_CHECKS_OK — "+assertions+" assertions\n"+report;
        }
        finally
        {
            game.NewGame();game.Paused=originalPaused;
            if(hadSave)File.WriteAllBytes(game.SavePath,originalSave);
            else if(File.Exists(game.SavePath))File.Delete(game.SavePath);
            string temporary=game.SavePath+".tmp";
            if(File.Exists(temporary))File.Delete(temporary);
        }
    }

    static void Reset(GameRoot game){game.NewGame();game.Paused=true;}
    static void Expect(bool condition,string description)
    {if(!condition)throw new Exception("Gameplay smoke check failed: "+description);assertions++;}
    static bool Near(float a,float b)=>Mathf.Abs(a-b)<.001f;
    static void Finished(string description){report.AppendLine("PASS "+description);}
    static List<Vector2Int> Grass(GameRoot game)
    {
        var spots=new List<Vector2Int>();
        for(int x=-game.Map.Radius;x<=game.Map.Radius;x++)
        for(int z=-game.Map.Radius;z<=game.Map.Radius;z++)
        {
            var tile=new Vector2Int(x,z);
            if(!game.Map.IsPath(tile)&&!game.Map.HasResource(tile))spots.Add(tile);
        }
        Expect(spots.Count>=5,"opening map provides at least five unobstructed grass build spaces");return spots;
    }
    static TowerUnit Build(GameRoot game,string id,Vector2Int tile)
    {
        int before=game.Towers.Count;game.SelectBuild(id);game.HandleTileClick(tile);
        Expect(game.Towers.Count==before+1,id+" is placed on a legal tile");
        return game.Towers[game.Towers.Count-1];
    }

    static void CheckBuildAndProgression(GameRoot game)
    {
        Reset(game);var spots=Grass(game);var road=game.Map.WorldToTile(game.Map.Path[2]);
        int gold=game.Gold;
        game.SelectBuild("Swordsman");game.HandleTileClick(road);
        Expect(game.Gold==gold&&game.Towers.Count==0,"illegal swordsman placement on road spends nothing");
        game.SelectBuild("Barricade");game.HandleTileClick(spots[0]);
        Expect(game.Gold==gold&&game.Towers.Count==0,"illegal barricade placement on grass spends nothing");
        var sword=Build(game,"Swordsman",spots[0]);
        Expect(game.Gold==gold-GameCatalog.Tower("Swordsman").Cost,"Swordsman deducts exactly its catalog cost");
        gold=game.Gold;Build(game,"Archer",spots[1]);
        Expect(game.Gold==gold-GameCatalog.Tower("Archer").Cost,"Archer deducts exactly its catalog cost");
        gold=game.Gold;Build(game,"Mage",spots[2]);
        Expect(game.Gold==gold-GameCatalog.Tower("Mage").Cost,"Mage deducts exactly its catalog cost");
        game.AwardResources(5000,100,100);game.HandleTileClick(sword.Tile);
        gold=game.Gold;int price=sword.UpgradeCost,tier=sword.Tier;float damage=sword.Damage,health=sword.MaxHP,range=sword.Range;
        game.UpgradeSelected();
        Expect(game.Gold==gold-price&&sword.Tier==tier+1,"promotion charges its displayed cost and advances tier");
        Expect(sword.Damage>damage&&sword.MaxHP>health&&sword.Range>range,"promotion improves damage, health and range");
        sword.GainXP(400);Expect(sword.Level>1&&sword.Points>=4,"battle XP levels a defender and supplies training points");
        for(int i=0;i<4;i++)game.SpendStat("strength");
        Expect(sword.Strength==4&&sword.Definition.Id=="Hammerman"&&game.IsUnlocked("Hammerman"),"STR 4 evolves a Swordsman into an unlocked Hammerman");
        for(int slot=0;slot<4;slot++)game.BuyGear(slot);
        Expect(sword.GearSlots==4&&sword.IsHero,"all four equipment slots award Hero status");
        gold=game.Gold;game.BuyGear(0);Expect(game.Gold==gold,"buying an occupied equipment slot cannot spend gold");
        game.Unlock("Sniper");var sniper=Build(game,"Sniper",spots[3]);sniper.GainXP(400);
        for(int i=0;i<8;i++)game.SpendStat("intelligence");
        Expect(sniper.Definition.Id=="Sniper","directly purchased Sniper never demotes at INT 4 or INT 8");
        game.Unlock("Paladin");var paladin=Build(game,"Paladin",spots[4]);paladin.GainXP(400);
        for(int i=0;i<4;i++)game.SpendStat("strength");
        Expect(paladin.Definition.Id=="Paladin","directly purchased Paladin never demotes at STR 4");
        Finished("legal/illegal placement, exact build costs, promotion, XP, evolution, specialist stability and Hero equipment");
    }

    static Vector2Int HarvestOne(GameRoot game)
    {
        for(int x=-game.Map.Radius;x<=game.Map.Radius;x++)
        for(int z=-game.Map.Radius;z<=game.Map.Radius;z++)
        {
            var tile=new Vector2Int(x,z);if(!game.Map.HasResource(tile))continue;
            int gold=game.Gold,wood=game.Wood,stone=game.Stone,count=game.Map.GetHarvested().Count;
            Expect(game.Map.TryHarvest(tile),"a resource tile can be harvested");
            Expect(game.Gold>gold||game.Wood>wood||game.Stone>stone,"harvesting awards an actual resource");
            Expect(!game.Map.HasResource(tile)&&game.Map.GetHarvested().Count==count+1,"harvested prop is removed and recorded");
            return tile;
        }
        throw new Exception("Gameplay smoke check failed: map has no resource to harvest");
    }
    static void CheckResourcesAndExpansion(GameRoot game)
    {
        Reset(game);var resource=HarvestOne(game);
        Reset(game);
        Expect(game.Map.GetHarvested().Count==0&&game.Map.HasResource(resource),"NewGame restores a previously harvested resource");
        Expect(game.Gold==200&&game.Wood==0&&game.Stone==0&&game.Lives==100,"NewGame resets economy and camp health");
        var spots=Grass(game);var tower=Build(game,"Archer",spots[0]);Vector3 position=tower.transform.position;
        var oldPath=new List<Vector3>(game.Map.Path);int oldRadius=game.Map.Radius;
        game.AwardResources(5000,100,100);int gold=game.Gold,wood=game.Wood,stone=game.Stone,cost=game.ExpansionCost;
        game.ExpandMap();
        Expect(game.Map.Radius==oldRadius+2,"expansion opens exactly two more tile rings");
        Expect(game.Gold==gold-cost&&game.Wood==wood-20&&game.Stone==stone-12,"expansion deducts exact gold/wood/stone costs");
        int offset=game.Map.Path.FindIndex(p=>(p-oldPath[0]).sqrMagnitude<.001f);
        Expect(offset>=0&&offset+oldPath.Count<=game.Map.Path.Count,"expanded route contains the full previous route");
        for(int i=0;i<oldPath.Count;i++)Expect((oldPath[i]-game.Map.Path[offset+i]).sqrMagnitude<.001f,"expansion preserves old route position "+i);
        Expect(game.Towers.Count==1&&tower.transform.position==position&&!game.Map.IsPath(tower.Tile),"expansion preserves the placed defender and its grass tile");
        Finished("harvest rewards, clean NewGame resources and expansion route/cost/defender preservation");
    }

    static void CheckEnemyDeathBehaviors(GameRoot game)
    {
        Reset(game);var splitter=game.SpawnEnemy("Splitter",2);splitter.TakeDamage(splitter.HP+1,null,true);
        Expect(game.Enemies.Count==2&&game.Enemies.TrueForAll(e=>e.Id=="Splitmini"),"defeated Splitter produces exactly two living mini enemies");
        Reset(game);int gold=game.Gold,kills=game.TotalKills;
        var skeleton=game.SpawnEnemy("Skeleton",3);skeleton.TakeDamage(skeleton.HP+1,null,true);
        Expect(game.Enemies.Count==1&&game.Enemies[0].Id=="Skeleton"&&game.Enemies[0].Revived,"Skeleton revives once after its first defeat");
        Expect(game.Gold==gold&&game.TotalKills==kills,"Skeleton revival does not award a premature bounty or kill");
        skeleton=game.Enemies[0];Expect(skeleton.HP>0&&skeleton.HP<skeleton.MaxHP,"revived Skeleton returns with partial health");
        int bounty=skeleton.GoldReward;skeleton.TakeDamage(skeleton.HP+1,null,true);
        Expect(game.Enemies.Count==0&&game.Gold==gold+bounty&&game.TotalKills==kills+1,"revived Skeleton dies permanently and pays one bounty");
        Finished("Splitter children and exactly one Skeleton revival with one final bounty");
    }

    static void CheckActiveSaveRoundTrip(GameRoot game)
    {
        Reset(game);game.AwardResources(5000,150,150);var tile=Grass(game)[0];var tower=Build(game,"Archer",tile);
        tower.GainXP(400);for(int i=0;i<4;i++)game.SpendStat("dexterity");
        game.UpgradeSelected();for(int slot=0;slot<4;slot++)game.BuyGear(slot);game.CycleTargeting();
        HarvestOne(game);game.ExpandMap();
        game.BuyPassive("strength");game.StartWave();game.Paused=true;
        var tank=game.SpawnEnemy("Tank",3.25f);tank.TakeDamage(7,tower,true);tank.Slow(.45f,3.5f);tank.Burn(2,4,tower);tank.Poison(3,5,tower);tank.Stun(.4f);
        CombatProjectile.Launch(game,tower,tank,"Arrow");
        var beforeTower=tower.Capture();var beforeEnemy=tank.Capture();int gold=game.Gold,wood=game.Wood,stone=game.Stone,lives=game.Lives,radius=game.Map.Radius,wave=game.Wave,remaining=game.RemainingEnemies;
        var harvested=game.Map.GetHarvested();
        game.SaveGame();Expect(File.Exists(game.SavePath),"manual save writes a file");
        var disk=JsonUtility.FromJson<RunSave>(File.ReadAllText(game.SavePath));
        Expect(disk!=null&&disk.waveActive&&disk.spawnPlan.Count>0&&disk.enemies.Count==1,"saved active wave includes pending spawns and live enemy");
        Expect(disk.projectiles.Count==1&&disk.projectiles[0].ownerIndex==0&&disk.projectiles[0].targetIndex==0,"saved projectile preserves owner and target references");
        Reset(game);game.LoadGame();
        Expect(game.WaveActive&&game.Paused&&game.Wave==wave&&game.RemainingEnemies==remaining,"load restores the active wave and pauses simulation");
        Expect(game.Gold==gold&&game.Wood==wood&&game.Stone==stone&&game.Lives==lives&&game.Map.Radius==radius,"load restores all resources, camp health and expansion");
        Expect(game.PassiveStrength==1&&game.IsUnlocked("Blowdart"),"load restores global upgrades and unlocked evolution");
        Expect(new HashSet<string>(game.Map.GetHarvested()).SetEquals(harvested),"load restores harvested map prop identities");
        Expect(game.Towers.Count==1&&game.Enemies.Count==1,"load restores exact tower and enemy counts");
        var loaded=game.Towers[0];var loadedTower=loaded.Capture();var loadedEnemy=game.Enemies[0].Capture();
        Expect(loaded.Definition.Id==beforeTower.id&&loaded.Tile==tile&&loaded.IsHero&&loaded.GearSlots==4,"load preserves evolved class, position, all gear and Hero state");
        Expect(loaded.Level==beforeTower.level&&loaded.Tier==beforeTower.tier&&loaded.Points==beforeTower.points&&loaded.Dexterity==beforeTower.dexterity&&Near(loaded.XP,beforeTower.xp)&&Near(loaded.HP,beforeTower.hp)&&loaded.TargetMode==beforeTower.targetMode,"load preserves tower progression, health, training and targeting");
        Expect(loadedEnemy.id==beforeEnemy.id&&Near(loadedEnemy.hp,beforeEnemy.hp)&&Near(loadedEnemy.progress,beforeEnemy.progress),"load preserves enemy type, health and world-distance progress");
        Expect(Near(loadedEnemy.slowTimer,beforeEnemy.slowTimer)&&Near(loadedEnemy.burnTimer,beforeEnemy.burnTimer)&&Near(loadedEnemy.poisonTimer,beforeEnemy.poisonTimer)&&Near(loadedEnemy.stunTimer,beforeEnemy.stunTimer)&&loadedEnemy.burnSource==0&&loadedEnemy.poisonSource==0,"load preserves status effects and damage ownership");
        var projectiles=UnityEngine.Object.FindObjectsByType<CombatProjectile>(FindObjectsSortMode.None);
        Expect(projectiles.Length==1,"load restores exactly one in-flight projectile without stale duplicates");
        var projectile=projectiles[0].Capture();
        Expect(projectile!=null&&projectile.ownerIndex==0&&projectile.targetIndex==0&&(projectile.position-disk.projectiles[0].position).sqrMagnitude<.001f,"restored projectile retains position, owner and target");
        Finished("active-wave save/load roundtrip for economy, map, upgrades, actors, statuses, equipment and projectiles");
    }
}
