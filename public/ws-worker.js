// ======================================================
// PHASE 4 — WEB WORKER
// public/ws-worker.js
// ======================================================

let ws

self.onmessage = (event) => {

  if (event.data.type === "CONNECT") {

    ws = new WebSocket(event.data.url)

    ws.onmessage = (msg) => {
      self.postMessage(msg.data)
    }
  }
}