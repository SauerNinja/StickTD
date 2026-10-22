using System;
using System.Collections.Generic;
using UnityEngine;

namespace StickTD
{
    [Serializable]
    public sealed class TowerDefinition
    {
        public string Id, Name, Description, Family;
        public int Cost;
        public float Damage, Range, Cooldown;
        public Color Color;
        public TowerDefinition(string id, string name, string family, int cost, float damage, float range, float cooldown, Color color, string description)
        { Id=id; Name=name; Family=family; Cost=cost; Damage=damage; Range=range; Cooldown=cooldown; Color=color; Description=description; }
    }

    public sealed class EnemyDefinition
    {
        public string Id; public float Health, Speed, Armor; public int Gold, Leak;
        public EnemyDefinition(string id,float hp,float speed,int gold,float armor=0,int leak=1)
        { Id=id; Health=hp; Speed=speed; Gold=gold; Armor=armor; Leak=leak; }
    }

    public static class GameCatalog
    {
        static readonly Color steel = new Color(.8f,.88f,.95f), mint = new Color(.27f,.92f,.66f), blue = new Color(.46f,.58f,1f), amber = new Color(1f,.72f,.32f);
        public static readonly TowerDefinition[] Buildable = {
            new TowerDefinition("Swordsman","Swordsman","Swordsman",45,9,2.25f,.88f,steel,"A brave close-range fighter. Train STR for a hammer, DEX for an axe, or INT for a spear."),
            new TowerDefinition("Archer","Archer","Archer",55,7,4.4f,1.05f,mint,"Long-range arrows. Train STR for Gatling, DEX for Blowdart, or INT for Bomber."),
            new TowerDefinition("Mage","Mage","Mage",70,13,3.65f,1.6f,blue,"Frost orbs ignore armor and slow enemies. INT 4 unlocks a curse-casting, healing Cleric."),
            new TowerDefinition("Barricade","Barricade","Barricade",30,3,.95f,1.1f,amber,"Place on the road. Blocks enemies until destroyed and stuns its attackers."),
            new TowerDefinition("Hammerman","Hammerman","Swordsman",100,24,2.35f,1.45f,amber,"A heavy hammer strikes a group and stuns its target."),
            new TowerDefinition("Axeman","Axeman","Swordsman",95,15,2.6f,.78f,steel,"Fast sweeping attacks cut through nearby groups."),
            new TowerDefinition("Spearman","Spearman","Swordsman",95,19,3.15f,1.05f,mint,"A longer-reaching spear pierces armor."),
            new TowerDefinition("Paladin","Paladin","Swordsman",160,31,2.8f,1.12f,new Color(1,.88f,.42f),"Train a Hammerman's INT to 8. Holy strikes ignore armor and a healing aura protects nearby allies."),
            new TowerDefinition("Gatling","Gatling","Archer",120,5,4.5f,.2f,amber,"A stream of bullets overwhelms unarmored enemies."),
            new TowerDefinition("Blowdart","Blowdart","Archer",105,7,4.5f,.7f,mint,"Poison darts deal damage over time and bypass armor."),
            new TowerDefinition("Bomber","Bomber","Archer",125,28,4.1f,1.9f,amber,"Explosive bombs damage a wide area and burn survivors."),
            new TowerDefinition("Gunalinder","Gunalinder","Archer",140,15,4.5f,1.8f,blue,"Bomber INT 8: a revolver fires six quick shots, then reloads."),
            new TowerDefinition("Sniper","Sniper","Archer",150,65,7.1f,2.4f,steel,"Gunalinder INT 12: precise, armor-piercing shots punish heavy targets."),
            new TowerDefinition("DualSquirtGun","Dual Squirt Gun","Archer",135,8,4.3f,.32f,new Color(.33f,.86f,1f),"Blowdart DEX 8: twin water jets slow crowds and wash through their armor."),
            new TowerDefinition("Cleric","Cleric","Mage",120,10,4.2f,1.15f,new Color(1,.9f,.65f),"Curses damage enemies over time and deal fivefold damage to undead. A healing aura restores defenders.")
        };
        public static readonly EnemyDefinition[] EnemyTypes = {
            new EnemyDefinition("Grunt",27,1.1f,6), new EnemyDefinition("Swarm",12,1.55f,3),
            new EnemyDefinition("Tank",115,.7f,15,4,3),new EnemyDefinition("Runner",24,2f,6),
            new EnemyDefinition("Boss",700,.6f,95,5,10),new EnemyDefinition("Fire",65,1.05f,10,1,2),
            new EnemyDefinition("Ice",60,.95f,10,2,2),new EnemyDefinition("Splitter",62,.95f,10,1,2),
            new EnemyDefinition("Splitmini",16,1.65f,2),new EnemyDefinition("Boulder",180,.6f,22,7,4),
            new EnemyDefinition("Healer",65,.9f,14,0,2),new EnemyDefinition("Shielded",94,.9f,13,6,2),
            new EnemyDefinition("Wolf",42,1.8f,9),new EnemyDefinition("Troll",200,.63f,25,3,4),
            new EnemyDefinition("Zombie",68,.8f,11,0,2),new EnemyDefinition("Wraith",52,1.3f,12,0,2),
            new EnemyDefinition("Skeleton",39,1.25f,7,1),new EnemyDefinition("Reaper",480,.82f,70,4,7)
        };
        public static TowerDefinition Tower(string id)
        { foreach(var t in Buildable) if(string.Equals(t.Id,id,StringComparison.OrdinalIgnoreCase)) return t; return Buildable[0]; }
        public static EnemyDefinition Enemy(string id)
        { foreach(var e in EnemyTypes) if(e.Id==id) return e; return EnemyTypes[0]; }
        public static string WaveName(int n)
        {
            string[] names={"First footsteps","A quick little swarm","Shields on the road","Heavy company","The first captain","Run for the gate","Fire and frost","Split decision","The healer's escort","Stonebreaker","Teeth in the grass","The dead return","Ghost procession","Armored advance","The reaper arrives"};
            if(n<=15) return names[Mathf.Max(0,n-1)];
            string[] endless={"Endless • Iron column","Endless • Running wild","Endless • Elemental storm","Endless • Bone legion","Endless • Shattered earth","Endless • Hunting party","Endless • Reaper's court"};
            return endless[(n-16)%endless.Length];
        }
        public static List<string> Wave(int n,int radius)
        {
            var result=new List<string>();
            switch(n)
            {
                case 1: Add(result,"Grunt",8);break;
                case 2: Add(result,"Swarm",14); Add(result,"Grunt",3);break;
                case 3: Add(result,"Grunt",8);Add(result,"Shielded",3);break;
                case 4: Add(result,"Runner",6);Add(result,"Tank",4);break;
                case 5: Add(result,"Swarm",12);Add(result,"Grunt",6);Add(result,"Boss",1);break;
                case 6: Add(result,"Runner",16);Add(result,"Wolf",3);break;
                case 7: Add(result,"Fire",7);Add(result,"Ice",7);break;
                case 8: Add(result,"Swarm",10);Add(result,"Splitter",8);break;
                case 9: Add(result,"Tank",6);Add(result,"Healer",3);Add(result,"Shielded",5);break;
                case 10: Add(result,"Boulder",5);Add(result,"Tank",5);Add(result,"Boss",1);break;
                case 11: Add(result,"Runner",8);Add(result,"Wolf",8);Add(result,"Troll",2);break;
                case 12: Add(result,"Skeleton",10);Add(result,"Zombie",8);break;
                case 13: Add(result,"Wraith",10);Add(result,"Healer",4);Add(result,"Ice",5);break;
                case 14: Add(result,"Shielded",10);Add(result,"Tank",8);Add(result,"Boulder",3);break;
                case 15: Add(result,"Skeleton",12);Add(result,"Zombie",8);Add(result,"Reaper",1);break;
                default:
                    string[][] groups={new[]{"Shielded","Tank","Boss"},new[]{"Swarm","Runner","Wolf"},new[]{"Fire","Ice","Healer"},new[]{"Skeleton","Zombie","Reaper"},new[]{"Splitter","Boulder","Tank"},new[]{"Wolf","Wraith","Troll"},new[]{"Shielded","Healer","Reaper"}};
                    var group=groups[(n-16)%groups.Length]; int count=12+Mathf.Min(26,n-15)+Mathf.Max(0,radius-3)*2;
                    Add(result,group[0],count);Add(result,group[1],count/2);Add(result,group[2],(n%5==0||group[2]=="Reaper")?1:Mathf.Max(2,count/4));break;
            }
            return result;
        }
        static void Add(List<string> list,string value,int count) { for(int i=0;i<count;i++)list.Add(value); }
    }
}
