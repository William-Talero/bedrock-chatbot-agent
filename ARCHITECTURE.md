# Arquitectura del Sistema - Agente de Infraestructura Davivienda

## Propósito del Sistema

Este sistema proporciona un agente inteligente especializado para el personal de Davivienda, diseñado para **automatizar y facilitar la creación y gestión de componentes de infraestructura cloud**.

### Capacidades Principales

El agente puede asistir con:
- ✅ Creación de agentes de AWS Bedrock
- ✅ Aprovisionamiento de máquinas virtuales (EC2)
- ✅ Configuración de recursos de AWS (S3, Lambda, RDS, etc.)
- ✅ Implementación de servicios cloud
- ✅ Gestión de infraestructura como código (IaC)
- ✅ Aplicación de políticas de seguridad bancaria
- ✅ Etiquetado y organización de recursos

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vue)                    │
│                  WebSocket Client (Socket.IO)               │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket Connection
                         │ ws://localhost:3000/chat
┌────────────────────────▼────────────────────────────────────┐
│                   BACKEND (NestJS)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Presentation Layer (WebSocket Gateway)        │  │
│  │              - ChatGateway (Socket.IO)               │  │
│  │              - Real-time bidirectional communication  │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │            Application Layer (Use Cases)             │  │
│  │      - SendMessageUseCase                            │  │
│  │      - GetConversationUseCase                        │  │
│  │      - EndConversationUseCase                        │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │              Domain Layer (Entities)                 │  │
│  │      - Message Entity                                │  │
│  │      - Conversation Entity                           │  │
│  │      - Value Objects (SessionId, MessageContent)     │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │          Infrastructure Layer (Services)             │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │   BedrockAgentService                          │  │  │
│  │  │   - Communicates with AWS Bedrock              │  │  │
│  │  │   - Streams responses                          │  │  │
│  │  └────────────────┬───────────────────────────────┘  │  │
│  │  ┌────────────────▼───────────────────────────────┐  │  │
│  │  │   McpService (Model Context Protocol)         │  │  │
│  │  │   - Extends agent capabilities                │  │  │
│  │  │   - Connects to external tools/APIs           │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │   InMemoryConversationRepository            │  │  │
│  │  │   - Stores conversation history             │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    AWS BEDROCK                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Davivienda Infrastructure Agent                   │  │
│  │   - Agent ID: DDJJQCFXFN                            │  │
│  │   - Model: Claude 3 Haiku                           │  │
│  │   - Purpose: Infrastructure automation              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Componentes Detallados

### 1. Presentation Layer

#### ChatGateway (src/presentation/chat/chat.gateway.ts)
- Maneja conexiones WebSocket usando Socket.IO
- Eventos soportados:
  - `sendMessage` - Recibe mensajes del usuario
  - `getConversation` - Obtiene historial
  - `endConversation` - Finaliza sesión
  - `ping` - Keep-alive
- Emite eventos:
  - `connected` - Confirmación de conexión
  - `messageReceived` - Confirmación de recepción
  - `messageChunk` - Streaming de respuesta
  - `messageComplete` - Respuesta finalizada
  - `error` - Errores

### 2. Application Layer

#### Use Cases (src/application/chat/use-cases/)
- **SendMessageUseCase**: Orquesta el envío de mensajes al agente y manejo de respuestas
- **GetConversationUseCase**: Recupera historial de conversaciones
- **EndConversationUseCase**: Finaliza y limpia sesiones

### 3. Domain Layer

#### Entities (src/domain/chat/entities/)
- **Message**: Representa un mensaje (usuario o asistente)
- **Conversation**: Agrupa mensajes por sesión

#### Value Objects (src/domain/chat/value-objects/)
- **SessionId**: Identificador único de sesión
- **MessageContent**: Contenido validado del mensaje
- **UUID**: Identificadores únicos
- **Timestamp**: Marcas temporales

### 4. Infrastructure Layer

#### BedrockAgentService (src/infrastructure/bedrock/bedrock-agent.service.ts)
```typescript
Responsabilidades:
- Conectar con AWS Bedrock Agent Runtime
- Invocar agente con InvokeAgentCommand
- Procesar respuestas en streaming
- Manejar trazas y errores de Bedrock
```

