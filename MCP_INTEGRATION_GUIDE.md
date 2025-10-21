# Guía de Integración MCP (Model Context Protocol)

## ¿Qué es MCP?

Model Context Protocol (MCP) es un protocolo abierto que permite a los agentes de IA acceder a herramientas externas, APIs y fuentes de datos de manera estandarizada. Para el Agente de Infraestructura Davivienda, MCP permite:

- 🔧 **Ejecutar herramientas de AWS**: Crear EC2, S3, Lambda, etc.
- 📊 **Consultar inventarios**: Ver recursos existentes
- 🔐 **Validar políticas**: Verificar compliance y seguridad
- 📝 **Gestionar IaC**: Terraform, CloudFormation
- 🔄 **Integrarse con sistemas internos**: APIs de Davivienda

---

## Estructura del Proyecto MCP

```
src/infrastructure/mcp/
├── mcp.service.interface.ts    # Interfaz del servicio MCP
├── mcp.service.ts               # Implementación del servicio MCP
└── README.md                    # Documentación del servicio

src/infrastructure/config/
└── mcp.config.ts                # Configuración de MCP
```

---

## Paso 1: Configuración Básica

### 1.1. Habilitar MCP en .env

```bash
# En .env
MCP_ENABLED=true
MCP_SERVER_URL=http://localhost:8080/mcp
MCP_AUTH_TOKEN=your-secure-token-here
MCP_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3
```

### 1.2. Reiniciar el Servidor

```bash
npm run start:dev
```

---

## Paso 2: Crear Servidor MCP

### Opción A: Servidor MCP con Node.js

```typescript
// mcp-server/server.ts
import express from 'express';
import { MCPServer } from '@modelcontextprotocol/server';

const app = express();
app.use(express.json());

// Middleware de autenticación
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.MCP_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Endpoint MCP
app.post('/mcp', async (req, res) => {
  const { method, params } = req.body;

  try {
    const result = await handleMcpRequest(method, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function handleMcpRequest(method: string, params: any) {
  switch (method) {
    case 'list_tools':
      return {
        tools: [
          { name: 'create_ec2_instance', description: 'Create an EC2 instance' },
          { name: 'create_s3_bucket', description: 'Create an S3 bucket' },
          { name: 'list_resources', description: 'List AWS resources' },
        ]
      };

    case 'execute_tool':
      return await executeTool(params.tool, params.parameters);

    case 'get_context':
      return await getContext(params.context_id);

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

async function executeTool(toolName: string, params: any) {
  switch (toolName) {
    case 'create_ec2_instance':
      return await createEC2Instance(params);
    case 'create_s3_bucket':
      return await createS3Bucket(params);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

app.listen(8080, () => {
  console.log('MCP Server running on port 8080');
});
```

### Opción B: Usar SDK de MCP

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
import { MCPServer, Tool } from '@modelcontextprotocol/sdk';

const server = new MCPServer({
  name: 'Davivienda Infrastructure Tools',
  version: '1.0.0',
});

// Registrar herramientas
server.registerTool({
  name: 'create_ec2_instance',
  description: 'Creates an EC2 instance with specified configuration',
  inputSchema: {
    type: 'object',
    properties: {
      instanceType: { type: 'string', description: 'EC2 instance type (e.g., t3.micro)' },
      ami: { type: 'string', description: 'AMI ID' },
      tags: { type: 'object', description: 'Resource tags' },
    },
    required: ['instanceType', 'ami'],
  },
  handler: async (params) => {
    // Implementar lógica de creación de EC2
    const result = await AWS.EC2.createInstance(params);
    return result;
  },
});

server.start(8080);
```

---

## Paso 3: Implementar Herramientas AWS

### Ejemplo: Crear Instancia EC2

```typescript
import { EC2Client, RunInstancesCommand } from '@aws-sdk/client-ec2';

