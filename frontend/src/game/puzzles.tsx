import { Puzzle } from "./puzzleLogic";

const puzzleList: Puzzle[] = [
  {
    id: "1",
    author: "Nilo",
    difficulty: 1650,
    boardSettings: {
      dims: [6, 5],
      startPos: ["a1", "e1"],
      goalPos: ["e6", "a6"],
    },
    creatorStarts: false,
    playAsCreator: false,
    moves:
      "d2; b2; c3; c3; b3 b2v; b4v b4>; b5> b6>; a5v c2v; a1v a2v; a1> a2>; c3v d3v; d3 d2v; d5v e5v; e4; a4; d4 d4>, d4 d5>, d4 e4v, d4 c5>; b5; c5; a6",
    startIndex: 12,
  },
  {
    id: "2",
    author: "Nilo",
    difficulty: 1750,
    boardSettings: {
      dims: [3, 7],
      startPos: ["f2", "b2"],
      goalPos: ["g3", "a3"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "a2> b2v; f2v f2>; a2v c2v, a1v c2v, a1> c2v; e2v g2v; c2> d1v; c2 e2>; e1; d1; d2; e2; e3; d3; g3",
    startIndex: 0,
  },
  {
    id: "3",
    author: "Nilo",
    difficulty: 1550,
    boardSettings: {
      dims: [5, 5],
      startPos: ["a1", "e1"],
      goalPos: ["e5", "a5"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "d2> d3>; d4v d4>; b4v c4v; a3> a4>; a2> b1v; b2> b3>; c1> e1v, c1> e2v, c1> e3v, c1> e4v; d2; c2> c3>; d4; a3; c3; a5; c1; c5; a1; e5",
    startIndex: 6,
  },
  {
    id: "4",
    author: "Nilo",
    difficulty: 1600,
    boardSettings: {
      dims: [4, 5],
      startPos: ["a1", "e1"],
      goalPos: ["e4", "a4"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "b2; d2; a4> b3v; b2v b2>; d3v d4>; d2v d2>; b4> c4>; a2> c2>; b3> c1>, a3> c1>; e1; c1; e3; c3; c3; e3; c1; e4 d1v, e4 d1>, e4 e1v, e4 e2v, e4 e3v, e4 d3>, e4 c3>, e4 c3v, e4 c2v, e4 c1v, e4 a3>, e4 b3>, e4 b1v",
    startIndex: 8,
  },
  {
    id: "5",
    author: "Nilo",
    difficulty: 1400,
    boardSettings: {
      dims: [3, 7],
      startPos: ["a1", "g1"],
      goalPos: ["g3", "a3"],
    },
    creatorStarts: true,
    playAsCreator: false,
    moves:
      "c1; e1; a1> a2>; f1> f2>; c1v d1v; c2v e1v; d2v e2v; b1v f2v, b1> f2v; e1; f2; f2; d2; d2; b2; b2; a3",
    startIndex: 7,
  },
  {
    id: "6",
    author: "Nilo",
    difficulty: 1725,
    boardSettings: {
      dims: [5, 5],
      startPos: ["a1", "a1"],
      goalPos: ["c3", "c3"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "b2v c2v; b2; c3> c4>; b4v a4>; a2> c5>; a1; a3; a3; b3 a3>; a5; c3 a1>, c3 a1v, c3 b1>, c3 b1v, c3 c1>, c3 c1v, c3 d1>, c3 d1v, c3 e1v, c3 a2v, c3 b2>, c3 c2>, c3 d2v, c3 d2>, c3 e2v, c3 a3v, c3 b3v, c3 b3>, c3 c3v, c3 d3v, c3 d3>, c3 e3v, c3 a4v, c3 b4>, c3 d4v, c3 d4>, c3 e4v, c3 d5>",
    startIndex: 4,
  },
  {
    id: "7",
    author: "Tim",
    difficulty: 1850,
    boardSettings: {
      dims: [6, 9],
      startPos: ["a1", "i1"],
      goalPos: ["i6", "a6"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "g3v h3v; b3v c3v; e3v f3v; c4> d3v; f4> f5>; c5> c6>; f1> f6>; c1> c2>; a2 f2>; h2> h3>; b2 a3>; h2; c3; g3; e3; e3; f3 d3>; d2; h4> h5>, h4> h6>, h5> h6>; a4> a5>; g2; c3; h1; b2; a2> b1v; c1; i2; a1; i4; a3; i6",
    startIndex: 10,
  },
  {
    id: "8",
    author: "Nilo",
    difficulty: 1430,
    boardSettings: {
      dims: [3, 5],
      startPos: ["c1", "c1"],
      goalPos: ["e3", "a3"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves: "a2> d2>; a3> d3>; b1> c1v; d2; e1; b2; e3",
    startIndex: 2,
  },
  {
    id: "9",
    author: "Nilo",
    difficulty: 1350,
    boardSettings: {
      dims: [4, 4],
      startPos: ["a1", "d1"],
      goalPos: ["d4", "a4"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "a4> a3>; a2> c3>; d2v c3v; d3v d1v; b1> b2>; c2; b2; b3; b4; b1; d4",
    startIndex: 4,
  },
  {
    id: "10",
    author: "Nilo",
    difficulty: 1450,
    boardSettings: {
      dims: [4, 4],
      startPos: ["c2", "c2"],
      goalPos: ["d4", "a4"],
    },
    creatorStarts: true,
    playAsCreator: true,
    moves: "a2v b3>; b3; a3> b3v; c2; c3 c2v; d3; d4",
    startIndex: 2,
  },
  // Add new puzzles here...
];

export const puzzles = puzzleList.sort(
  (p1, p2) => p1.difficulty - p2.difficulty
);