#### McpService (src/infrastructure/mcp/mcp.service.ts)
```typescript
Responsabilidades:
- Integración con Model Context Protocol
- Ejecutar herramientas externas
- Obtener contextos adicionales
- Extender capacidades del agente
```

Ejemplo de uso futuro:
```typescript
// El agente podría usar MCP para:
await mcpService.executeTool('create_ec2_instance', {
  instanceType: 't3.micro',
  ami: 'ami-12345678',
  tags: { Project: 'Davivienda', Department: 'Infrastructure' }
});
```

#### InMemoryConversationRepository (src/infrastructure/persistence/)
```typescript
Responsabilidades:
- Almacenar conversaciones en memoria
- Gestionar historial por sesión
- Recuperar conversaciones activas
```

---

## Configuración del Agente Bedrock

### Agente: davivienda-infrastructure-agent

```yaml
Agent ID: DDJJQCFXFN
Alias ID: VT6LZZSYA5
Model: Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0)
Region: us-east-1

Instructions:
  Eres un agente especializado de infraestructura para Davivienda.
  Tu misión es ayudar al personal del banco a crear y gestionar
  componentes de infraestructura cloud de manera segura y eficiente.

  Capacidades:
    - Creación de agentes de Bedrock
    - Aprovisionamiento de máquinas virtuales
    - Configuración de recursos de AWS
    - Implementación de servicios cloud
    - Tareas de infraestructura

  Siempre:
    - Validas los permisos necesarios
    - Sigues las mejores prácticas de seguridad bancaria
    - Proporcionas respuestas claras y accionables
    - Etiquetas recursos con información del proyecto, departamento y propósito

Service Role: AmazonBedrockExecutionRoleForAgents_JH1TQQ84FC9
Permissions:
  - bedrock:InvokeModel
  - bedrock:InvokeModelWithResponseStream
  Resource: arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0
```

---

## Seguridad e IAM

### Usuario IAM Dedicado

```yaml
Username: bedrock-agent-backend
Purpose: Usuario con permisos mínimos solo para invocar el agente
Account: 060755573124

Permissions (Policy: BedrockAgentBackendPolicy):
  - bedrock:InvokeAgent
  - bedrock-agent-runtime:InvokeAgent
  - bedrock-agent:GetAgent
  - bedrock-agent:GetAgentAlias

Security Features:
  - Principio de menor privilegio
  - Aislamiento de credenciales
  - Trazabilidad de acciones
  - Rotación de credenciales facilitada
```

### Mejores Prácticas Implementadas

1. **Separación de Responsabilidades**
   - Usuario dedicado por servicio
   - Políticas específicas y mínimas
   - No reutilización de credenciales personales

2. **Seguridad en Capas**
   - Autenticación a nivel de IAM
   - Validación en el backend
   - CORS configurado
   - WebSocket con autenticación

3. **Auditoría**
   - Logs de CloudWatch
   - Trazas de Bedrock activadas
   - Registro de todas las interacciones

---

## Integración MCP (Model Context Protocol)

### ¿Qué es MCP?

Model Context Protocol permite al agente:
- Acceder a herramientas externas
- Consultar APIs corporativas
- Obtener contexto adicional
- Ejecutar acciones en sistemas externos

### Configuración MCP

```env
# En .env
MCP_ENABLED=false
MCP_SERVER_URL=https://mcp-server.davivienda.com
MCP_AUTH_TOKEN=your-secure-token
MCP_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3
```

### Estructura de Integración

```typescript
interface IMcpService {
  isEnabled(): boolean;
  executeTool(toolName: string, params: Record<string, any>): Promise<any>;
  listAvailableTools(): Promise<Tool[]>;
  getContext(contextId: string): Promise<any>;
}
```

### Casos de Uso MCP

1. **Creación de Recursos AWS**
   ```typescript
   mcpService.executeTool('create_ec2_instance', {
     instanceType: 't3.micro',
     region: 'us-east-1'
   });
   ```

2. **Consulta de Inventario**
   ```typescript
   mcpService.executeTool('list_active_resources', {
     department: 'Infrastructure',
     project: 'Davivienda'
   });
   ```

