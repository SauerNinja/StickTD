"""Original mellow eight-second loop, synthesized with Python inside Blender."""
import math, wave, struct
from pathlib import Path

destination=Path(__file__).resolve().parents[1]/'Unity'/'Assets'/'Resources'/'Audio'/'ambience.wav'
destination.parent.mkdir(parents=True,exist_ok=True)
sample_rate=22050
duration=8
count=duration*sample_rate
melody=[220.0,261.6256,329.6276,391.9954,329.6276,261.6256,293.6648,329.6276]
data=bytearray()
for n in range(count):
    t=n/sample_rate
    # Gentle fade at both loop boundaries; every note rings into the next.
    edge=min(1,t/.45,(duration-t)/.45)
    pad=sum(math.sin(math.tau*f*t)*.025 for f in (110,130.8128,164.8138))
    notes=0
    for i,f in enumerate(melody):
        elapsed=t-i
        if 0<=elapsed<2.5:
            env=min(1,elapsed/.025)*math.exp(-elapsed*2.6)
            notes+=env*(math.sin(math.tau*f*elapsed)+.18*math.sin(math.tau*f*2*elapsed))*.075
    value=(pad+notes)*max(0,edge)
    data+=struct.pack('<h',int(max(-1,min(1,value))*32767))
with wave.open(str(destination),'wb') as file:
    file.setnchannels(1);file.setsampwidth(2);file.setframerate(sample_rate);file.writeframes(data)
print('EXPORTED ambience.wav: original 8s mono22050 musical loop',flush=True)
