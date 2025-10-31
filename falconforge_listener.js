import http from "http";

const PORT = 8080;

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      console.log("📬 Incoming webhook:", body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", received: true, body: JSON.parse(body) }));
    });
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("FalconForge webhook listener active");
  }
});

server.listen(PORT, () => {
  console.log(`🛰️  FalconForge local listener running at http://localhost:${PORT}/v3/cap/log`);
});
