# MCP Server - Bedrock Agent Creator

Servidor MCP (Model Context Protocol) que proporciona herramientas para crear y gestionar agentes de AWS Bedrock.

## Características

- **Creación de agentes**: Crear nuevos agentes de Bedrock con configuración personalizada
- **Gestión de agentes**: Actualizar, listar y preparar agentes
- **Aliases**: Crear aliases para versionado de agentes
- **IAM automático**: Creación automática de roles IAM para agentes
- **Autenticación**: Token de autenticación para seguridad

## Instalación

```bash
cd mcp-server-example
npm install
```

## Configuración

Crea un archivo `.env` basado en `.env.example`:

```bash
PORT=8080
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=060755573124
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
MCP_AUTH_TOKEN=dev-token-12345
```

## Uso

### Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:8080`

### Endpoints

#### POST /mcp

Endpoint principal para ejecutar herramientas MCP.

**Listar herramientas disponibles:**

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-12345" \
  -d '{
    "method": "list_tools"
  }'
```

**Crear un agente:**

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-12345" \
  -d '{
    "method": "execute_tool",
    "params": {
      "tool": "create_bedrock_agent",
      "parameters": {
        "agentName": "analytics-sql-assistant",
        "description": "Agente para consultas SQL del proyecto Analytics",
        "instructions": "Eres un asistente especializado en SQL para el proyecto Analytics.",
        "foundationModel": "anthropic.claude-3-haiku-20240307-v1:0",
        "projectName": "Analytics",
        "department": "Data"
      }
    }
  }'
```

#### GET /health

Health check del servidor.

```bash
curl http://localhost:8080/health
```

## Herramientas Disponibles

### 1. create_bedrock_agent

Crea un nuevo agente de Bedrock con las siguientes características:
- Crea automáticamente el rol IAM necesario
- Configura el modelo foundation (Claude 3 Haiku por defecto)
- Aplica tags para organización
- Prepara el agente automáticamente

**Parámetros:**
- `agentName` (requerido): Nombre único del agente
- `instructions` (requerido): Instrucciones detalladas del comportamiento
- `projectName` (requerido): Nombre del proyecto para tags
- `description` (opcional): Descripción del agente
- `foundationModel` (opcional): ID del modelo (default: Claude 3 Haiku)
- `department` (opcional): Departamento propietario
- `idleSessionTTLInSeconds` (opcional): TTL de sesión (default: 600)

### 2. update_bedrock_agent

Actualiza la configuración de un agente existente.

**Parámetros:**
- `agentId` (requerido): ID del agente a actualizar
- `agentName` (opcional): Nuevo nombre
- `description` (opcional): Nueva descripción
- `instructions` (opcional): Nuevas instrucciones
- `foundationModel` (opcional): Nuevo modelo

### 3. list_bedrock_agents

Lista todos los agentes de Bedrock.

**Parámetros:**
- `maxResults` (opcional): Máximo de resultados (default: 10)
- `filters` (opcional): Objeto con filtros (ej: `{Project: "Analytics"}`)

### 4. prepare_bedrock_agent

Prepara un agente para uso en producción (crea versión DRAFT lista).

**Parámetros:**
- `agentId` (requerido): ID del agente a preparar

### 5. create_agent_alias

Crea un alias para un agente (útil para versionado).

**Parámetros:**
- `agentId` (requerido): ID del agente
- `aliasName` (requerido): Nombre del alias (ej: "production", "staging")
- `description` (opcional): Descripción del alias

## Integración con Bedrock Agent

Este servidor MCP está diseñado para ser llamado por el Lambda bridge (`bedrock-mcp-bridge`) que actúa como intermediario entre el Bedrock Agent y este servidor.

### Flujo de integración:

1. **Usuario** envía mensaje al chat → WebSocket
2. **Backend NestJS** → invoca Bedrock Agent Runtime
3. **Bedrock Agent** decide usar herramienta → llama Action Group
4. **Action Group** → ejecuta Lambda bridge
5. **Lambda bridge** → llama a este MCP Server
6. **MCP Server** → ejecuta operación en AWS SDK
7. **Respuesta** viaja de vuelta al usuario

## Permisos IAM Necesarios

El usuario/rol que ejecuta este servidor necesita los siguientes permisos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:CreateAgent",
        "bedrock:UpdateAgent",
        "bedrock:ListAgents",
        "bedrock:PrepareAgent",
        "bedrock:CreateAgentAlias",
        "bedrock:GetAgent",
        "bedrock-agent:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:GetRole"
      ],
      "Resource": "arn:aws:iam::*:role/AmazonBedrockExecutionRoleForAgents_*"
    }
  ]
}
```

## Seguridad

- **Autenticación**: Todas las requests requieren el header `Authorization: Bearer <token>`
- **Validación**: El servidor valida todos los parámetros antes de ejecutar
- **Roles IAM**: Crea roles con permisos mínimos para cada agente
- **Account ID**: Valida que los roles solo sean asumidos por Bedrock en tu cuenta

## Desarrollo

Para desarrollo con auto-reload:

```bash
npm install -D nodemon
npm run dev
```

## Logs

El servidor registra:
- Todas las requests recibidas
- Creación de roles IAM
- Operaciones de agentes
- Errores con stack traces

## Troubleshooting

### Error: "Access denied"

Verifica que las credenciales AWS tengan los permisos necesarios.

### Error: "Role already exists"

El servidor reutiliza roles existentes automáticamente.

### Error: "Unauthorized"

Verifica que el token en el header Authorization coincida con `MCP_AUTH_TOKEN`.

## Arquitectura

```
┌─────────────────┐
│   Bedrock Agent │
│   (Main Agent)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Action Group    │
│ (OpenAPI Schema)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lambda Bridge  │
│ (bedrock-mcp-   │
│     bridge)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Server     │◄── Este servidor
│ (Express + SDK) │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   AWS Bedrock   │
│   AWS IAM       │
└─────────────────┘
```

## Próximos pasos

Para poner en producción este servidor:

1. **Desplegar en EC2/ECS**: El servidor debe estar accesible desde Lambda
2. **Configurar HTTPS**: Usar certificado SSL/TLS
3. **Variables de entorno**: Usar AWS Secrets Manager
4. **Monitoreo**: CloudWatch Logs y métricas
5. **Auto-scaling**: Configurar según demanda
