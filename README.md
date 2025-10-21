# Bedrock Chatbot Backend

WebSocket bridge entre un frontend de chatbot y AWS Bedrock Agent, implementado con TypeScript, NestJS y arquitectura DDD (Domain-Driven Design).

## Arquitectura

Este proyecto sigue los principios de **Clean Architecture** y **Domain-Driven Design** con una estructura en capas:

```
src/
├── domain/              # Capa de Dominio (Lógica de negocio pura)
│   ├── chat/
│   │   ├── entities/           # Entidades del dominio
│   │   ├── value-objects/      # Value Objects
│   │   ├── repositories/       # Interfaces de repositorios
│   │   └── services/           # Interfaces de servicios de dominio
│   └── shared/                 # Elementos compartidos
│
├── application/         # Capa de Aplicación (Casos de uso)
│   └── chat/
│       ├── dto/                # Data Transfer Objects
│       └── use-cases/          # Casos de uso
│
├── infrastructure/      # Capa de Infraestructura (Implementaciones técnicas)
│   ├── bedrock/               # Implementación de Bedrock Agent
│   ├── persistence/           # Implementación de repositorios
│   └── config/                # Configuraciones
│
└── presentation/        # Capa de Presentación (Controllers/Gateways)
    └── chat/
        └── chat.gateway.ts    # WebSocket Gateway
```

## Principios Aplicados

### SOLID
- **S**ingle Responsibility: Cada clase tiene una única responsabilidad
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Las implementaciones pueden sustituirse sin romper el código
- **I**nterface Segregation: Interfaces específicas y cohesivas
- **D**ependency Inversion: Dependencias apuntan hacia abstracciones

### DDD
- **Entities**: Message, Conversation
- **Value Objects**: UUID, Timestamp, MessageContent, SessionId
- **Repositories**: Interfaces en dominio, implementaciones en infraestructura
- **Aggregates**: Conversation es un aggregate root

### Clean Architecture
- Dependencias fluyen de afuera hacia adentro
- El dominio no depende de nada externo
- Infraestructura implementa interfaces del dominio

## Tecnologías Utilizadas

- **NestJS**: Framework Node.js para aplicaciones escalables
- **TypeScript**: Tipado estático
- **Socket.IO**: WebSocket para comunicación en tiempo real
- **AWS Bedrock Agent**: Servicio de agentes de IA
- **class-validator**: Validación de DTOs

## Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta AWS con acceso a Bedrock Agent
- Bedrock Agent configurado en AWS

## Instalación

```bash
# Clonar el repositorio
cd bedrock-chatbot-backend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus credenciales de AWS
```

## Configuración

Edita el archivo `.env` con tus credenciales:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key

# Bedrock Agent Configuration
BEDROCK_AGENT_ID=tu-agent-id
BEDROCK_AGENT_ALIAS_ID=tu-agent-alias-id

# CORS Configuration
CORS_ORIGIN=http://localhost:3001

# WebSocket Configuration
WS_PATH=/chat
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
```

## Ejecución

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Debug
npm run start:debug
```

## Uso del WebSocket

### Conectar al WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/chat',
  transports: ['websocket']
});

