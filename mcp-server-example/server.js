const express = require('express');
const { BedrockAgentClient, CreateAgentCommand, UpdateAgentCommand, ListAgentsCommand, PrepareAgentCommand, CreateAgentAliasCommand } = require('@aws-sdk/client-bedrock-agent');
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, GetRoleCommand } = require('@aws-sdk/client-iam');

const app = express();
app.use(express.json());

const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION || 'us-east-1' });
const iamClient = new IAMClient({ region: process.env.AWS_REGION || 'us-east-1' });

const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || 'dev-token-12345';

app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== MCP_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

async function createAgentRole(agentName) {
  const roleName = `AmazonBedrockExecutionRoleForAgents_${agentName}`;

  try {
    const existingRole = await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
    console.log(`Role ${roleName} already exists`);
    return existingRole.Role.Arn;
  } catch (error) {
    if (error.name !== 'NoSuchEntity') {
      throw error;
    }
  }

  const assumeRolePolicyDocument = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: {
        Service: 'bedrock.amazonaws.com'
      },
      Action: 'sts:AssumeRole',
      Condition: {
        StringEquals: {
          'aws:SourceAccount': process.env.AWS_ACCOUNT_ID || '060755573124'
        }
      }
    }]
  };

  const createRoleCommand = new CreateRoleCommand({
    RoleName: roleName,
    AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
    Description: `Execution role for Bedrock agent ${agentName}`,
    Tags: [{
      Key: 'CreatedBy',
      Value: 'DaviviendaAgentCreator'
    }]
  });

  const roleResponse = await iamClient.send(createRoleCommand);

  const policyArn = 'arn:aws:iam::aws:policy/AmazonBedrockFullAccess';
  await iamClient.send(new AttachRolePolicyCommand({
    RoleName: roleName,
    PolicyArn: policyArn
  }));

  console.log(`Created role: ${roleResponse.Role.Arn}`);
  await new Promise(resolve => setTimeout(resolve, 10000));

  return roleResponse.Role.Arn;
}

async function createBedrockAgent(params) {
  try {
    console.log('Creating Bedrock agent:', params.agentName);

    const roleArn = await createAgentRole(params.agentName);

    const tags = {};
    if (params.tags) {
      Object.entries(params.tags).forEach(([key, value]) => {
        tags[key] = value;
      });
    }

    const createAgentCommand = new CreateAgentCommand({
      agentName: params.agentName,
      description: params.description || `Agent created for ${params.agentName}`,
      instruction: params.instructions,
      foundationModel: params.foundationModel || 'anthropic.claude-3-haiku-20240307-v1:0',
      agentResourceRoleArn: roleArn,
      idleSessionTTLInSeconds: params.idleSessionTTLInSeconds || 600,
      tags
    });

    const response = await bedrockClient.send(createAgentCommand);

    const agentId = response.agent.agentId;

    console.log(`Agent created with ID: ${agentId}, preparing...`);

    await bedrockClient.send(new PrepareAgentCommand({
      agentId: agentId
    }));

    return {
      agentId: agentId,
      agentName: response.agent.agentName,
      agentArn: response.agent.agentArn,
      agentStatus: response.agent.agentStatus,
      foundationModel: response.agent.foundationModel,
      message: `Agent ${params.agentName} created successfully and prepared`
    };
  } catch (error) {
    console.error('Error creating agent:', error);
    throw new Error(`Failed to create agent: ${error.message}`);
  }
}

async function updateBedrockAgent(params) {
  try {
    console.log('Updating agent:', params.agentId);

    const updateParams = {
      agentId: params.agentId
    };

    if (params.agentName) updateParams.agentName = params.agentName;
    if (params.description) updateParams.description = params.description;
    if (params.instructions) updateParams.instruction = params.instructions;
    if (params.foundationModel) updateParams.foundationModel = params.foundationModel;

    const command = new UpdateAgentCommand(updateParams);
    const response = await bedrockClient.send(command);

    return {
      agentId: response.agent.agentId,
      agentName: response.agent.agentName,
      agentStatus: response.agent.agentStatus,
      message: `Agent ${params.agentId} updated successfully`
    };
  } catch (error) {
    console.error('Error updating agent:', error);
    throw new Error(`Failed to update agent: ${error.message}`);
  }
}

