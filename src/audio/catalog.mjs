"use strict";

export const AUDIO_LICENSES = {
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "Public Domain": "https://soundbible.com/about.php"
};

function fieldRecording(id, title, author, source, license, editor) {
  return { file: "/assets/audio/" + id + ".mp3", title, author, source, license, editor };
}

function instrumentSamples(id, title, instrument, roots) {
  return {
    file: "/assets/audio/" + id + "-notes.mp3",
    title, author: "Frank Wen · FluidR3 GM / gleitz",
    source: "https://github.com/gleitz/midi-js-soundfonts/blob/gh-pages/FluidR3_GM/" + instrument + "-mp3.js",
    license: "CC BY 3.0", roots, noteLength: 4
  };
}

export const SOUND_AUDIO = {
  rain: fieldRecording("rain", "rain ambience", "alex36917", "https://freesound.org/people/alex36917/sounds/524605/", "CC BY 4.0", "Porrumentzio / Blanket"),
  wind: fieldRecording("wind", "Wind blowing on the sea (or through the window)", "Félix Blume", "https://freesound.org/people/felix.blume/sounds/217506/", "CC0 1.0", "Porrumentzio / Blanket"),
  waves: fieldRecording("waves", "oceanwavescrushing.wav", "Luftrum", "https://freesound.org/people/Luftrum/sounds/48412/", "CC BY 4.0", "Porrumentzio / Blanket"),
  stream: fieldRecording("stream", "Water Stream", "gluckose", "https://freesound.org/people/gluckose/sounds/333987/", "CC0 1.0", "Blanket"),
  thunder: fieldRecording("thunder", "Infinite Storm.wav", "digifishmusic", "https://freesound.org/people/digifishmusic/sounds/41739/", "CC BY 4.0", "Porrumentzio / Blanket"),
  birds: fieldRecording("birds", "Birds in my backyard", "kvgarlic", "https://freesound.org/people/kvgarlic/sounds/156826/", "CC0 1.0", "Porrumentzio / Blanket"),
  insects: fieldRecording("insects", "Crickets Chirping At Night", "Lisa Redfern", "https://soundbible.com/2083-Crickets-Chirping-At-Night.html", "Public Domain", "Blanket"),
  fire: fieldRecording("fire", "Fireplace", "ezwa", "https://soundbible.com/1543-Fireplace.html", "Public Domain", "Blanket"),
  cafe: fieldRecording("cafe", "Restaurant Ambiance", "stephan", "https://soundbible.com/1664-Restaurant-Ambiance.html", "Public Domain", "Blanket"),
  traffic: fieldRecording("traffic", "NYC_street leve02l.wav", "gezortenplotz", "https://freesound.org/people/gezortenplotz/sounds/44796/", "CC BY 3.0", "Porrumentzio / Blanket"),
  train: fieldRecording("train", "ambiance_train inside", "marion3825", "https://freesound.org/people/marion3825/sounds/510822/", "CC0 1.0"),
  rural: fieldRecording("rural", "Countryside ambiance in village outskirts near forest at night", "Félix Blume", "https://freesound.org/people/felix.blume/sounds/668654/", "CC0 1.0"),
  market: fieldRecording("market", "urbanmarket2", "kayaker25", "https://freesound.org/people/kayaker25/sounds/849935/", "CC0 1.0"),
  rainstreet: fieldRecording("rainstreet", "Cars running over puddles", "Milkybread", "https://freesound.org/people/Milkybread/sounds/830376/", "CC0 1.0"),
  forest: fieldRecording("forest", "Forest Ambience.wav", "JK_Wango", "https://freesound.org/people/JK_Wango/sounds/703103/", "CC0 1.0"),
  boat: fieldRecording("boat", "Boat ambience", "Falcet", "https://freesound.org/people/Falcet/sounds/439365/", "CC0 1.0", "Porrumentzio / Blanket"),
  keyboard: fieldRecording("keyboard", "Keyboard Typing & Clicking Ambience", "Sayaka04", "https://freesound.org/people/Sayaka04/sounds/851269/", "CC0 1.0"),
  chimes: fieldRecording("chimes", "Wind Chime Gentle.mp3", "_natiKatz", "https://freesound.org/people/_natiKatz/sounds/530603/", "CC0 1.0"),
  piano: instrumentSamples("piano", "Acoustic grand piano", "acoustic_grand_piano", [55, 60, 64, 67, 72, 79, 84]),
  guitar: instrumentSamples("guitar", "Nylon acoustic guitar", "acoustic_guitar_nylon", [40, 45, 50, 55, 59, 64]),
  harp: instrumentSamples("harp", "Orchestral harp", "orchestral_harp", [55, 60, 64, 67, 72, 76])
};

SOUND_AUDIO.thunder.related = {
  title: "16707donder 02.mp3", author: "Charel Sytze",
  source: "https://freesound.org/people/Charel%20Sytze/sounds/37608/", license: "CC BY 3.0"
};
