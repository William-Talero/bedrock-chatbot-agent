# Action Groups - Integración MCP

## ¿Qué son los Action Groups?

Los Action Groups permiten al agente de Bedrock ejecutar herramientas externas durante su razonamiento. Cuando el agente decide que necesita realizar una acción (como crear una instancia EC2), invoca automáticamente la herramienta correspondiente a través del Action Group.

## Arquitectura Implementada

```
Usuario → Backend NestJS → Bedrock Agent → Action Group → Lambda → MCP Server → AWS APIs
```

### Flujo Completo:

1. **Usuario solicita**: "Crea una instancia EC2 t3.micro para el proyecto Analytics"
2. **Agente Bedrock analiza** y determina que necesita usar la herramienta `createEC2Instance`
3. **Action Group** recibe la invocación con los parámetros extraídos
4. **Lambda (mcp-bridge)** traduce la solicitud al formato MCP
5. **Servidor MCP** ejecuta la acción real (crear EC2 en AWS)
6. **Respuesta** fluye de vuelta al agente
7. **Agente responde** al usuario con los detalles de la instancia creada

## Componentes Configurados

### 1. Action Group: `infrastructure-tools`

**ID**: FDBNKJHYJQ
**Estado**: ENABLED
**Lambda**: arn:aws:lambda:us-east-1:060755573124:function:bedrock-mcp-bridge

**Herramientas disponibles:**
- `createEC2Instance` - Crear instancias EC2
- `createS3Bucket` - Crear buckets S3
- `listResources` - Listar recursos por tags
- `createRDSInstance` - Crear instancias RDS

### 2. Lambda Function: `bedrock-mcp-bridge`

**Propósito**: Actúa como puente entre Bedrock y el servidor MCP

**Ubicación**: `lambda/mcp-bridge/index.js`

**Variables de entorno requeridas:**
```bash
MCP_SERVER_URL=http://tu-servidor-mcp:8080/mcp
MCP_AUTH_TOKEN=tu-token-secreto
```

**Mapeo de herramientas:**
```javascript
{
  '/create-ec2': 'create_ec2_instance',
  '/create-s3-bucket': 'create_s3_bucket',
  '/list-resources': 'list_resources',
  '/create-rds': 'create_rds_instance'
}
```

### 3. Esquema OpenAPI

**Ubicación**: `mcp-action-group-schema.json`

Define la interfaz que el agente usa para entender:
- Qué herramientas están disponibles
- Qué parámetros requiere cada una
- Qué formato de respuesta esperar

## Cómo Configurar el Servidor MCP

Para que el agente pueda ejecutar acciones reales, necesitas un servidor MCP funcionando:

### Opción A: Servidor MCP Simple (Para Testing)

```javascript
// mcp-server/index.js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/mcp', (req, res) => {
  const { method, params } = req.body;

  if (method === 'execute_tool') {
    const { tool, parameters } = params;

    console.log(`Ejecutando: ${tool}`, parameters);

    // Simular respuesta
    res.json({
      instanceId: 'i-mock-12345',
      state: 'pending',
      message: `Mock: ${tool} ejecutado con éxito`
    });
  } else {
    res.status(404).json({ error: 'Method not found' });
  }
});

app.listen(8080, () => {
  console.log('MCP Server running on port 8080');
});
```

### Opción B: Servidor MCP Real (Producción)

Implementar herramientas reales que interactúen con AWS:

```javascript
const { EC2Client, RunInstancesCommand } = require('@aws-sdk/client-ec2');

async function createEC2Instance(params) {
  const ec2Client = new EC2Client({ region: 'us-east-1' });

  const command = new RunInstancesCommand({
    ImageId: params.ami,
    InstanceType: params.instanceType,
    MinCount: 1,
    MaxCount: 1,
    TagSpecifications: [{
      ResourceType: 'instance',
      Tags: Object.entries(params.tags).map(([key, value]) => ({
        Key: key,
        Value: value
      }))
    }]
  });

  const response = await ec2Client.send(command);

  return {
    instanceId: response.Instances[0].InstanceId,
    state: response.Instances[0].State.Name,
    instanceType: response.Instances[0].InstanceType,
    message: 'EC2 instance created successfully'
  };
}
```

## Configurar Variables de Entorno Lambda

Una vez que tengas tu servidor MCP funcionando:

```bash
aws lambda update-function-configuration \
  --function-name bedrock-mcp-bridge \
  --environment Variables="{MCP_SERVER_URL=http://tu-servidor-mcp:8080/mcp,MCP_AUTH_TOKEN=tu-token-secreto}" \
  --region us-east-1
```

