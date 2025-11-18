import { serve } from "bun";

type WebSocketData = {
  createdAt: number;
  channelId: string;
  authToken: string;
};

serve({
  port: 3000,
  fetch(req, server) {
    const cookies = new Bun.CookieMap(req.headers.get("cookie")!);

    server.upgrade(req, {
      // this object must conform to WebSocketData
      data: {
        createdAt: Date.now(),
        channelId: new URL(req.url).searchParams.get("channelId") ?? "",
        authToken: cookies.get("X-Token") ?? "",
      },
    });

    return undefined;
  },
  websocket: {
    data: {} as WebSocketData,
    message(ws, message) {
      console.log("ws", ws);
      console.log("message", message)
      ws.sendText("to");
    },
    open(ws) {
      console.log("someone connected");
    },
  },
});
