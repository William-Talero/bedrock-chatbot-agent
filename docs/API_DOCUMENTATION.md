# API Documentation - Bedrock Chatbot Backend

## Conexión WebSocket

### Endpoint
```
ws://localhost:3000/chat
```

### Librería Cliente Recomendada
```javascript
import io from 'socket.io-client';
```

### Establecer Conexión

```javascript
const socket = io('http://localhost:3000', {
  path: '/chat',
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Conectado:', socket.id);
});
```

---

## Eventos del Cliente → Servidor

### 1. `sendMessage` - Enviar Mensaje al Agente

Envía un mensaje al agente de Bedrock y recibe respuesta en streaming.

#### Request Structure
```javascript
socket.emit('sendMessage', {
  sessionId: string,    // ID único de la sesión (persistente por usuario)
  content: string       // Mensaje del usuario
});
```

#### Ejemplo de Request
```javascript
socket.emit('sendMessage', {
  sessionId: 'user-session-12345',
  content: '¿Cuál es la capital de Colombia?'
});
```

---

### 2. `getConversation` - Obtener Historial de Conversación

Obtiene el historial completo de mensajes de una sesión.

#### Request Structure
```javascript
socket.emit('getConversation', {
  sessionId: string     // ID de la sesión a consultar
});
```

#### Ejemplo de Request
```javascript
socket.emit('getConversation', {
  sessionId: 'user-session-12345'
});
```

---

### 3. `endConversation` - Finalizar Conversación

Finaliza una sesión y limpia el historial.

#### Request Structure
```javascript
socket.emit('endConversation', {
  sessionId: string     // ID de la sesión a finalizar
});
```

#### Ejemplo de Request
```javascript
socket.emit('endConversation', {
  sessionId: 'user-session-12345'
});
```

---

### 4. `ping` - Keep-Alive

Mantiene la conexión activa.

#### Request Structure
```javascript
socket.emit('ping');
```

---

## Eventos del Servidor → Cliente

### 1. `connected` - Confirmación de Conexión

Se emite cuando el cliente se conecta exitosamente.

#### Response Structure
```typescript
{
  clientId: string      // ID único del cliente conectado
}
```

#### Ejemplo de Response
```json
{
  "clientId": "abc123xyz789"
}
```

#### Ejemplo de Implementación
```javascript
socket.on('connected', (data) => {
  console.log('Cliente ID:', data.clientId);
});
```

---

### 2. `messageReceived` - Confirmación de Mensaje Recibido

Se emite cuando el servidor recibe el mensaje del cliente.

#### Response Structure
```typescript
{
  sessionId: string,    // ID de la sesión
  timestamp: string     // ISO 8601 timestamp
}
```

#### Ejemplo de Response
```json
{
  "sessionId": "user-session-12345",
  "timestamp": "2025-10-22T12:30:45.123Z"
}
```

#### Ejemplo de Implementación
```javascript
socket.on('messageReceived', (data) => {
  console.log('Mensaje recibido para sesión:', data.sessionId);
});
```

---

### 3. `messageChunk` - Fragmento de Respuesta (Streaming)

Se emite múltiples veces mientras el agente genera la respuesta.

#### Response Structure
```typescript
{
  sessionId: string,
  chunk: {
    content: string,        // Fragmento de texto de la respuesta
    isComplete: boolean,    // true cuando es el último chunk
    metadata?: {            // Solo presente en el último chunk
      totalLength: number   // Longitud total de la respuesta
    }
  }
}
```

#### Ejemplo de Response (Chunk intermedio)
```json
{
  "sessionId": "user-session-12345",
  "chunk": {
    "content": "La capital de ",
    "isComplete": false
  }
}
```

#### Ejemplo de Response (Último chunk)
```json
{
  "sessionId": "user-session-12345",
  "chunk": {
    "content": "",
    "isComplete": true,
    "metadata": {
      "totalLength": 31
    }
  }
}
```

#### Ejemplo de Implementación
```javascript
let fullResponse = '';

socket.on('messageChunk', (data) => {
  if (data.chunk.isComplete) {
    console.log('Respuesta completa:', fullResponse);
    console.log('Longitud total:', data.chunk.metadata.totalLength);
  } else {
    fullResponse += data.chunk.content;
    // Actualizar UI con el fragmento en tiempo real
    updateChatUI(data.chunk.content);
  }
});
```

---

### 4. `messageComplete` - Respuesta Completada

