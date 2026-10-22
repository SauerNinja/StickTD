using UnityEngine;

namespace StickTD
{
    public sealed class TowerUnit : MonoBehaviour
    {
        public TowerDefinition Definition { get; private set; }
        public Vector2Int Tile { get; private set; }
        public string BaseClass { get; private set; }
        public int Level { get; private set; } = 1;
        public int Tier { get; private set; } = 1;
        public float XP { get; private set; }
        public float XPNeeded => 10+Level*5;
        public int Points = 1;
        public int Strength, Dexterity, Intelligence, Kills, Investment;
        public float HP { get; private set; }
        public string TargetMode { get; private set; } = "First";
        public bool[] Gear = new bool[4];
        public int GearSlots { get {int count=0;foreach(bool item in Gear)if(item)count++;return count;} }
        public bool IsHero => GearSlots==4;
        public float MaxHP => (Definition.Id=="Barricade"?150+Tier*35:65+Definition.Cost*.35f+Strength*8+Tier*20)*(Gear[3]?1.5f:1);
        public float Damage => Definition.Damage*(1+(Tier-1)*.28f)*(1+Strength*.07f+(BaseClass=="Archer"?Dexterity*.045f:BaseClass=="Mage"?Intelligence*.06f:0))*(1+game.PassiveStrength*.08f)*(Gear[0]?1.25f:1)*(IsHero?1.2f:1);
        public float Range => Definition.Range*(1+game.PassiveIntelligence*.05f)*(Gear[2]?1.18f:1)+Intelligence*.045f+(Tier-1)*.08f;
        public float Cooldown => Mathf.Max(.07f,Definition.Cooldown/(1+Dexterity*.045f+game.PassiveDexterity*.06f)/(Gear[1]?1.18f:1));
        public int UpgradeCost => Mathf.RoundToInt(Definition.Cost*.65f+Tier*38);
        public string Element
        {
            get
            {
                bool a=Strength>=4,b=Dexterity>=4,c=Intelligence>=4;
                if(a&&b&&c)return "Celestial";
                if(a&&b)return "Proton";if(a&&c)return "Dark Matter";if(b&&c)return "Quasar";
                return a?"Fire":b?"Lightning":c?"Ice":"Unattuned";
            }
        }
        public string NextEvolution
        {
            get
            {
                if(Definition.Id=="Paladin"||Definition.Id=="Sniper"||Definition.Id=="DualSquirtGun"||Definition.Id=="Gatling"||Definition.Id=="Cleric"||Definition.Id=="Axeman"||Definition.Id=="Spearman")return "";
                if(Definition.Id=="Gunalinder")return "INT 12 → Sniper";
                if(Definition.Id=="Bomber")return "INT 8 → Gunalinder → INT 12 Sniper";
                if(Definition.Id=="Blowdart")return "DEX 8 → Dual Squirt Gun";
                if(Definition.Id=="Hammerman")return "STR 4 + INT 8 → Paladin";
                if(BaseClass=="Swordsman")return Strength>=4?"Hammerman + INT 8 → Paladin":"STR 4 → Hammer • DEX 4 → Axe • INT 4 → Spear";
                if(BaseClass=="Archer")return "STR 4 Gatling • DEX 4/8 Dart/Water • INT 4/8/12 Bomb/Revolver/Sniper";
                if(BaseClass=="Mage")return "INT 4 → Cleric: curses, undead damage and healing";
                return "Upgrade to increase barricade durability";
            }
        }
        GameRoot game;
        Transform visual;
        ModelAnimator visualAnimator;
        GameObject crown;
        float attackTimer,healTimer,attackPose,phase;
        int burstShots;

