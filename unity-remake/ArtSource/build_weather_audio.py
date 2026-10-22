"""Original weather audio, generated in Blender Python without external samples."""
import random, math, struct, wave
from pathlib import Path
folder=Path(__file__).resolve().parents[1]/'Unity'/'Assets'/'Resources'/'Audio'
folder.mkdir(parents=True,exist_ok=True);sr=22050
for name,duration in [('weather_rain',4),('weather_wind',6),('weather_thunder',2)]:
    rng=random.Random(83+duration);data=bytearray();slow=0;fast=0
    for n in range(duration*sr):
        t=n/sr;u=t/duration;noise=rng.uniform(-1,1)
        slow=.994*slow+.006*noise;fast=.65*fast+.35*noise
        edge=min(1,t/.13,(duration-t)/.13)
        if name=='weather_rain':value=(noise*.22+fast*.20)*(.85+.1*math.sin(math.tau*t*.5))*edge
        elif name=='weather_wind':value=(slow*2.7+fast*.045)*(.7+.25*math.sin(math.tau*t/duration))*edge
        else:
            env=(1-u)**1.25*min(1,t/.04)
            value=(slow*3+fast*.24+math.sin(math.tau*(36*t+3*math.sin(t*3)))*.06)*env
        data+=struct.pack('<h',int(max(-1,min(1,value))*32767))
    with wave.open(str(folder/(name+'.wav')),'wb') as file:
        file.setnchannels(1);file.setsampwidth(2);file.setframerate(sr);file.writeframes(data)
    print('WEATHER AUDIO',name,duration,flush=True)
