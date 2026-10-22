using System.Collections.Generic;
using UnityEngine;

namespace StickTD
{
    public class GameAudio : MonoBehaviour
    {
        static GameAudio instance;
        readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        AudioSource effects, music;
        public static bool Muted { get; private set; }
        void Awake()
        {
            instance = this;
            effects = gameObject.AddComponent<AudioSource>();
            effects.volume = 0.32f;
            music = gameObject.AddComponent<AudioSource>();
            music.volume = 0.13f;
            music.loop = true;
            music.clip = Resources.Load<AudioClip>("Audio/ambience");
            if (music.clip) music.Play();
        }
        public static void Play(string id)
        {
            if (!instance || Muted) return;
            if (!instance.clips.TryGetValue(id, out var clip))
            {
                clip = Resources.Load<AudioClip>("Audio/" + id);
                instance.clips[id] = clip;
            }
            if (clip) instance.effects.PlayOneShot(clip);
        }
        public static void ToggleMute()
        {
            Muted = !Muted;
            if (instance) instance.music.mute = Muted;
        }
    }
}
