// Global color palette for visuals and UI

export const palette = {
  background: '#e8cb6d', // vanilla yellow
  foreground: '#1c1b13', // dark brown
  white: '#f2f1df',
  skyBlue: '#63f2cc',
  seaBlue: '#5724d6',
  red: '#db2b3a',
  green: '#39c450',
  orange: '#eb8016',
  lavendar: '#ab2bc4'
};

export function pickFridgeColors() {
  // Exclude background; keep high-contrast accents for falling shapes
  return [
    palette.white,
    palette.skyBlue,
    palette.seaBlue,
    palette.red,
    palette.green,
    palette.orange,
    palette.lavendar,
    palette.foreground
  ];
}


