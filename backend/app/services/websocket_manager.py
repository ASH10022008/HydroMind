from __future__ import annotations
import json
from typing import List, Dict, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket] Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket] Client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]) -> None:
        dead_connections: List[WebSocket] = []
        payload_text = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload_text)
            except Exception as e:
                print(f"[WebSocket] Error broadcasting to client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

ws_manager = WebSocketManager()