3. **Validación de Políticas**
   ```typescript
   mcpService.executeTool('validate_security_policy', {
     resourceType: 'ec2',
     configuration: {...}
   });
   ```

### Implementación Futura

Para habilitar MCP completamente:

1. **Instalar cliente MCP**
   ```bash
   npm install @modelcontextprotocol/client
   ```

2. **Implementar comunicación en `mcp.service.ts`**
   ```typescript
   private async sendMcpRequest(method: string, params: any) {
     const response = await fetch(this.serverUrl, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${this.authToken}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({ method, params }),
     });
     return response.json();
   }
   ```

3. **Configurar servidor MCP**
   - Desplegar servidor MCP con herramientas necesarias
   - Configurar autenticación
   - Registrar herramientas disponibles

---

## Flujo de Datos

### Flujo de Mensaje Completo

```
1. Usuario envía mensaje
   ↓
2. Frontend emite 'sendMessage' via WebSocket
   ↓
3. ChatGateway recibe evento
   ↓
4. SendMessageUseCase procesa
   ↓
5. Guarda mensaje de usuario en repositorio
   ↓
6. BedrockAgentService invoca agente AWS
   ↓
7. Agente procesa con Claude 3 Haiku
   ↓ (Opcional)
8. Agente usa MCP para acciones externas
   ↓
9. Respuesta llega en streaming (chunks)
   ↓
10. Cada chunk se emite al frontend
   ↓
11. Frontend actualiza UI en tiempo real
   ↓
12. Respuesta completa se guarda en repositorio
   ↓
13. Se emite evento 'messageComplete'
```

### Ejemplo de Interacción

```javascript
// Usuario pregunta
User: "Crea una instancia EC2 t3.micro para el proyecto Analytics"

// Agente procesa
Agent:
  1. Valida permisos del usuario
  2. Verifica configuración de seguridad
  3. (Si MCP habilitado) Ejecuta herramienta create_ec2_instance
  4. Etiqueta instancia con:
     - Project: Analytics
     - Department: Data
     - CreatedBy: Infrastructure-Agent
  5. Retorna detalles de la instancia creada

// Respuesta
Agent: "He creado la instancia EC2 t3.micro para el proyecto Analytics.
        Instance ID: i-1234567890abcdef0
        Estado: running
        Tags aplicados: Project=Analytics, Department=Data
        Siguiente paso: Configurar grupo de seguridad y acceso SSH"
```

---

## Variables de Entorno

### Configuración Completa

```bash
# Servidor
PORT=3000
NODE_ENV=development

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Bedrock Agent
BEDROCK_AGENT_ID=DDJJQCFXFN
BEDROCK_AGENT_ALIAS_ID=VT6LZZSYA5

# MCP (Model Context Protocol)
MCP_ENABLED=false
MCP_SERVER_URL=
MCP_AUTH_TOKEN=
MCP_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3

# CORS
CORS_ORIGIN=http://localhost:3001

# WebSocket
WS_PATH=/chat
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
```

---

## Próximos Pasos de Desarrollo

### Corto Plazo
1. ✅ Configurar agente con propósito de infraestructura
2. ✅ Crear estructura base para MCP
3. ⏳ Implementar cliente MCP completo
4. ⏳ Crear servidor MCP con herramientas
5. ⏳ Integrar con APIs de AWS directamente

### Mediano Plazo
1. Agregar autenticación de usuarios
2. Implementar persistencia en base de datos
3. Crear dashboard de administración
4. Agregar métricas y monitoreo
5. Implementar auditoría completa

### Largo Plazo
1. Multi-tenant support
2. Integración con sistemas Davivienda
3. Automatización de workflows complejos
4. Machine learning para optimizaciones
5. Escalabilidad horizontal

---

## Documentos Relacionados

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Documentación de la API WebSocket
- [AWS_SETUP.md](./AWS_SETUP.md) - Configuración de AWS y permisos
- [README.md](./README.md) - Instrucciones generales del proyecto

---

## Contacto y Soporte

Para preguntas sobre la arquitectura o implementación:
- Equipo: Infraestructura Davivienda
- Proyecto: Agente de Automatización Cloud
- Tecnologías: NestJS, AWS Bedrock, TypeScript, Socket.IO
