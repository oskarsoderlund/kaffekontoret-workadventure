"""Compose Neon Rooftop: original 96 BPM synth/funk, no external recordings/samples.
Requires the existing numpy and ffmpeg installations. Output is a seamless local Ogg loop.
"""
from pathlib import Path
import json
import subprocess
import tempfile
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RATE = 48000
BPM = 96
BEAT = 60 / BPM
SECONDS = 16 * 4 * BEAT
SIZE = round(RATE * SECONDS)
rng = np.random.default_rng(412)
mix = np.zeros((SIZE, 2), dtype=np.float64)


def add(signal, at, gain=1, pan=0):
    start = round(at * RATE)
    indices = (np.arange(len(signal)) + start) % SIZE
    left, right = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    np.add.at(mix[:, 0], indices, signal * gain * left)
    np.add.at(mix[:, 1], indices, signal * gain * right)


def note(midi, duration, kind):
    t = np.arange(round(duration * RATE)) / RATE
    frequency = 440 * 2 ** ((midi - 69) / 12)
    attack = np.minimum(t / .012, 1)
    release = np.minimum((duration - t) / .09, 1)
    phase = 2 * np.pi * frequency * t
    if kind == 'bass':
        tone = np.sin(phase) + .26 * np.sin(phase * 2) + .1 * np.sin(phase * 3)
        return tone * attack * release * np.exp(-t * 2.3)
    if kind == 'keys':
        tone = np.sin(phase + 1.4 * np.sin(phase * 2) * np.exp(-t * 5))
        return tone * attack * release * np.exp(-t * 2.4)
    # Warm, slightly detuned lead with a slow vibrato.
    vibrato = .015 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(t / .25, 1)
    tone = np.sin(phase + vibrato) + .2 * np.sin(phase * 2.003) + .08 * np.sin(phase * 3)
    return tone * attack * release * np.exp(-t * .75)


def kick():
    t = np.arange(round(.28 * RATE)) / RATE
    phase = 2 * np.pi * (48 * t + 70 * .024 * (1 - np.exp(-t / .024)))
    return np.sin(phase) * np.exp(-t * 18) + .08 * rng.normal(size=len(t)) * np.exp(-t * 140)


def snare():
    t = np.arange(round(.23 * RATE)) / RATE
    noise = rng.normal(size=len(t))
    noise = noise - np.roll(noise, 1) * .75
    return noise * np.exp(-t * 23) * .26 + np.sin(2 * np.pi * 178 * t) * np.exp(-t * 32) * .3


def hat(opened=False):
    t = np.arange(round((.22 if opened else .065) * RATE)) / RATE
    noise = rng.normal(size=len(t))
    return (noise - np.roll(noise, 1)) * np.exp(-t * (24 if opened else 80)) * .085


# F# minor 9 / D major 9 / A major 7 / E add 9. Chords change every two bars.
harmony = [(42, [57, 61, 64, 68]), (38, [54, 57, 61, 64]),
           (45, [56, 61, 64, 68]), (40, [56, 59, 64, 66])]
melody = [(0, 78, .65), (.9, 76, .35), (1.6, 73, .8), (3, 69, .6),
          (4.5, 73, .65), (5.5, 76, .4), (6.25, 78, 1.1)]
for bar in range(16):
    start = bar * 4 * BEAT
    root, chord = harmony[(bar // 2) % 4]
    for step in [0, 6, 8, 11 if bar % 2 else 14]:
        add(kick(), start + step * BEAT / 4, .65)
    for beat in [1, 3]:
        add(snare(), start + beat * BEAT + .009, .6)
    for step in range(8):
        swing = .022 if step % 2 else 0
        add(hat(step == 7 and bar % 2 == 1), start + step * BEAT / 2 + swing,
            .56 if step % 2 else .72, -.22 if step % 2 else .18)
    for offset, pitch, length in [(0, root, .68), (.75, root + 12, .2),
                                 (1.5, root + 7, .3), (2.0, root, .55),
                                 (2.75, root + 12, .22), (3.5, root + 7, .35)]:
        add(note(pitch, length * BEAT, 'bass'), start + offset * BEAT, .32)
    for offset in [.5, 1.75, 2.5, 3.5]:
        for index, pitch in enumerate(chord):
            tone = note(pitch, .8 * BEAT, 'keys')
            add(tone, start + offset * BEAT + index * .006, .052, (index - 1.5) * .22)
            add(tone, start + (offset + .75) * BEAT, .013, -.35)
    # Leave room between phrases instead of playing a lead on every bar.
    if bar in [2, 6, 8, 12, 14]:
        for offset, pitch, length in melody:
            if offset >= 4:
                continue
            tone = note(pitch - (2 if bar == 6 else 0), length * BEAT, 'lead')
            add(tone, start + offset * BEAT, .085, .12)
            add(tone, start + (offset + .75) * BEAT, .022, -.3)
    if bar in [3, 9, 13, 15]:
        for offset, pitch, length in melody:
            if offset < 4:
                continue
            tone = note(pitch, length * BEAT, 'lead')
            add(tone, start + (offset - 4) * BEAT, .085, .12)
            add(tone, start + (offset - 3.25) * BEAT, .022, -.3)

mix = np.tanh(mix * 1.25)
mix *= .85 / np.max(np.abs(mix))
output = ROOT / 'play/public/office/music'
output.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='office-music-') as temp:
    source = Path(temp) / 'neon-rooftop.wav'
    with wave.open(str(source), 'wb') as file:
        file.setnchannels(2)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes((mix * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                    '-af', 'loudnorm=I=-19:TP=-2:LRA=7', '-ar', str(RATE),
                    '-c:a', 'libopus', '-b:a', '128k', str(output / 'neon-rooftop.ogg')], check=True)
(output / 'track.json').write_text(json.dumps({
    'title': 'Neon Rooftop', 'bpm': BPM, 'durationSeconds': SECONDS,
    'description': 'Original instrumental synth/funk composition, generated locally without external samples.',
    'source': 'local-office/scripts/create-background-music.py',
}, indent=2) + '\n')
print(f'Composed Neon Rooftop: {SECONDS:.0f}s, stereo {RATE}Hz, 16 bars at {BPM} BPM')
