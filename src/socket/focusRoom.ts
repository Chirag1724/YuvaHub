import { Server, Socket } from "socket.io";

const FOCUS_DURATION = 50 * 60; // 50 minutes
const BREAK_DURATION = 10 * 60; // 10 minutes

let currentPhase: "focus" | "break" = "focus";
let remainingSeconds = FOCUS_DURATION;
let timerInterval: NodeJS.Timeout | null = null;
let ioInstance: Server | null = null;

const startGlobalTimer = () => {
  if (timerInterval) return; // Already running

  timerInterval = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      // Switch phase
      if (currentPhase === "focus") {
        currentPhase = "break";
        remainingSeconds = BREAK_DURATION;
      } else {
        currentPhase = "focus";
        remainingSeconds = FOCUS_DURATION;
      }
    }

    if (ioInstance) {
      ioInstance.to("global_focus_room").emit("timer_tick", {
        phase: currentPhase,
        remainingSeconds,
      });
    }
  }, 1000);
};

export const setupFocusRoom = (io: Server) => {
  ioInstance = io;
  startGlobalTimer();

  io.on("connection", (socket: Socket) => {
    socket.on("joinFocusRoom", () => {
      socket.join("global_focus_room");
      
      // Emit current state to the joining user immediately
      socket.emit("timer_tick", {
        phase: currentPhase,
        remainingSeconds,
      });

      // Broadcast updated user count
      const roomSize = io.sockets.adapter.rooms.get("global_focus_room")?.size || 0;
      io.to("global_focus_room").emit("user_count_update", roomSize);
      console.log(`[Socket] User ${socket.id} joined focus room. Total: ${roomSize}`);
    });

    socket.on("leaveFocusRoom", () => {
      socket.leave("global_focus_room");
      
      const roomSize = io.sockets.adapter.rooms.get("global_focus_room")?.size || 0;
      io.to("global_focus_room").emit("user_count_update", roomSize);
      console.log(`[Socket] User ${socket.id} left focus room. Total: ${roomSize}`);
    });

    socket.on("disconnect", () => {
      // Disconnect automatically removes them from rooms, but we might want to update the count
      // if they were in the focus room. We can just broadcast the size just in case,
      // or rely on a slight delay for the adapter to update.
      setTimeout(() => {
        const roomSize = io.sockets.adapter.rooms.get("global_focus_room")?.size || 0;
        io.to("global_focus_room").emit("user_count_update", roomSize);
      }, 100);
    });
  });
};
