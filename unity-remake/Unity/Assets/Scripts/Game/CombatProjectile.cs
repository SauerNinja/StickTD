using UnityEngine;

namespace StickTD
{
    public sealed class CombatProjectile : MonoBehaviour
    {
        GameRoot game;TowerUnit owner;EnemyUnit target;Vector3 destination;float age;float speed;bool bomb;string modelName;
        public static void Launch(GameRoot game,TowerUnit owner,EnemyUnit target,string model)
        {
            var obj=AssetLibrary.Spawn(model,owner.ProjectileOrigin);
            if(obj==null){owner.ResolveHit(target,target.transform.position);return;}
            var projectile=obj.AddComponent<CombatProjectile>();projectile.game=game;projectile.owner=owner;projectile.target=target;
            projectile.destination=target.transform.position+Vector3.up*.45f;projectile.speed=model=="Bullet"?22:model=="Orb"?10:13;projectile.bomb=model=="Bomb";
            projectile.modelName=model;
            var animation=obj.GetComponent<ModelAnimator>();if(animation!=null){animation.Bind(game);animation.Play("Walk",0);}
        }
        public ProjectileSave Capture()
        {
            if(game==null||owner==null)return null;
            return new ProjectileSave{model=modelName,ownerIndex=game.Towers.IndexOf(owner),targetIndex=game.Enemies.IndexOf(target),position=transform.position,destination=destination,age=age};
        }
        public static void Restore(GameRoot game,ProjectileSave save)
        {
            if(save.ownerIndex<0||save.ownerIndex>=game.Towers.Count)return;
            var obj=AssetLibrary.Spawn(save.model,save.position);if(obj==null)return;
            var projectile=obj.AddComponent<CombatProjectile>();projectile.game=game;projectile.owner=game.Towers[save.ownerIndex];
            projectile.target=save.targetIndex>=0&&save.targetIndex<game.Enemies.Count?game.Enemies[save.targetIndex]:null;
            projectile.destination=save.destination;projectile.age=save.age;projectile.modelName=save.model;
            projectile.speed=save.model=="Bullet"?22:save.model=="Orb"?10:13;projectile.bomb=save.model=="Bomb";
            var animation=obj.GetComponent<ModelAnimator>();if(animation!=null){animation.Bind(game);animation.Play("Walk",0);}
        }
        void Update()
        {
            if(game==null){Destroy(gameObject);return;}
            float dt=game.Delta;if(dt<=0)return;age+=dt;
            if(target!=null&&target.Alive)destination=target.transform.position+Vector3.up*.45f;
            Vector3 direction=destination-transform.position;
            if(direction.sqrMagnitude<speed*speed*dt*dt||age>4)
            {if(owner!=null)owner.ResolveHit(target!=null&&target.Alive?target:null,destination-Vector3.up*.45f);Destroy(gameObject);return;}
            transform.position+=direction.normalized*speed*dt;
            if(bomb)transform.Rotate(220*dt,140*dt,0);
            else if(direction.sqrMagnitude>.0001f)transform.rotation=Quaternion.LookRotation(direction.normalized);
        }
    }

    public sealed class CombatEffect : MonoBehaviour
    {
        GameRoot game;float remaining,total;Vector3 originalScale;
        public static void Spawn(GameRoot game,Vector3 position,float duration,float scale)
        {
            var obj=AssetLibrary.Spawn("HitSpark",position);if(obj==null)return;
            obj.transform.localScale*=scale;var effect=obj.AddComponent<CombatEffect>();effect.game=game;effect.remaining=effect.total=duration;effect.originalScale=obj.transform.localScale;
            obj.transform.rotation=UnityEngine.Random.rotation;
            var animation=obj.GetComponent<ModelAnimator>();if(animation!=null){animation.Bind(game);animation.Special();}
        }
        void Update()
        {
            if(game==null){Destroy(gameObject);return;}float dt=game.Delta;if(dt<=0)return;
            remaining-=dt;if(remaining<=0){Destroy(gameObject);return;}
            transform.localScale=originalScale*(remaining/total);transform.Rotate(0,180*dt,90*dt,Space.World);
        }
    }
}
