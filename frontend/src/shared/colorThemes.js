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
  amberLighten3: "#ffe082",
  amberLighten2: "#ffd54f",
  amberLighten1: "#ffca28",
  amber: "#ffc107",
  amberDarken1: "#ffb300",
  amberDarken2: "#ffa000",
  orangeLighten2: "#ffb74d",
  yellowLighten5: "#fffde7",
  yellowLighten4: "#fff9c4",
  yellowLighten2: "#fff176",
  yellowLighten1: "#ffc176",
  yellowDarken1: "#fdd835",
  yellowDarken2: "#fbc02d",
  yellowDarken4: "#f57f17",

  //custom colors
  customBlueLighten1: "#6583C3",
  customBlue: "#5876B6",
  customBlueDarken1: "#4866A6",
  customBlueDarken2: "#153373",
  customBlueDarken3: "#355393",
  customGrayLighten1: "#eaeaea",
  customGray: "#d2d2d2",
  customGrayDarken1: "#cccccc",
  customGrayDarken2: "#999999",
  customGrayDarken3: "#666666",
  customGrayDarken4: "#454545",
  customGrayDarken5: "#313131",
  lightOrange: "#fbe4D6",
  customLightYellow: "rgb(240,240,170)",
  customDarkYellow: "#656505",
  //for a potential future board theme, unused atm
  chessSquareLight: "#f0d9b5",
  chessSquareDark: "#b58863",
};

const greenMenuTheme = {
  background: [C.teal, C.tealDarken4],
  backgroundImage: ["none", "none"],
  container: [C.tealDarken2, "keep"],
  containerAlternate: [C.teal, C.tealDarken4],
  button: [C.tealLighten2, "keep"],
  importantButton: [C.red, "keep"],
  header: [C.redLighten1, C.redDarken4],
  headerButton: [C.redDarken1, "keep"],
  recentGamesBackground: [C.redLighten2, C.redDarken2],
  recentGamesAlternate: [C.redLighten1, C.redDarken1],
  selectedTab: [C.tealDarken2, "keep"],
  tab: [C.tealDarken1, C.tealDarken3],
  disabledTab: [C.customGrayDarken1, C.customGrayDarken2],
  disabledTabText: [C.customGrayDarken2, C.customGrayDarken3],
  // hoveredGame: [C.amberDarken1, "keep"] (this is in hoverHighlight.module.css)
};

const blueMenuTheme = {
  background: [C.customBlueDarken3, "keep"],
  backgroundImage: ["blueBgLight", "blueBgDark"],
  container: [C.customBlueDarken3, C.customBlueDarken2],
  containerAlternate: [C.customBlueDarken1, "keep"],
  button: [C.customBlueLighten1, "keep"],
  importantButton: [C.red, "keep"],
  header: [C.customBlueDarken3, C.customBlueDarken2],
  headerButton: [C.customBlueLighten1, "keep"],
  recentGamesBackground: [C.customBlueLighten1, C.customBlueDarken1],
  recentGamesAlternate: [C.customBlue, "keep"],
  selectedTab: [C.customBlueDarken3, C.customBlueDarken2],
  tab: [C.customBlue, C.customBlueDarken1],
  disabledTab: [C.customGrayDarken1, C.customGrayDarken2],
  disabledTabText: [C.customGrayDarken2, C.customGrayDarken3],
  // hoveredGame: [C.amber, "keep"] (this is in hoverHighlight.module.css)
};

//different board themes can be combined with different main themes
//but for now there is a single board theme
const monochromeBoardTheme = {
  ground: [C.customGray, C.customGrayDarken4],
  emptyWall: [C.customGrayLighten1, C.customGrayDarken5],
  pillar: [C.customGrayDarken1, C.customGrayDarken4],
  hoveredGround: [C.lightOrange, "flip"],
  hoveredWall: ["#f1bfa0", "flip"],
  player1: [C.red, C.redLighten1],
  player2: [C.indigo, C.indigoLighten1],
  timer1: [C.redLighten1, "keep"],
  timer2: [C.indigoLighten1, "keep"],
  lowTime: [C.orangeLighten2, "keep"],
  wall1: [C.red, C.redLighten1],
  wall2: [C.indigo, C.indigoLighten1],
  goalBackground1: [C.redLighten4, C.redDarken2],
  goalBackground2: [C.indigoLighten4, C.indigoDarken2],
  combinedGoalBackground: [C.yellowLighten1, C.yellowDarken1],
  goalToken: [C.customGrayLighten1, C.customGrayDarken5],
  ghost1: [C.redLighten4, C.redLighten4],
  ghost2: [C.indigoLighten4, C.indigoLighten4],
  ghostWall1: [C.redLighten3, C.redLighten2],
  ghostWall2: [C.indigoLighten3, C.indigoLighten4],
  traceGround: [C.customLightYellow, C.customDarkYellow],
  lastMoveTokenBorder: [C.customLightYellow, "yellow"],
  lastMoveWallBorder: [C.customLightYellow, C.yellowDarken1],
  coord: [C.white, C.black],

  //for the move history
  move1: [C.redLighten2, "keep"],
  move2: [C.indigoLighten2, "keep"],
  currentMove: [C.amberDarken1, "keep"],
  // hoveredMove: [C.amber, "keep"] (this is in hoverHighlight.module.css)
};

const getThemeColor = (theme, elem, isDarkModeOn) => {
  if (theme[elem] === undefined)
    console.error(`theme ${theme} does not have element ${elem}`);
  const lightColor = theme[elem][0];
  if (!isDarkModeOn) return lightColor;
  const darkColor = theme[elem][1];
  if (darkColor === "keep") return lightColor;
  if (darkColor === "flip") return invert(lightColor);
  return darkColor;
};

export const getColor = (themeName, elem, isDarkModeOn) => {
  if (themeName === "green") {
    return getThemeColor(greenMenuTheme, elem, isDarkModeOn);
  } else if (themeName === "blue") {
    return getThemeColor(blueMenuTheme, elem, isDarkModeOn);
  } else if (themeName === "monochromeBoard") {
    return getThemeColor(monochromeBoardTheme, elem, isDarkModeOn);
  }
  console.error("unknown theme " + themeName);
  return "#00FF00";
};