async function createEC2Instance(params: {
  instanceType: string;
  ami: string;
  tags?: Record<string, string>;
}) {
  const ec2Client = new EC2Client({ region: 'us-east-1' });

  const command = new RunInstancesCommand({
    ImageId: params.ami,
    InstanceType: params.instanceType,
    MinCount: 1,
    MaxCount: 1,
    TagSpecifications: params.tags ? [{
      ResourceType: 'instance',
      Tags: Object.entries(params.tags).map(([key, value]) => ({
        Key: key,
        Value: value,
      })),
    }] : undefined,
  });

  const response = await ec2Client.send(command);

  return {
    instanceId: response.Instances[0].InstanceId,
    state: response.Instances[0].State.Name,
    instanceType: response.Instances[0].InstanceType,
    message: 'EC2 instance created successfully',
  };
}
```

### Ejemplo: Crear Bucket S3

```typescript
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';

async function createS3Bucket(params: {
  bucketName: string;
  region?: string;
  tags?: Record<string, string>;
}) {
  const s3Client = new S3Client({ region: params.region || 'us-east-1' });

  const command = new CreateBucketCommand({
    Bucket: params.bucketName,
    CreateBucketConfiguration: {
      LocationConstraint: params.region || 'us-east-1',
    },
  });

  await s3Client.send(command);

  return {
    bucketName: params.bucketName,
    region: params.region || 'us-east-1',
    message: 'S3 bucket created successfully',
  };
}
```

---

## Paso 4: Completar Implementación del Cliente MCP

### Actualizar `mcp.service.ts`

```typescript
private async sendMcpRequest(method: string, params: any): Promise<any> {
  if (!this.serverUrl) {
    throw new Error('MCP server URL not configured');
  }

  this.logger.debug(`Sending MCP request: ${method}`, params);

  try {
    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        method,
        params,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.logger.debug(`MCP response:`, data);

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`MCP request timeout after ${this.timeout}ms`);
    }
    throw error;
  }
}
```

---

## Paso 5: Integrar MCP con el Agente Bedrock

### Opción A: Como Action Group de Bedrock

AWS Bedrock permite registrar Action Groups que el agente puede invocar:

```bash
# Crear Action Group
aws bedrock-agent create-agent-action-group \
  --agent-id DDJJQCFXFN \
  --agent-version DRAFT \
  --action-group-name infrastructure-tools \
  --action-group-executor lambda=arn:aws:lambda:us-east-1:ACCOUNT:function:mcp-bridge \
  --api-schema file://mcp-schema.json \
  --region us-east-1
```

```json
// mcp-schema.json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Infrastructure Tools API",
    "version": "1.0.0"
  },
  "paths": {
    "/create-ec2": {
      "post": {
        "summary": "Create EC2 instance",
        "operationId": "createEC2Instance",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/EC2Request"
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "EC2Request": {
        "type": "object",
        "properties": {
          "instanceType": { "type": "string" },
          "ami": { "type": "string" },
          "tags": { "type": "object" }
        },
        "required": ["instanceType", "ami"]
      }
    }
  }
}
```

### Opción B: Procesamiento Post-Respuesta

Interceptar respuestas del agente y ejecutar acciones vía MCP:

```typescript
// En BedrockAgentService
async *sendMessage(sessionId: SessionId, message: MessageContent) {
  // ... código existente ...

  // Después de obtener respuesta del agente
  if (this.mcpService.isEnabled()) {
    const actionIntent = this.extractActionIntent(fullContent);
    if (actionIntent) {
      const result = await this.mcpService.executeTool(
        actionIntent.tool,
        actionIntent.params
      );

      yield {
        content: `\n\nAcción ejecutada: ${JSON.stringify(result)}`,
        isComplete: false,
      };
    }
  }
}
```

---

## Paso 6: Casos de Uso Específicos

### Caso 1: Crear Infraestructura Completa

```typescript
// Usuario: "Crea un entorno completo para el proyecto Analytics"

// El agente detecta y ejecuta:
const actions = [
  {
    tool: 'create_vpc',
    params: { cidr: '10.0.0.0/16', tags: { Project: 'Analytics' } }
  },
  {
    tool: 'create_ec2_instance',
    params: {
      instanceType: 't3.micro',
      ami: 'ami-12345678',
      subnet: 'subnet-xxx',
      tags: { Project: 'Analytics', Role: 'WebServer' }
    }
  },
  {
    tool: 'create_rds_instance',
    params: {
      engine: 'postgres',
      instanceClass: 'db.t3.micro',
      tags: { Project: 'Analytics', Role: 'Database' }
    }
  },
];