Se emite cuando la respuesta del agente está completa.

#### Response Structure
```typescript
{
  sessionId: string,
  timestamp: string,        // ISO 8601 timestamp
  message: {
    id: string,             // UUID del mensaje
    role: 'assistant',      // Siempre 'assistant' para respuestas del agente
    content: string,        // Contenido completo de la respuesta
    timestamp: string       // ISO 8601 timestamp
  }
}
```

#### Ejemplo de Response
```json
{
  "sessionId": "user-session-12345",
  "timestamp": "2025-10-22T12:30:50.456Z",
  "message": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "role": "assistant",
    "content": "La capital de Colombia es Bogotá.",
    "timestamp": "2025-10-22T12:30:50.456Z"
  }
}
```

#### Ejemplo de Implementación
```javascript
socket.on('messageComplete', (data) => {
  console.log('Mensaje completo guardado:', data.message);
  // Guardar mensaje en el historial local
  saveToHistory(data.message);
});
```

---

### 5. `conversation` - Historial de Conversación

Se emite como respuesta al evento `getConversation`.

#### Response Structure
```typescript
{
  sessionId: string,
  messages: Array<{
    id: string,
    role: 'user' | 'assistant',
    content: string,
    timestamp: string       // ISO 8601 timestamp
  }>
}
```

#### Ejemplo de Response
```json
{
  "sessionId": "user-session-12345",
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "¿Cuál es la capital de Colombia?",
      "timestamp": "2025-10-22T12:30:45.123Z"
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "La capital de Colombia es Bogotá.",
      "timestamp": "2025-10-22T12:30:50.456Z"
    },
    {
      "id": "msg-003",
      "role": "user",
      "content": "¿Y cuál es su población?",
      "timestamp": "2025-10-22T12:31:00.789Z"
    },
    {
      "id": "msg-004",
      "role": "assistant",
      "content": "Bogotá tiene aproximadamente 8 millones de habitantes.",
      "timestamp": "2025-10-22T12:31:05.012Z"
    }
  ]
}
```

#### Ejemplo de Implementación
```javascript
socket.on('conversation', (data) => {
  console.log('Historial de conversación:', data.messages);
  // Renderizar historial en la UI
  renderConversationHistory(data.messages);
});
```

---

### 6. `conversationEnded` - Conversación Finalizada

Se emite cuando se finaliza una conversación exitosamente.

#### Response Structure
```typescript
{
  sessionId: string,
  timestamp: string         // ISO 8601 timestamp
}
```

#### Ejemplo de Response
```json
{
  "sessionId": "user-session-12345",
  "timestamp": "2025-10-22T12:35:00.000Z"
}
```

#### Ejemplo de Implementación
```javascript
socket.on('conversationEnded', (data) => {
  console.log('Conversación finalizada:', data.sessionId);
  // Limpiar UI y estado local
  clearChat();
});
```

---

### 7. `pong` - Respuesta a Keep-Alive

Se emite como respuesta al evento `ping`.

#### Response Structure
```typescript
{
  timestamp: string         // ISO 8601 timestamp
}
```

#### Ejemplo de Response
```json
{
  "timestamp": "2025-10-22T12:40:00.000Z"
}
```

#### Ejemplo de Implementación
```javascript
socket.on('pong', (data) => {
  console.log('Pong recibido:', data.timestamp);
});
```

---

### 8. `error` - Error General

Se emite cuando ocurre un error durante el procesamiento.

#### Response Structure
```typescript
{
  sessionId?: string,       // Puede estar presente si el error es específico de sesión
  message: string,          // Mensaje descriptivo del error
  timestamp?: string        // ISO 8601 timestamp (opcional)
}
```

#### Ejemplo de Response
```json
{
  "sessionId": "user-session-12345",
  "message": "Failed to send message: Bedrock Agent error: Access denied"
}
```

#### Ejemplo de Implementación
```javascript
socket.on('error', (error) => {
  console.error('Error:', error.message);
  // Mostrar mensaje de error al usuario
  showErrorNotification(error.message);
});
```

---

## Ejemplo de Implementación Completa

