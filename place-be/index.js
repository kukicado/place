require("dotenv").config();

const { MongoClient } = require("mongodb");
const http = require("http");

const express = require("express");
var cors = require("cors");
const app = express();

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  transports: ["websocket"],
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let db;

let client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect().then((client) => {
  db = client.db("place");
});

app.use(cors());

app.get("/canvas", async (req, res) => {
  res.json(await db.collection("canvas").find().project({ _id: 0 }).toArray());
});

app.get("/point", async (req, res) => {
  console.log(req.query);
  let position = {
    x: Number(req.query.x),
    y: Number(req.query.y),
    color: `#${req.query.color}`,
  };
  console.log(position);

  const result = await db
    .collection("canvas")
    .updateOne(
      { x: position.x, y: position.y },
      { $set: { x: position.x, y: position.y, color: position.color } },
      { upsert: true }
    );
  res.json(result);
});

app.get("/point-load", async (req, res) => {
  let position = {
    x: getNum(1, 512),
    y: getNum(1, 512),
    color: `#${getNum(100000, 999999)}`,
  };

  const result = await db
    .collection("canvas")
    .updateOne(
      { x: position.x, y: position.y },
      { $set: { x: position.x, y: position.y, color: position.color } },
      { upsert: true }
    );
  res.json(result);
});

function getNum(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

io.on("connection", async (socket) => {
  console.log("a user connected");

  socket.on("save-point", async (x, y, color) => {
    console.log(x, y, color);
    io.emit("new-point", x, y, color);
    const result = await db
      .collection("canvas")
      .updateOne(
        { x: x, y: y },
        { $set: { x: x, y: y, color: color } },
        { upsert: true }
      );
  });
});

server.listen("8080");
