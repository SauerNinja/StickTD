using UnityEngine;

namespace StickTD
{
    public sealed class EnemyUnit : MonoBehaviour
    {
        public EnemyDefinition Definition { get; private set; }
        public string Id => Definition.Id;
        public float HP { get; private set; }
        public float MaxHP { get; private set; }
        public float Progress { get; private set; }
        public bool Revived { get; private set; }
        public bool Alive { get; private set; } = true;
        public int GoldReward => Definition.Gold+(game.Wave>15?(game.Wave-15)/3:0);
        GameRoot game;
        Transform visual;
        ModelAnimator visualAnimator;
        float slowTimer,slowMultiplier=1,burnTimer,burnDps,poisonTimer,poisonDps,stunTimer,attackTimer,abilityTimer,hitPose,phase;
        TowerUnit burnSource,poisonSource;

        public void Initialize(GameRoot owner,string id,float progress,bool revived)
        {
            game=owner;Definition=GameCatalog.Enemy(id);Progress=progress;Revived=revived;
            if(id=="Troll"&&progress<=0)Progress=(game.Map.Path.Count-1)*game.Map.TileSize-.05f;
            float scaling=game.Wave<=15?1+Mathf.Max(0,game.Wave-1)*.065f:1.91f*Mathf.Pow(1.105f,game.Wave-15);
            MaxHP=Definition.Health*scaling;HP=MaxHP*(revived?.45f:1);
            phase=UnityEngine.Random.value*6.28f;abilityTimer=3+UnityEngine.Random.value*2;attackTimer=.5f;
            transform.position=PositionAt(Progress);
            var model=AssetLibrary.Spawn(Id,transform.position,transform);
            if(model!=null)
            {
                visual=model.transform;visual.localPosition=Vector3.zero;
                visualAnimator=model.GetComponent<ModelAnimator>();if(visualAnimator==null)visualAnimator=model.AddComponent<ModelAnimator>();
                visualAnimator.Bind(game);visualAnimator.Walk(Definition.Speed/1.1f);
                if(revived)visualAnimator.Special();
            }
            if(Id=="Boss"||Id=="Reaper")transform.localScale=Vector3.one*1.45f;
            else if(Id=="Swarm"||Id=="Splitmini")transform.localScale=Vector3.one*.68f;
        }
        Vector3 PositionAt(float distance)
        {
            var path=game.Map.Path;if(path==null||path.Count==0)return Vector3.zero;
            if(path.Count==1)return path[0];
            float index=distance/game.Map.TileSize;int a=Mathf.Clamp(Mathf.FloorToInt(index),0,path.Count-2);
            return Vector3.Lerp(path[a],path[a+1],Mathf.Clamp01(index-a));
        }
        void Update()
        {
            if(!Alive||game==null)return;float dt=game.Delta;if(dt<=0)return;
            attackTimer-=dt;abilityTimer-=dt;hitPose=Mathf.Max(0,hitPose-dt*5);
            if(burnTimer>0){burnTimer-=dt;TakeDamage(burnDps*dt,burnSource,true);if(!Alive)return;}
            if(poisonTimer>0){poisonTimer-=dt;TakeDamage(poisonDps*dt,poisonSource,true);if(!Alive)return;}
            if(Id=="Troll")HP=Mathf.Min(MaxHP,HP+MaxHP*.018f*dt);
            if(slowTimer>0)slowTimer-=dt;else slowMultiplier=1;
            bool stunned=stunTimer>0;if(stunned)stunTimer-=dt;
            if(abilityTimer<=0)
            {
                abilityTimer=Id=="Boss"||Id=="Reaper"?9:3.5f;
                if(visualAnimator!=null&&(Id=="Healer"||Id=="Boss"||Id=="Reaper"))visualAnimator.Special();
                if(Id=="Healer")
                    foreach(var ally in game.Enemies)
                        if(ally!=null&&ally.Alive&&Vector3.Distance(transform.position,ally.transform.position)<3.3f)ally.Heal(ally.MaxHP*.11f);
                if((Id=="Boss"||Id=="Reaper")&&game.Enemies.Count<100)
                    for(int i=0;i<2;i++)game.SpawnEnemy(Id=="Boss"?"Swarm":"Skeleton",Mathf.Max(0,Progress-i*.5f));
            }
            TowerUnit blocker=null;
            foreach(var tower in game.Towers)
            {
                if(tower==null)continue;
                float distance=(tower.transform.position-transform.position).sqrMagnitude;
                if(tower.Definition.Id=="Barricade"&&distance<1.2f){blocker=tower;break;}
            }
            if(blocker!=null&&!stunned)
            {
                if(attackTimer<=0){attackTimer=1.1f;blocker.TakeDamage(12+game.Wave*.9f+(Id=="Tank"||Id=="Boulder"||Id=="Boss"?15:0));hitPose=1;if(visualAnimator!=null)visualAnimator.Attack();}
            }
            else if(!stunned)
            {
                Progress+=Definition.Speed*slowMultiplier*dt*(Id=="Troll"?-1:1);
                float length=(game.Map.Path.Count-1)*game.Map.TileSize;
                if(Id=="Troll"&&Progress<=0){Alive=false;game.EnemyKilled(this,null);gameObject.SetActive(false);Destroy(gameObject);return;}
                if(Progress>=length){Alive=false;game.EnemyEscaped(this);gameObject.SetActive(false);Destroy(gameObject);return;}
                Vector3 old=transform.position;transform.position=PositionAt(Progress);
                Vector3 direction=transform.position-old;direction.y=0;
                if(direction.sqrMagnitude>.000001f)transform.rotation=Quaternion.LookRotation(direction.normalized);
                if((Id=="Wolf"||Id=="Wraith"||Id=="Fire"||Id=="Reaper")&&attackTimer<=0)
                {
                    TowerUnit prey=null;float best=Id=="Wraith"?6.3f:3.6f;
                    foreach(var tower in game.Towers)
                    {
                        if(tower==null)continue;float d=(tower.transform.position-transform.position).sqrMagnitude;
                        if(d<best){best=d;prey=tower;}
                    }
                    if(prey!=null)
                    {
                        prey.TakeDamage(Id=="Reaper"?18:Id=="Fire"?9:7);attackTimer=2.1f;hitPose=1;
                        if(visualAnimator!=null)
                        {
                            visualAnimator.Attack();Vector3 aim=prey.transform.position-transform.position;aim.y=0;
                            if(visual!=null&&aim.sqrMagnitude>.01f)visual.rotation=Quaternion.LookRotation(aim);
                        }
                    }
                }
            }
            if(visualAnimator!=null)
            {
                visualAnimator.SetMoving(blocker==null&&!stunned,Definition.Speed*slowMultiplier/1.1f);
                if(visual!=null&&!visualAnimator.IsPlayingOneShot)visual.localRotation=Quaternion.identity;
            }
            if(visual!=null&&(visualAnimator==null||!visualAnimator.HasClips))
            {
                float bob=Id=="Wraith"?.15f+Mathf.Sin(Time.time*3+phase)*.09f:Mathf.Abs(Mathf.Sin(Progress*7+phase))*.055f;
                visual.localPosition=Vector3.up*bob;
                visual.localRotation=Quaternion.Euler(hitPose*22,0,stunned?Mathf.Sin(Time.time*25)*8:Mathf.Sin(Progress*6+phase)*3.5f);
            }
        }
        public void TakeDamage(float amount,TowerUnit source,bool ignoreArmor=false)
        {
            if(!Alive)return;
            float armor=ignoreArmor?0:Definition.Armor;
            float dealt=ignoreArmor?amount:Mathf.Max(amount*.15f,amount-armor);
            if(Id=="Wraith"&&!ignoreArmor)dealt*=.6f;
            HP=Mathf.Max(0,HP-dealt);hitPose=Mathf.Max(hitPose,.2f);
            if(HP<=0)
            {
                Alive=false;game.EnemyKilled(this,source);
                CombatEffect.Spawn(game,transform.position+Vector3.up*.3f,.3f,.65f);
                if(visual!=null)ModelAnimator.RetireVisual(visual.gameObject,game);
                gameObject.SetActive(false);Destroy(gameObject);
            }
            else if(visualAnimator!=null&&dealt>=.8f)visualAnimator.Hit();
        }
        public void Heal(float amount){if(Alive)HP=Mathf.Min(MaxHP,HP+amount);}
        public void Slow(float multiplier,float duration)
        {if(Id=="Ice")multiplier=Mathf.Max(.85f,multiplier);slowMultiplier=Mathf.Min(slowMultiplier,multiplier);slowTimer=Mathf.Max(slowTimer,duration);}
        public void Stun(float duration){stunTimer=Mathf.Max(stunTimer,(Id=="Boss"||Id=="Reaper")?duration*.35f:duration);}
        public void Burn(float dps,float duration,TowerUnit source)
        {if(Id=="Fire")return;if(dps>=burnDps||burnTimer<=0){burnDps=dps;burnSource=source;}burnTimer=Mathf.Max(burnTimer,duration);}
        public void Poison(float dps,float duration,TowerUnit source)
        {if(dps>=poisonDps||poisonTimer<=0){poisonDps=dps;poisonSource=source;}poisonTimer=Mathf.Max(poisonTimer,duration);}
        public EnemySave Capture()=>new EnemySave{id=Id,hp=HP,progress=Progress,revived=Revived,slowTimer=slowTimer,slowMultiplier=slowMultiplier,burnTimer=burnTimer,burnDps=burnDps,poisonTimer=poisonTimer,poisonDps=poisonDps,stunTimer=stunTimer,attackTimer=attackTimer,abilityTimer=abilityTimer,burnSource=game.Towers.IndexOf(burnSource),poisonSource=game.Towers.IndexOf(poisonSource)};
        public void Restore(EnemySave s)
        {HP=Mathf.Clamp(s.hp,.001f,MaxHP);Progress=s.progress;slowTimer=s.slowTimer;slowMultiplier=s.slowMultiplier;burnTimer=s.burnTimer;burnDps=s.burnDps;poisonTimer=s.poisonTimer;poisonDps=s.poisonDps;stunTimer=s.stunTimer;attackTimer=s.attackTimer;abilityTimer=s.abilityTimer;
            burnSource=s.burnSource>=0&&s.burnSource<game.Towers.Count?game.Towers[s.burnSource]:null;
            poisonSource=s.poisonSource>=0&&s.poisonSource<game.Towers.Count?game.Towers[s.poisonSource]:null;transform.position=PositionAt(Progress);}
    }
}