for (const action of actions) {
  await mcpService.executeTool(action.tool, action.params);
}
```

### Caso 2: Validar Configuración

```typescript
// Usuario: "Valida que mi instancia EC2 cumple con las políticas de seguridad"

const validation = await mcpService.executeTool('validate_security_policy', {
  resourceType: 'ec2',
  resourceId: 'i-1234567890',
  policies: ['encryption', 'vpc-isolation', 'backup-enabled']
});

// Respuesta:
{
  valid: false,
  violations: [
    {
      policy: 'encryption',
      severity: 'high',
      message: 'EBS volumes are not encrypted'
    }
  ],
  recommendations: [
    'Enable EBS encryption on all volumes',
    'Enable encryption in transit'
  ]
}
```

### Caso 3: Inventario y Costos

```typescript
// Usuario: "Muéstrame todos los recursos del proyecto Analytics y su costo mensual"

const inventory = await mcpService.executeTool('list_resources', {
  filters: { Project: 'Analytics' },
  includeCosts: true
});

// Respuesta:
{
  resources: [
    {
      type: 'ec2',
      id: 'i-12345',
      monthlyCost: 7.30,
      status: 'running'
    },
    {
      type: 'rds',
      id: 'db-analytics',
      monthlyCost: 15.20,
      status: 'available'
    }
  ],
  totalMonthlyCost: 22.50
}
```

---

## Paso 7: Seguridad y Mejores Prácticas

### 1. Autenticación

```typescript
// Usar tokens JWT
const token = jwt.sign(
  {
    service: 'bedrock-agent',
    permissions: ['create:ec2', 'create:s3', 'read:inventory']
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
```

### 2. Validación de Permisos

```typescript
async function validatePermission(user: string, action: string): Promise<boolean> {
  // Verificar contra IAM o sistema interno
  const permissions = await getUser Permissions(user);
  return permissions.includes(action);
}
```

### 3. Auditoría

```typescript
async function logAction(action: string, params: any, result: any) {
  await auditLog.create({
    timestamp: new Date(),
    service: 'mcp',
    action,
    parameters: params,
    result,
    user: getCurrentUser(),
  });
}
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const mcpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // max 100 requests por ventana
  message: 'Too many MCP requests, please try again later',
});

app.use('/mcp', mcpLimiter);
```

---

## Paso 8: Testing

### Test de Integración MCP

```typescript
// test/mcp.integration.spec.ts
describe('MCP Integration', () => {
  let mcpService: McpService;

  beforeEach(() => {
    mcpService = new McpService(configService);
  });

  it('should list available tools', async () => {
    const tools = await mcpService.listAvailableTools();
    expect(tools).toContain({ name: 'create_ec2_instance' });
  });

  it('should execute create_ec2_instance tool', async () => {
    const result = await mcpService.executeTool('create_ec2_instance', {
      instanceType: 't3.micro',
      ami: 'ami-test123',
    });

    expect(result.instanceId).toBeDefined();
    expect(result.state).toBe('running');
  });
});
```

---

## Troubleshooting

### Error: "MCP is not enabled"
```bash
# Verificar .env
grep MCP_ENABLED .env
# Debe ser: MCP_ENABLED=true
```

### Error: "MCP server unreachable"
```bash
# Verificar que el servidor MCP esté corriendo
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"method":"list_tools","params":{}}'
```

### Error: "Unauthorized"
```bash
# Verificar token en .env
grep MCP_AUTH_TOKEN .env
# Asegurarse de que coincida con el token del servidor
```

---

## Recursos Adicionales

- [MCP Specification](https://modelcontextprotocol.io/docs)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Bedrock Action Groups](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-action-groups.html)

---

## Próximos Pasos

1. ✅ Estructura base de MCP creada
2. ⏳ Implementar servidor MCP
3. ⏳ Crear herramientas de AWS
4. ⏳ Integrar con Action Groups de Bedrock
5. ⏳ Agregar auditoría y seguridad
6. ⏳ Crear dashboard de monitoreo

---

## Soporte

Para preguntas sobre la integración MCP:
- Equipo: Infraestructura Davivienda
- Documentación: [ARCHITECTURE.md](./ARCHITECTURE.md)
