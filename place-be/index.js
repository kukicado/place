require("dotenv").config();

const { MongoClient } = require("mongodb");
const aws = require("aws-sdk");
const formidable = require("formidable");
const http = require("http");
const fs = require("fs");

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

const s3Client = new aws.S3({
  endpoint: "https://nyc3.digitaloceanspaces.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
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
  let position = {
    x: Number(req.query.x),
    y: Number(req.query.y),
    color: `#${req.query.color}`,
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

app.get("/point-load", async (req, res) => {
  let position = {
    x: getNum(1, 512),
    y: getNum(1, 512),
    color: `#${getNum(100000, 999999)}`,
  };

  io.emit("new-point", position.x, position.y, position.color);

  const result = await db
    .collection("canvas")
    .updateOne(
      { x: position.x, y: position.y },
      { $set: { x: position.x, y: position.y, color: position.color } },
      { upsert: true }
    );

  res.json(result);
});

app.get("/screenshots", async (req, res) => {
  s3Client.listObjects(
    {
      Bucket: "place-screenshots",
    },
    (err, data) => {
      const screenshots = [];
      data.Contents.forEach((screenshot) => {
        screenshots.push(screenshot.Key);
      });
      res.json(screenshots);
    }
  );
});

app.post("/upload", async function (req, res, next) {
  const form = new formidable.IncomingForm();

  let picture = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      resolve(files.image);
    });
  });

  console.log(picture);

  const image = fs.readFileSync(picture.filepath);

  s3Client.putObject(
    {
      Bucket: "place-screenshots",
      Key: picture.originalFilename,
      Body: image,
      ACL: "public-read",
    },
    (err, data) => {
      console.log(err);
      console.log(data);
    }
  );

  res.json(picture);
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
