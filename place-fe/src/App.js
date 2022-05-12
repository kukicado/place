import React, { useState, useRef, useEffect } from "react";
import socketIOClient from "socket.io-client";

const socket = socketIOClient(process.env.REACT_APP_API_DOMAIN, {
  transports: ["websocket"],
});

function App(props) {
  const [color, setColor] = useState("#000000");
  const [screenshots, setScreenshots] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    socket.connect();
    drawCanvas();
    // client-side
    socket.on("connect", () => {
      console.log(`Connected as ${socket.id}`);
    });

    socket.on("new-point", (x, y, color) => {
      console.log(`new point added at: ${(x, y)} with color: ${color}`);
      const canvas = canvasRef.current;
      let ctx = canvas.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  }, []);

  function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(event.clientX - rect.left);
    const y = Math.floor(event.clientY - rect.top);
    console.log("x: " + x + " y: " + y);
    return { x, y };
  }

  const draw = async (e, canvasRef) => {
    const canvas = canvasRef.current;
    let position = getCursorPosition(canvas, e);
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(position.x, position.y, 1, 1);
    socket.emit("save-point", position.x, position.y, color);
  };

  async function drawCanvas() {
    const res = await fetch(process.env.REACT_APP_API_DOMAIN + "/canvas");
    const data = await res.json();
    const canvas = canvasRef.current;
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(1, 1, 512, 512);
    data.forEach((point) => {
      ctx.fillStyle = point.color;
      ctx.fillRect(point.x, point.y, 1, 1);
    });
  }

  const pickColor = (e) => {
    setColor(e.target.value);
    console.log(color);
  };

  const saveScreenshot = async () => {
    const canvas = canvasRef.current;
    const image = canvas.toBlob(async (blob) => {
      const data = new FormData();
      const fileName = (Math.random() + 1).toString(36).substring(7);
      data.append("image", blob, `${fileName}.jpeg`);

      const res = await fetch(process.env.REACT_APP_API_DOMAIN + "/upload", {
        method: "POST",
        body: data,
      });
      const final = await res.json();
      console.log(final);
      console.log(image);
    });
  };

  const viewScreenshots = async () => {
    const res = await fetch(process.env.REACT_APP_API_DOMAIN + "/screenshots");
    const data = await res.json();

    setScreenshots(data);
  };

  return (
    <div className="py-20">
      <div className="text-center mb-2">Select a Color:</div>
      <input
        type="color"
        value={color}
        onChange={(e) => pickColor(e)}
        className="block mx-auto"
      />
      <canvas
        className="bg-white"
        width="512px"
        height="512px"
        ref={canvasRef}
        style={{
          display: "block",
          border: "1px solid black",
          margin: "50px auto",
        }}
        onMouseDown={(e) => draw(e, canvasRef)}
      />

      <button
        onClick={() => saveScreenshot()}
        className="block mx-auto bg-green-700 px-5 py-2 rounded-full text-white"
      >
        Save Screenshot
      </button>

      <button
        onClick={() => viewScreenshots()}
        className="block mx-auto bg-blue-700 my-5 px-2 py-1 text-sm rounded-full text-white"
      >
        View Screenshots
      </button>

      <div className="flex flex-row flex-wrap">
        {screenshots &&
          screenshots.map((screenshot) => (
            <img
              alt={screenshot}
              key={screenshot}
              className="flex-1 w-1/4 p-2"
              src={`https://place-screenshots.nyc3.digitaloceanspaces.com/${screenshot}`}
            />
          ))}
      </div>
    </div>
  );
}

export default App;