async function listBedrockAgents(params) {
  try {
    console.log('Listing agents');

    const command = new ListAgentsCommand({
      maxResults: params.maxResults || 10
    });

    const response = await bedrockClient.send(command);

    let agents = response.agentSummaries || [];

    if (params.filters && params.filters.Project) {
      agents = agents.filter(agent =>
        agent.agentName.includes(params.filters.Project)
      );
    }

    return {
      agents: agents.map(agent => ({
        agentId: agent.agentId,
        agentName: agent.agentName,
        agentStatus: agent.agentStatus,
        description: agent.description,
        updatedAt: agent.updatedAt
      })),
      totalCount: agents.length
    };
  } catch (error) {
    console.error('Error listing agents:', error);
    throw new Error(`Failed to list agents: ${error.message}`);
  }
}

async function prepareBedrockAgent(params) {
  try {
    console.log('Preparing agent:', params.agentId);

    const command = new PrepareAgentCommand({
      agentId: params.agentId
    });

    const response = await bedrockClient.send(command);

    return {
      agentId: response.agentId,
      agentStatus: response.agentStatus,
      preparedAt: response.preparedAt,
      message: `Agent ${params.agentId} prepared successfully`
    };
  } catch (error) {
    console.error('Error preparing agent:', error);
    throw new Error(`Failed to prepare agent: ${error.message}`);
  }
}

async function createAgentAlias(params) {
  try {
    console.log('Creating alias for agent:', params.agentId);

    const command = new CreateAgentAliasCommand({
      agentId: params.agentId,
      agentAliasName: params.aliasName,
      description: params.description || `Alias ${params.aliasName}`
    });

    const response = await bedrockClient.send(command);

    return {
      agentId: params.agentId,
      agentAliasId: response.agentAlias.agentAliasId,
      agentAliasName: response.agentAlias.agentAliasName,
      agentAliasArn: response.agentAlias.agentAliasArn,
      message: `Alias ${params.aliasName} created successfully`
    };
  } catch (error) {
    console.error('Error creating alias:', error);
    throw new Error(`Failed to create alias: ${error.message}`);
  }
}

const toolHandlers = {
  'create_bedrock_agent': createBedrockAgent,
  'update_bedrock_agent': updateBedrockAgent,
  'list_bedrock_agents': listBedrockAgents,
  'prepare_bedrock_agent': prepareBedrockAgent,
  'create_agent_alias': createAgentAlias
};

app.post('/mcp', async (req, res) => {
  const { method, params } = req.body;

  console.log(`MCP Request - Method: ${method}`, params);

  try {
    if (method === 'list_tools') {
      return res.json({
        tools: [
          { name: 'create_bedrock_agent', description: 'Create a new AWS Bedrock agent' },
          { name: 'update_bedrock_agent', description: 'Update an existing Bedrock agent' },
          { name: 'list_bedrock_agents', description: 'List all Bedrock agents' },
          { name: 'prepare_bedrock_agent', description: 'Prepare a Bedrock agent for use' },
          { name: 'create_agent_alias', description: 'Create an alias for a Bedrock agent' }
        ]
      });
    }

    if (method === 'execute_tool') {
      const { tool, parameters } = params;

      const handler = toolHandlers[tool];
      if (!handler) {
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
      }

      const result = await handler(parameters);
      return res.json(result);
    }

    res.status(400).json({ error: `Unknown method: ${method}` });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'MCP Bedrock Agent Server' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('  MCP Bedrock Agent Server');
  console.log('==========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Auth token: ${MCP_AUTH_TOKEN.substring(0, 10)}...`);
  console.log('Available tools:');
  console.log('  - create_bedrock_agent');
  console.log('  - update_bedrock_agent');
  console.log('  - list_bedrock_agents');
  console.log('  - prepare_bedrock_agent');
  console.log('  - create_agent_alias');
  console.log('==========================================');
});
