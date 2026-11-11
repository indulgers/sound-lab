"use strict";

// Overlap the last second with the beginning once, then let Web Audio loop
// the buffer on its own clock. The last sample leads into the first sample
// of the unblended section, including when the page is in a background tab.
function prepareRecording(context, buffer, normalize) {
  const overlap = Math.min(buffer.sampleRate, Math.floor(buffer.length / 5));
  if (buffer.duration < 0.25) throw new Error("录音太短");
  const length = buffer.length - overlap;
  const result = context.createBuffer(Math.min(2, buffer.numberOfChannels), length, buffer.sampleRate);
  let peak = 0;
  let energy = 0;
  for (let channel = 0; channel < result.numberOfChannels; channel++) {
    const source = buffer.getChannelData(channel);
    const output = result.getChannelData(channel);
    output.set(source.subarray(overlap, length));
    for (let i = 0; i < overlap; i++) {
      const progress = i / Math.max(1, overlap - 1);
      const weight = (1 - Math.cos(progress * Math.PI)) / 2;
      output[length - overlap + i] = source[length + i] * (1 - weight) + source[i] * weight;
    }
    if (normalize) {
      for (const sample of output) {
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
    }
  }
  if (normalize) {
    const rms = Math.sqrt(energy / (length * result.numberOfChannels));
    const scale = Math.min(1, 0.5 / (peak || 1), 0.11 / (rms || 1));
    for (let channel = 0; channel < result.numberOfChannels; channel++) {
      const output = result.getChannelData(channel);
      for (let i = 0; i < length; i++) output[i] *= scale;
    }
  }
  return result;
}

function playInstrumentNote(context, out, sample, frequency, volume, when) {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const { roots, noteLength } = sample.meta;
  let index = 0;
  roots.forEach((root, i) => {
    if (Math.abs(midi - root) < Math.abs(midi - roots[index])) index = i;
  });
  const rate = Math.pow(2, (midi - roots[index]) / 12);
  const source = context.createBufferSource();
  source.buffer = sample.buffer;
  source.playbackRate.value = rate;
  const envelope = context.createGain();
  const end = when + noteLength / rate;
  envelope.gain.setValueAtTime(0, when);
  envelope.gain.linearRampToValueAtTime(volume, when + 0.012);
  envelope.gain.setValueAtTime(volume, end - 0.3);
  envelope.gain.linearRampToValueAtTime(0, end);
  source.connect(envelope).connect(out);
  source.onended = () => { source.disconnect(); envelope.disconnect(); };
  source.start(when, index * noteLength, noteLength);
}