```javascript
import io from 'socket.io-client';

class BedrockChatClient {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.fullResponse = '';
  }

  connect() {
    this.socket = io('http://localhost:3000', {
      path: '/chat',
      transports: ['websocket'],
    });

    // Evento: Conexión establecida
    this.socket.on('connected', (data) => {
      console.log('✅ Conectado. Client ID:', data.clientId);
    });

    // Evento: Mensaje recibido por el servidor
    this.socket.on('messageReceived', (data) => {
      console.log('📨 Mensaje recibido:', data.sessionId);
    });

    // Evento: Fragmentos de respuesta (streaming)
    this.socket.on('messageChunk', (data) => {
      if (data.chunk.isComplete) {
        console.log('✅ Respuesta completa');
        console.log('Texto final:', this.fullResponse);
        this.fullResponse = '';
      } else {
        this.fullResponse += data.chunk.content;
        // Actualizar UI en tiempo real
        this.updateChat(data.chunk.content);
      }
    });

    // Evento: Mensaje completado
    this.socket.on('messageComplete', (data) => {
      console.log('💾 Mensaje guardado:', data.message);
    });

    // Evento: Historial de conversación
    this.socket.on('conversation', (data) => {
      console.log('📜 Historial:', data.messages);
      this.renderHistory(data.messages);
    });

    // Evento: Conversación finalizada
    this.socket.on('conversationEnded', (data) => {
      console.log('🏁 Conversación finalizada:', data.sessionId);
      this.clearChat();
    });

    // Evento: Respuesta a ping
    this.socket.on('pong', (data) => {
      console.log('🏓 Pong:', data.timestamp);
    });

    // Evento: Error
    this.socket.on('error', (error) => {
      console.error('❌ Error:', error.message);
      this.showError(error.message);
    });

    // Evento: Desconexión
    this.socket.on('disconnect', () => {
      console.log('🔌 Desconectado del servidor');
    });
  }

  // Generar o recuperar sessionId único por usuario
  getOrCreateSessionId(userId) {
    if (!this.sessionId) {
      this.sessionId = `user-${userId}-${Date.now()}`;
    }
    return this.sessionId;
  }

  // Enviar mensaje
  sendMessage(userId, message) {
    const sessionId = this.getOrCreateSessionId(userId);
    this.socket.emit('sendMessage', {
      sessionId: sessionId,
      content: message
    });
  }

  // Obtener historial
  getHistory(sessionId) {
    this.socket.emit('getConversation', {
      sessionId: sessionId
    });
  }

  // Finalizar conversación
  endConversation(sessionId) {
    this.socket.emit('endConversation', {
      sessionId: sessionId
    });
    this.sessionId = null;
  }

  // Keep-alive
  ping() {
    this.socket.emit('ping');
  }

  // Métodos auxiliares (implementar según tu UI)
  updateChat(content) {
    // Actualizar UI con contenido en streaming
  }

  renderHistory(messages) {
    // Renderizar historial de mensajes
  }

  clearChat() {
    // Limpiar chat en UI
  }

  showError(message) {
    // Mostrar error en UI
  }
}

// Uso
const chatClient = new BedrockChatClient();
chatClient.connect();

// Enviar mensaje
chatClient.sendMessage('user123', '¿Cuál es la capital de Colombia?');

// Obtener historial
chatClient.getHistory('user-user123-1234567890');

// Finalizar conversación
chatClient.endConversation('user-user123-1234567890');
```

---

## Notas Importantes

### Session ID
- Debe ser único por usuario y persistente durante la conversación
- Formato recomendado: `user-{userId}-{timestamp}` o usar UUID
- El mismo `sessionId` mantiene el contexto de la conversación

### Streaming
- Las respuestas llegan en fragmentos (`messageChunk`) para mejor UX
- Acumula los fragmentos en el cliente hasta recibir `isComplete: true`

### Manejo de Errores
- Siempre escuchar el evento `error` para manejar fallos
- Los errores pueden incluir o no `sessionId` dependiendo del contexto

### Reconexión
- Socket.IO maneja reconexiones automáticamente
- Implementar lógica para recuperar estado si es necesario

### CORS
- Actualmente configurado para: `http://localhost:3001`
- Ajustar en `.env` variable `CORS_ORIGIN` para producción

---

## Configuración del Servidor

### Variables de Entorno Relevantes
```bash
PORT=3000                               # Puerto del servidor
CORS_ORIGIN=http://localhost:3001      # Origen permitido para CORS
WS_PATH=/chat                          # Path del WebSocket
WS_PING_TIMEOUT=60000                  # Timeout para ping (ms)
WS_PING_INTERVAL=25000                 # Intervalo de ping (ms)
```

### URL de Conexión
- **Desarrollo**: `ws://localhost:3000/chat`
- **Producción**: Ajustar según dominio