## Probar la Integración

### 1. Sin Servidor MCP (Solo Testing)

El agente detectará las herramientas pero la Lambda fallará al intentar conectarse al servidor MCP.

```javascript
// Cliente de prueba
socket.emit('sendMessage', {
  sessionId: 'test-session',
  content: 'Lista todas las herramientas disponibles'
});
```

Respuesta esperada del agente:
```
Tengo acceso a las siguientes herramientas:
- createEC2Instance: Crear instancias EC2
- createS3Bucket: Crear buckets S3
- listResources: Listar recursos de infraestructura
- createRDSInstance: Crear instancias RDS
```

### 2. Con Servidor MCP (Funcional)

```javascript
socket.emit('sendMessage', {
  sessionId: 'test-session',
  content: 'Crea una instancia EC2 t3.micro para el proyecto Analytics'
});
```

Respuesta esperada:
```
He creado una instancia EC2 t3.micro para el proyecto Analytics.

Detalles:
- Instance ID: i-1234567890abcdef0
- Estado: pending
- Tipo: t3.micro
- Tags: Project=Analytics, CreatedBy=DaviviendaAgent

La instancia estará lista en unos minutos.
```

## Verificar Logs de Lambda

Para ver si la Lambda se está invocando correctamente:

```bash
aws logs tail /aws/lambda/bedrock-mcp-bridge --follow --region us-east-1
```

## Arquitectura de Permisos

```
Usuario IAM: bedrock-agent-backend
  └─ Permiso: bedrock:InvokeAgent
       └─ Invoca: Agente DDJJQCFXFN
            └─ Tiene: Action Group "infrastructure-tools"
                 └─ Invoca: Lambda bedrock-mcp-bridge
                      └─ Conecta: Servidor MCP
                           └─ Ejecuta: Operaciones AWS reales
```

## Seguridad

1. **Autenticación Lambda → MCP**: Token en variable de entorno
2. **Aislamiento**: Lambda solo puede invocar el servidor MCP configurado
3. **Auditoría**: Todos los logs en CloudWatch
4. **Permisos mínimos**: Lambda solo tiene permisos de ejecución básicos

## Próximos Pasos

1. ✅ Action Group creado y configurado
2. ✅ Lambda desplegada y con permisos
3. ⏳ Implementar servidor MCP
4. ⏳ Configurar variables de entorno de Lambda
5. ⏳ Probar integración end-to-end
6. ⏳ Agregar más herramientas (Lambda, VPC, IAM, etc.)

## Troubleshooting

### Agente no detecta las herramientas

```bash
# Verificar que el Action Group está habilitado
aws bedrock-agent get-agent-action-group \
  --agent-id DDJJQCFXFN \
  --agent-version DRAFT \
  --action-group-id FDBNKJHYJQ \
  --region us-east-1
```

### Lambda no se invoca

```bash
# Verificar permisos de Lambda
aws lambda get-policy \
  --function-name bedrock-mcp-bridge \
  --region us-east-1
```

### Servidor MCP no responde

```bash
# Verificar variables de entorno
aws lambda get-function-configuration \
  --function-name bedrock-mcp-bridge \
  --region us-east-1 \
  --query 'Environment.Variables'
```

## Ejemplo Completo de Conversación

**Usuario**: "Necesito crear infraestructura para el proyecto Analytics: una instancia EC2 t3.small y un bucket S3"

**Agente (internamente)**:
1. Analiza la solicitud
2. Identifica 2 herramientas necesarias: `createEC2Instance` y `createS3Bucket`
3. Invoca `createEC2Instance` con:
   ```json
   {
     "instanceType": "t3.small",
     "ami": "ami-0c55b159cbfafe1f0",
     "projectName": "Analytics"
   }
   ```
4. Invoca `createS3Bucket` con:
   ```json
   {
     "bucketName": "davivienda-analytics-data",
     "projectName": "Analytics"
   }
   ```
5. Espera respuestas de ambas herramientas
6. Compone respuesta para el usuario

**Respuesta del Agente**:
```
He creado la infraestructura para el proyecto Analytics:

✅ Instancia EC2:
   - ID: i-0abc123def456
   - Tipo: t3.small
   - Estado: pending

✅ Bucket S3:
   - Nombre: davivienda-analytics-data
   - Región: us-east-1

La infraestructura estará lista para usar en unos minutos.
```

## Recursos

- [AWS Bedrock Action Groups](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-action-groups.html)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
