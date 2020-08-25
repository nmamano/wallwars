import invert from "invert-color";

const C = {
  white: "#ffffff",
  black: "#000000",

  //colors from materialize
  //https://materializecss.com/color.html
  redLighten4: "#ffcdd2",
  redLighten3: "#ef9a9a",
  redLighten2: "#e57373",
  redLighten1: "#ef5350",
  red: "#f44336",
  redDarken1: "#e53935",
  redDarken2: "#d32f2f",
  redDarken3: "#c62828",
  redDarken4: "#b71c1c",
  tealLighten2: "#4db6ac",
  tealLighten1: "#26a69a",
  teal: "#009688",
  tealDarken1: "#00897b",
  tealDarken2: "#00796b",
  tealDarken4: "#004d40",
  indigoLighten4: "#c5cae9",
  indigoLighten3: "#9fa8da",
  indigoLighten2: "#7986cb",
  indigoLighten1: "#5c6bc0",
  indigo: "#3f51b5",
  indigoDarken2: "#303f9f",
  indigoDarken3: "#283593",
  indigoDarken4: "#1a237e",
  amberDarken1: "#ffb300",
  amberDarken2: "#ffa000",
  orangeLighten2: "#ffb74d",

  //custom colors
  customBlueLighten1: "#6583C3",
  customBlue: "#5876B6",
  customBlueDarken1: "#4866A6",
  customBlueDarken2: "#153373",
  customBlueDarken3: "#355393",
  customGray: "#d2d2d2",
  customGrayLighten1: "#eaeaea",
  customGrayDarken1: "#cccccc",

  //for a potential future board theme, unused atm
  chessSquareLight: "#f0d9b5",
  chessSquareDark: "#b58863",
};

const greenTheme = {
  background: [C.teal, C.tealDarken4],
  backgroundImage: ["none", "none"],
  container: [C.tealDarken2, "keep"],
  button: [C.tealLighten2, "keep"],
  importantButton: [C.red, "keep"],
  header: [C.redLighten1, C.redDarken4],
  headerButton: [C.redDarken1, "keep"],
  recentGamesBackground: [C.redLighten2, C.redDarken2],
  recentGamesAlternate: [C.redLighten1, C.redDarken1],
};

const blueTheme = {
  background: [C.customBlueDarken3, "keep"],
  backgroundImage: ["blueBgLight", "blueBgDark"],
  container: [C.customBlueDarken3, C.customBlueDarken2],
  button: [C.customBlueLighten1, "keep"],
  importantButton: [C.red, "keep"],
  header: [C.customBlueDarken3, C.customBlueDarken2],
  headerButton: [C.customBlueLighten1, "keep"],
  recentGamesBackground: [C.customBlueLighten1, C.customBlueDarken1],
  recentGamesAlternate: [C.customBlue, "keep"],
};

//different board themes can be combined with different main themes
//but for now there is a single board theme
const boardMonochromeTheme = {
  ground: [C.customGray, "flip"],
  emptyWall: [C.customGrayLighten1, "flip"],
  pillar: [C.customGrayDarken1, "flip"],
  hoveredGround: ["#fbe4D6", "flip"],
  hoveredWall: ["#f1bfa0", "flip"],
  player1: [C.red, "keep"],
  player2: [C.indigo, "keep"],
  timer1: [C.redLighten1, "keep"],
  timer2: [C.indigoLighten1, "keep"],
  lowTime: [C.orangeLighten2, "keep"],
  wall1: [C.red, C.redDarken3],
  wall2: [C.indigo, C.indigoDarken3],
  goalBackground1: [C.redLighten4, C.redDarken2],
  goalBackground2: [C.indigoLighten4, C.indigoDarken2],
  goalToken: [C.customGrayLighten1, "flip"],
  ghost1: [C.redLighten4, C.redLighten4],
  ghost2: [C.indigoLighten4, C.indigoLighten4],
  ghostWall1: [C.redLighten3, C.redLighten2],
  ghostWall2: [C.indigoLighten3, C.indigoLighten4],
  coord: [C.white, C.black],

  //for the move history
  move1: [C.redLighten2, "keep"],
  move2: [C.indigoLighten2, "keep"],
  currentMove: [C.amberDarken1, "keep"],
};

const getThemeColor = (theme, elem, isDarkModeOn) => {
  const lightColor = theme[elem][0];
  if (!isDarkModeOn) return lightColor;
  const darkColor = theme[elem][1];
  if (darkColor === "keep") return lightColor;
  if (darkColor === "flip") return invert(lightColor);
  return darkColor;
};

export const getColor = (themeName, elem, isDarkModeOn) => {
  if (themeName === "green") {
    return getThemeColor(greenTheme, elem, isDarkModeOn);
  } else if (themeName === "blue") {
    return getThemeColor(blueTheme, elem, isDarkModeOn);
  } else if (themeName === "boardMonochrome") {
    return getThemeColor(boardMonochromeTheme, elem, isDarkModeOn);
  }
  console.error("unknown theme " + themeName);
  return "#00FF00";
};