        public void Initialize(GameRoot owner,string id,Vector2Int tile)
        {
            game=owner;Definition=GameCatalog.Tower(id);BaseClass=Definition.Family;Tile=tile;Investment=Definition.Cost;
            phase=UnityEngine.Random.value*6.28f;attackTimer=.15f+UnityEngine.Random.value*.2f;
            if(id=="Barricade")Points=0;
            RebuildVisual();HP=MaxHP;
        }
        void RebuildVisual()
        {
            if(visual!=null)Destroy(visual.gameObject);
            var model=AssetLibrary.Spawn(Definition.Id,transform.position,transform);
            if(model!=null)
            {
                visual=model.transform;visual.localPosition=Vector3.zero;
                visualAnimator=model.GetComponent<ModelAnimator>();if(visualAnimator==null)visualAnimator=model.AddComponent<ModelAnimator>();
                visualAnimator.Bind(game);visualAnimator.Idle();
            }
            RefreshHeroVisual();
        }
        public void RefreshHeroVisual()
        {
            if(crown!=null)Destroy(crown);
            if(IsHero)
            {
                crown=AssetLibrary.Spawn("HeroCrown",transform.position+Vector3.up*1.28f,transform);
                var head=visualAnimator!=null?visualAnimator.GetBone("Head"):null;
                if(head!=null){crown.transform.SetParent(head,true);crown.transform.localPosition=new Vector3(0,.19f,0);crown.transform.localRotation=Quaternion.identity;}
            }
        }
        void Update()
        {
            if(game==null||HP<=0)return;
            float dt=game.Delta;if(dt<=0)return;
            attackPose=Mathf.Max(0,attackPose-dt*4);
            if(visual!=null && Definition.Id!="Barricade" && (visualAnimator==null||!visualAnimator.HasClips))
            {
                visual.localPosition=Vector3.up*(Mathf.Sin(Time.time*3+phase)*.025f);
                Vector3 angle=visual.localEulerAngles;angle.x=attackPose*18;visual.localEulerAngles=angle;
            }
            if(!game.WaveActive){Heal(MaxHP*.025f*dt);return;}
            healTimer-=dt;
            if((Definition.Id=="Cleric"||Definition.Id=="Paladin")&&healTimer<=0)
            {
                healTimer=1.2f;
                if(visualAnimator!=null)visualAnimator.Special();
                foreach(var ally in game.Towers)
                    if(ally!=null&&Vector3.Distance(transform.position,ally.transform.position)<Range)
                        ally.Heal((Definition.Id=="Cleric"?9:5)+Intelligence*.7f);
            }
            attackTimer-=dt;if(attackTimer>0)return;
            var target=FindTarget();if(target==null)return;
            attackTimer=Cooldown;attackPose=1;
            if(Definition.Id=="Gunalinder"){burstShots++;if(burstShots<6)attackTimer=.14f;else burstShots=0;}
            if(visual!=null)
            {
                Vector3 direction=target.transform.position-transform.position;direction.y=0;
                if(direction.sqrMagnitude>.01f)visual.rotation=Quaternion.LookRotation(direction.normalized);
            }
            if(visualAnimator!=null)visualAnimator.Attack(Mathf.Clamp(.65f/Cooldown,.8f,3));
            bool melee=BaseClass=="Swordsman"||Definition.Id=="Barricade";
            if(melee)
            {ResolveHit(target,target.transform.position);GameAudio.Play("hit");}
            else
            {
                string projectile=Definition.Id=="Bomber"?"Bomb":BaseClass=="Mage"?"Orb":Definition.Id=="Gatling"||Definition.Id=="Gunalinder"||Definition.Id=="Sniper"||Definition.Id=="DualSquirtGun"?"Bullet":"Arrow";
                CombatProjectile.Launch(game,this,target,projectile);
                GameAudio.Play(BaseClass=="Mage"?"magic":"arrow");
            }
        }
        EnemyUnit FindTarget()
        {
            EnemyUnit selected=null;float best=float.NegativeInfinity;float range2=Range*Range;
            foreach(var e in game.Enemies)
            {
                if(e==null||!e.Alive)continue;
                float d=(e.transform.position-transform.position).sqrMagnitude;if(d>range2)continue;
                float score=TargetMode=="Strong"?e.HP:TargetMode=="Last"?-e.Progress:TargetMode=="Near"?-d:e.Progress;
                if(score>best){best=score;selected=e;}
            }
            return selected;
        }
        public void CycleTargeting()
        {TargetMode=TargetMode=="First"?"Strong":TargetMode=="Strong"?"Last":TargetMode=="Last"?"Near":"First";}
        public void ResolveHit(EnemyUnit target,Vector3 impact)
        {
            if(this==null||game==null)return;
            string id=Definition.Id;
            bool piercing=BaseClass=="Mage"||id=="Spearman"||id=="Paladin"||id=="Sniper"||id=="DualSquirtGun";
            float hit=Damage;
            if(id=="Sniper"&&target!=null&&target.HP>target.MaxHP*.8f)hit*=1.5f;
            if(id=="Cleric"&&target!=null&&(target.Id=="Zombie"||target.Id=="Skeleton"||target.Id=="Wraith"||target.Id=="Reaper"))hit*=5;
            if(target!=null&&target.Alive)
            {
                target.TakeDamage(hit,this,piercing);
                if(target.Alive)
                {
                    if(BaseClass=="Mage"||id=="DualSquirtGun"||Intelligence>=4)target.Slow(id=="DualSquirtGun"?.45f:.7f,1.4f);
                    if(id=="Hammerman"||id=="Barricade")target.Stun(id=="Hammerman"?.6f:.3f);
                    if(id=="Blowdart")target.Poison(hit*.35f,4,this);
                    if(id=="Cleric")target.Poison(hit*.5f,3,this);
                    if(Strength>=4||id=="Bomber")target.Burn(hit*.18f,2.8f,this);
                    if(Dexterity>=4)target.Stun(.09f);
                }
            }
            if(id=="Axeman"||id=="Hammerman"||id=="Bomber")
            {
                float radius=id=="Bomber"?1.85f:1.25f;
                var copy=game.Enemies.ToArray();
                foreach(var other in copy)
                    if(other!=null&&other!=target&&other.Alive&&Vector3.Distance(other.transform.position,impact)<radius)
                    {other.TakeDamage(hit*.6f,this,piercing);if(id=="Bomber"&&other.Alive)other.Burn(hit*.15f,2.5f,this);}
            }
            CombatEffect.Spawn(game,impact+Vector3.up*.45f,id=="Bomber"?.45f:.19f,id=="Bomber"?1.35f:.48f);
        }
        public void TakeDamage(float amount)
        {
            if(HP<=0)return;HP=Mathf.Max(0,HP-amount);
            CombatEffect.Spawn(game,transform.position+Vector3.up*.5f,.22f,.4f);
            if(HP==0)
            {
                if(visual!=null)ModelAnimator.RetireVisual(visual.gameObject,game);
                game.RemoveTower(this);
            }
            else if(visualAnimator!=null)visualAnimator.Hit();
        }
        public void Heal(float amount){if(HP>0)HP=Mathf.Min(MaxHP,HP+amount);}
        public void Promote(){Tier++;HP=MaxHP;if(visualAnimator!=null)visualAnimator.Special();CombatEffect.Spawn(game,transform.position+Vector3.up*.6f,.5f,1.2f);GameAudio.Play("level");}
        public void GainXP(float amount)
        {
            if(Definition.Id=="Barricade"||Level>=99)return;
            XP+=amount;bool gained=false;
            while(Level<99&&XP>=XPNeeded){XP-=XPNeeded;Level++;Points+=2;Heal(12);gained=true;}
            if(Level>=99)XP=0;
            if(gained){if(visualAnimator!=null)visualAnimator.Special();CombatEffect.Spawn(game,transform.position+Vector3.up*.9f,.4f,.7f);GameAudio.Play("level");}
        }
        public void CheckEvolution()
        {
            string next=Definition.Id;
            if(BaseClass=="Swordsman")
            {
                if(Definition.Id=="Swordsman")
                {
                    if(Strength>=4)game.Unlock("Hammerman");if(Dexterity>=4)game.Unlock("Axeman");if(Intelligence>=4)game.Unlock("Spearman");
                    if(Mathf.Max(Strength,Dexterity,Intelligence)>=4)next=Strength>=Dexterity&&Strength>=Intelligence?"Hammerman":Dexterity>=Intelligence?"Axeman":"Spearman";
                }
                else if(Definition.Id=="Hammerman"&&Strength>=4&&Intelligence>=8){game.Unlock("Paladin");next="Paladin";}
            }
            else if(BaseClass=="Archer")
            {
                if(Definition.Id=="Archer")
                {
                    if(Strength>=4)game.Unlock("Gatling");if(Dexterity>=4)game.Unlock("Blowdart");if(Intelligence>=4)game.Unlock("Bomber");
                    if(Mathf.Max(Strength,Dexterity,Intelligence)>=4)next=Strength>=Dexterity&&Strength>=Intelligence?"Gatling":Dexterity>=Intelligence?"Blowdart":"Bomber";
                }
                else if(Definition.Id=="Bomber"&&Intelligence>=8){game.Unlock("Gunalinder");next="Gunalinder";}
                else if(Definition.Id=="Gunalinder"&&Intelligence>=12){game.Unlock("Sniper");next="Sniper";}
                else if(Definition.Id=="Blowdart"&&Dexterity>=8){game.Unlock("DualSquirtGun");next="DualSquirtGun";}
            }
            else if(BaseClass=="Mage")
            {
                if(Intelligence>=4){game.Unlock("Cleric");next="Cleric";}
            }
            // A purchased specialist keeps its class while training. Only advance;
            // crossing an earlier threshold must never demote an unlocked unit.
            if(next!=Definition.Id&&EvolutionRank(next)>EvolutionRank(Definition.Id))
            {
                float hp=HP/MaxHP;Definition=GameCatalog.Tower(next);HP=MaxHP*Mathf.Max(.65f,hp);RebuildVisual();
                if(visualAnimator!=null)visualAnimator.Special();
                CombatEffect.Spawn(game,transform.position+Vector3.up*.7f,.6f,1.2f);GameAudio.Play("level");
            }
        }
        static int EvolutionRank(string id)
        {
            if(id=="Sniper")return 3;
            if(id=="Paladin"||id=="Gunalinder"||id=="DualSquirtGun")return 2;
            if(id=="Swordsman"||id=="Archer"||id=="Mage"||id=="Barricade")return 0;
            return 1;
        }
        public Vector3 ProjectileOrigin
        {
            get
            {
                var hand=visualAnimator!=null?visualAnimator.GetBone("WeaponR"):null;
                return hand!=null?hand.position+transform.forward*.12f:transform.position+Vector3.up*.7f;
            }
        }
        public TowerSave Capture()=>new TowerSave{id=Definition.Id,baseClass=BaseClass,x=Tile.x,z=Tile.y,level=Level,tier=Tier,hp=HP,xp=XP,points=Points,strength=Strength,dexterity=Dexterity,intelligence=Intelligence,kills=Kills,investment=Investment,targetMode=TargetMode,gear=(bool[])Gear.Clone(),attackTimer=attackTimer,healTimer=healTimer,burstShots=burstShots};
        public void Restore(TowerSave s)
        {
            BaseClass=string.IsNullOrEmpty(s.baseClass)?Definition.Family:s.baseClass;Level=Mathf.Clamp(s.level,1,99);Tier=Mathf.Clamp(s.tier,1,5);XP=s.xp;Points=s.points;
            Strength=s.strength;Dexterity=s.dexterity;Intelligence=s.intelligence;Kills=s.kills;Investment=s.investment;TargetMode=s.targetMode??"First";
            Gear=s.gear!=null&&s.gear.Length==4?s.gear:new bool[4];HP=Mathf.Clamp(s.hp,1,MaxHP);attackTimer=s.attackTimer;healTimer=s.healTimer;burstShots=s.burstShots;RefreshHeroVisual();
        }
    }
}
