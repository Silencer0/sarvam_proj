/** Native WebSocket transport. No combat simulation or credentials live here. */
export function createMultiplayerClient({
  onState,
  onCast,
  onError,
  onClose,
} = {}) {
  let socket = null,
    id = null,
    intentional = false;
  function send(message) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
  async function connect() {
    intentional = false;
    return new Promise((resolve, reject) => {
      let welcomed = false;
      const current = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      socket = current;
      const timer = setTimeout(() => {
        current.close();
        reject(Error("Multiplayer connection timed out. Please try again."));
      }, 10000);
      current.onmessage = (e) => {
        let data;
        try {
          data = JSON.parse(e.data);
        } catch {
          return;
        }
        if (current !== socket) return;
        if (data.type === "welcome") {
          id = data.id;
          welcomed = true;
          clearTimeout(timer);
          resolve(id);
        } else if (data.type === "state") onState?.(data, id);
        else if (data.type === "cast") onCast?.(data, id);
        else if (data.type === "error") onError?.(data.message);
      };
      current.onerror = () => {
        if (!welcomed) {
          clearTimeout(timer);
          reject(Error("Could not connect to the arena server."));
        }
      };
      current.onclose = () => {
        clearTimeout(timer);
        if (current !== socket) return;
        socket = null;
        if (!welcomed) reject(Error("Arena connection closed."));
        if (!intentional) onClose?.();
      };
    });
  }
  function leave() {
    intentional = true;
    send({ type: "leave" });
    socket?.close();
    socket = null;
    id = null;
  }
  return {
    connect,
    create: () => send({ type: "create" }),
    join: (code) => send({ type: "join", code }),
    move: (x, z) => send({ type: "move", x, z }),
    cast: (command) => send({ type: "cast", command }),
    leave,
    close: leave,
    get id() {
      return id;
    },
  };
}