socket.on('connected', (data) => {
  console.log('Connected:', data.clientId);
});
```

### Eventos del Cliente (Emit)

#### 1. Enviar Mensaje
```javascript
socket.emit('sendMessage', {
  sessionId: 'unique-session-id',
  content: 'Hola, ¿cómo estás?',
  metadata: { /* opcional */ }
});
```

#### 2. Obtener Historial de Conversación
```javascript
socket.emit('getConversation', {
  sessionId: 'unique-session-id'
});
```

#### 3. Finalizar Conversación
```javascript
socket.emit('endConversation', {
  sessionId: 'unique-session-id'
});
```

#### 4. Ping (Keep-alive)
```javascript
socket.emit('ping');
```

### Eventos del Servidor (On)

#### 1. Mensaje Recibido
```javascript
socket.on('messageReceived', (data) => {
  console.log('Mensaje recibido:', data.sessionId);
});
```

#### 2. Chunk de Respuesta (Streaming)
```javascript
socket.on('messageChunk', (data) => {
  console.log('Chunk:', data.chunk.content);
  console.log('Completo:', data.chunk.isComplete);
});
```

#### 3. Mensaje Completado
```javascript
socket.on('messageComplete', (data) => {
  console.log('Mensaje completo:', data.sessionId);
});
```

#### 4. Historial de Conversación
```javascript
socket.on('conversationHistory', (data) => {
  console.log('Mensajes:', data.messages);
});
```

#### 5. Conversación Finalizada
```javascript
socket.on('conversationEnded', (data) => {
  console.log('Conversación finalizada:', data.sessionId);
});
```

#### 6. Errores
```javascript
socket.on('error', (data) => {
  console.error('Error:', data.message);
});
```

#### 7. Pong
```javascript
socket.on('pong', () => {
  console.log('Pong received');
});
```

## Ejemplo de Cliente Frontend

```javascript
import io from 'socket.io-client';

class ChatClient {
  constructor() {
    this.socket = io('http://localhost:3000', {
      path: '/chat'
    });

    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('connected', (data) => {
      console.log('Conectado:', data.clientId);
    });

    this.socket.on('messageChunk', (data) => {
      this.handleChunk(data.chunk);
    });

    this.socket.on('messageComplete', () => {
      this.handleComplete();
    });

    this.socket.on('error', (data) => {
      console.error('Error:', data.message);
    });
  }

  sendMessage(sessionId, content) {
    this.socket.emit('sendMessage', {
      sessionId,
      content
    });
  }

  getHistory(sessionId) {
    this.socket.emit('getConversation', { sessionId });
  }

  handleChunk(chunk) {
    // Agregar chunk al UI
    if (!chunk.isComplete) {
      this.appendToMessage(chunk.content);
    }
  }

  handleComplete() {
    // Marcar mensaje como completo
    this.markMessageComplete();
  }
}

// Uso
const chat = new ChatClient();
chat.sendMessage('session-123', 'Hola!');
```

## Estructura de Datos

### SendMessageDto
```typescript
{
  sessionId: string;      // ID único de la sesión
  content: string;        // Contenido del mensaje (max 10000 caracteres)
  metadata?: object;      // Metadatos opcionales
}
```

### MessageResponseDto
```typescript
{
  id: string;            // UUID del mensaje
  sessionId: string;     // ID de la sesión
  role: string;          // 'user' | 'assistant' | 'system'
  content: string;       // Contenido del mensaje
  createdAt: string;     // ISO timestamp
  metadata?: object;     // Metadatos opcionales
}
```

### StreamChunkDto
```typescript
{
  content: string;       // Fragmento de contenido
  isComplete: boolean;   // true si es el último chunk
  metadata?: object;     // Metadatos opcionales
}
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Escalabilidad

### Actualmente
- Repositorio en memoria (InMemoryConversationRepository)
- Adecuado para desarrollo y pruebas

### Para Producción
Reemplazar InMemoryConversationRepository con:
- **DynamoDB**: Para persistencia distribuida
- **PostgreSQL**: Para bases de datos relacionales
- **MongoDB**: Para almacenamiento de documentos

Simplemente crea una nueva implementación de `IConversationRepository` y actualiza el provider en `infrastructure.module.ts`:

```typescript
{
  provide: CONVERSATION_REPOSITORY,
  useClass: DynamoDBConversationRepository, // Nueva implementación
}
```

## Seguridad

- Validación de entrada con class-validator
- Variables de entorno para credenciales
- CORS configurado
- Validación de SessionId con regex

## Mejoras Futuras

- [ ] Autenticación y autorización (JWT)
- [ ] Rate limiting
- [ ] Monitoreo y métricas (CloudWatch, Prometheus)
- [ ] Persistencia con base de datos real
- [ ] Caché con Redis
- [ ] Tests unitarios y E2E completos
- [ ] Documentación API con Swagger
- [ ] Docker y Docker Compose
- [ ] CI/CD pipeline

## Licencia

MIT

## Autor

William Talero
