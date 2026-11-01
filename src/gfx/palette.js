// The palette: a golden-hour cottage. Colours that matter also carry a shape (snowflake, flame, check, notch).
export const PAL = {
  cream: '#F7E8CB',
  linen: '#F3E6D2',
  honey: '#F2B33D',
  red: '#C8442F',
  moss: '#5E8C3A',
  green: '#3FA34D',
  ink: '#1D2440',
  brown: '#6E4127',
  cold: '#5FA8D8',
  wood: '#C98A4E',
  woodDark: '#7A4A2A',
  plaster: '#EADBC0',
  gold: '#FFCB4A',
};

// The cast's looks: a map from the kit's atlas colours to ours. Rabbit atlas: fur #d5d5dc, jacket #3c3c3c, pink #d06d8f,
// trim (per rabbit) #586d48 #a5b5ce #60bed8 #64654f #727272, eyes #e9e9e9 / #242424, hair (per rabbit). Panda: dark
// #403c57, white #e9e9e9, trim #84b717, eyes #242424, headband #ec8742.
const RABBIT_TRIMS = ['#586d48', '#a5b5ce', '#60bed8', '#64654f', '#727272'];
function rabbitLook({ fur, jacket, trim, hair, pink = '#e58aa0' }) {
  const look = { '#d5d5dc': fur, '#3c3c3c': jacket, '#d06d8f': pink, '#e9e9e9': '#fbf7f0', '#242424': '#1a1622' };
  for (const t of RABBIT_TRIMS) look[t] = trim;
  if (hair) for (const h of ['#e9ad3e', '#37b8aa', '#569669', '#a5b5ce']) look[h] = hair;
  return look;
}

/** Bears from the panda: fur, a face (muzzle) colour on the head's white, a jacket, its trim and a band. */
function bearLook({ fur, face, jacket, trim, band, ears, noBand = false }) {
  return {
    '#403c57': fur,
    '#e9e9e9': jacket,
    '#84b717': trim,
    '#242424': '#1a1210',
    '#ec8742': band,
    '#8a97ac': band,
    bear: { fur, face, nose: '#2a1810', ears: ears ?? fur },
    noBand,
  };
}

export const BEARS = {
  papa: { kind: 'bear', scale: 1.75, look: bearLook({ fur: '#5a3620', face: '#c79a6c', ears: '#4a2b18', jacket: '#3f6b3a', trim: '#F2B33D', band: '#2b4a2a', noBand: true }) },
  mama: { kind: 'bear', scale: 1.45, look: bearLook({ fur: '#8a5634', face: '#e2bd8f', ears: '#73452a', jacket: '#F3E6D2', trim: '#C8442F', band: '#C8442F' }) },
  baby: { kind: 'bear', scale: 1.1, look: bearLook({ fur: '#a8703f', face: '#efcfa2', ears: '#8f5c32', jacket: '#C8442F', trim: '#F7E8CB', band: '#F2B33D' }) },
};

/** Characters a player can be (unlocked in the Wardrobe). `kind` is the cast member; the look recolours it. */
export const CHARACTERS = {
  goldi: { name: 'Goldi', kind: 'goldi', look: rabbitLook({ fur: '#f6efe6', jacket: '#2f4f8f', trim: '#C8442F', hair: '#f2b33d' }) },
  rosie: { name: 'Rosie', kind: 'pigtails', look: rabbitLook({ fur: '#f6efe6', jacket: '#C8442F', trim: '#F7E8CB', hair: '#d2683d' }) },
  bramble: { name: 'Bramble', kind: 'bunny', look: rabbitLook({ fur: '#a87a55', jacket: '#3f6b3a', trim: '#F2B33D' }) },
  sky: { name: 'Sky', kind: 'cyan', look: rabbitLook({ fur: '#f6efe6', jacket: '#1D2440', trim: '#5FA8D8', hair: '#5FA8D8' }) },
  pepper: { name: 'Pepper', kind: 'grey', look: rabbitLook({ fur: '#8f8a90', jacket: '#6E4127', trim: '#F2B33D', hair: '#ece7df' }) },
  bao: { name: 'Bao', kind: 'bear', look: { '#ec8742': '#C8442F' } },
  cub: { name: 'Cub', kind: 'bear', look: bearLook({ fur: '#a8703f', face: '#efcfa2', ears: '#8f5c32', jacket: '#2f4f8f', trim: '#F2B33D', band: '#F2B33D' }) },
};

/** The rival bunnies (bots): a name, a look and a habit (brain.js FOLK has their skill). */
export const FOLK_LOOKS = {
  Ottoline: { kind: 'pigtails', look: rabbitLook({ fur: '#f3ece4', jacket: '#5b3a6e', trim: '#F2B33D', hair: '#3b2a24' }) },
  Fen: { kind: 'bunny', look: rabbitLook({ fur: '#c8743a', jacket: '#1D2440', trim: '#F7E8CB' }) },
  Corvin: { kind: 'grey', look: rabbitLook({ fur: '#4a4650', jacket: '#7a2f2f', trim: '#d9c08a', hair: '#1f1d24' }) },
  Hazel: { kind: 'goldi', look: rabbitLook({ fur: '#b98a62', jacket: '#3f6b3a', trim: '#F7E8CB', hair: '#7a4a2a' }) },
  Sorrel: { kind: 'cyan', look: rabbitLook({ fur: '#f3ece4', jacket: '#C8442F', trim: '#F2B33D', hair: '#d2683d' }) },
  Prickle: { kind: 'grey', look: rabbitLook({ fur: '#d8cfc4', jacket: '#2b6f74', trim: '#F7E8CB', hair: '#8a6a4a' }) },
  Burdock: { kind: 'bunny', look: rabbitLook({ fur: '#6e5a4a', jacket: '#b07a2a', trim: '#1D2440' }) },
  Moss: { kind: 'pigtails', look: rabbitLook({ fur: '#e9e2d8', jacket: '#5E8C3A', trim: '#C8442F', hair: '#4f6e3a' }) },
};
