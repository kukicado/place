import React, { useState, useRef, useEffect } from "react";
import socketIOClient from "socket.io-client";
import "./App.css";

const socket = socketIOClient(process.env.REACT_APP_API_DOMAIN, {
  secure: true,
});

function App(props) {
  const [color, setColor] = useState("#000000");
  const canvasRef = useRef(null);

  useEffect(() => {
    socket.connect();
    drawCanvas();
    socket.on("new-point", (x, y, color) => {
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
    const res = await fetch("http://localhost:8080/canvas");
    const data = await res.json();
    const canvas = canvasRef.current;
    data.forEach((point) => {
      let ctx = canvas.getContext("2d");
      ctx.fillStyle = point.color;
      ctx.fillRect(point.x, point.y, 1, 1);
    });
    console.log(data);
  }

  const pickColor = (e) => {
    setColor(e.target.value);
    console.log(color);
  };

  return (
    <div className="App">
      <input type="color" value={color} onChange={(e) => pickColor(e)} />
      <button onClick={() => drawCanvas()}>Draw Canvas</button>
      <canvas
        width="512px"
        height="512px"
        ref={canvasRef}
        style={{ border: "1px solid black", margin: "25px 0px" }}
        onMouseDown={(e) => draw(e, canvasRef)}
      />
    </div>
  );
}

export default App;
