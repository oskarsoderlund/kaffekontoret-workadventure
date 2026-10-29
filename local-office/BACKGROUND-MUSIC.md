# Neon Rooftop — lokal bakgrundsmusik

En egen instrumental synth/funk-loop i 96 BPM, 16 takter och cirka 40 sekunder. Bas, trummor, elpianoliknande ackord och syntmelodi syntetiseras av `scripts/create-background-music.py`. Inga inspelningar eller samples från GTA eller externa musiktjänster används.

Musiken startar i kontoret på låg volym. Om webbläsaren blockerar autoplay startar första klicket/tangenttrycket eller **▶ Starta musik** uppspelningen. **♫ Bakgrund på** stänger av musiken; **♫ Bakgrund av** slår på den igen. Valet sparas lokalt och gäller bara den egna spelaren. Effekter för fisa/rapa/kissa har en separat ljudknapp. Spotify-panelen finns kvar.

Tillgångar: `play/public/office/music/neon-rooftop.ogg` (Ogg/Opus, stereo 48 kHz), `track.json`. HTML-ljudspelaren loopar, pausar och återupptar från samma position. Händelselyssnare och spelare städas när komponenten lämnar scenen; avstängt val behålls vid avatarbyte.

Regenerera med befintliga numpy/ffmpeg:

```sh
python3 local-office/scripts/create-background-music.py
```

Verifiering och avgränsningar finns i `qa-reports/BACKGROUND-MUSIC.md`. Inga commits eller pushar.
