const { BedrockAgentClient, CreateAgentCommand, UpdateAgentCommand, ListAgentsCommand, PrepareAgentCommand, CreateAgentAliasCommand } = require('@aws-sdk/client-bedrock-agent');
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, GetRoleCommand } = require('@aws-sdk/client-iam');

const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION || 'us-east-1' });
const iamClient = new IAMClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function createAgentRole(agentName) {
  const roleName = `AmazonBedrockExecutionRoleForAgents_${agentName}`;

  try {
    const existingRole = await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
    console.log(`Role ${roleName} already exists`);
    return existingRole.Role.Arn;
  } catch (error) {
    if (error.name !== 'NoSuchEntity') throw error;
  }

  const assumeRolePolicyDocument = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { Service: 'bedrock.amazonaws.com' },
      Action: 'sts:AssumeRole',
      Condition: {
        StringEquals: {
          'aws:SourceAccount': process.env.AWS_ACCOUNT_ID || '060755573124'
        }
      }
    }]
  };

  const roleResponse = await iamClient.send(new CreateRoleCommand({
    RoleName: roleName,
    AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
    Description: `Execution role for Bedrock agent ${agentName}`,
    Tags: [{ Key: 'CreatedBy', Value: 'DaviviendaAgentCreator' }]
  }));

  await iamClient.send(new AttachRolePolicyCommand({
    RoleName: roleName,
    PolicyArn: 'arn:aws:iam::aws:policy/AmazonBedrockFullAccess'
  }));

  console.log(`Created role: ${roleResponse.Role.Arn}`);
  await new Promise(resolve => setTimeout(resolve, 10000));

  return roleResponse.Role.Arn;
}

async function createBedrockAgent(params) {
  console.log('Creating Bedrock agent:', params.agentName);

  const roleArn = await createAgentRole(params.agentName);

  const tags = {};
  if (params.tags) {
    Object.entries(params.tags).forEach(([key, value]) => {
      tags[key] = value;
    });
  }

  const response = await bedrockClient.send(new CreateAgentCommand({
    agentName: params.agentName,
    description: params.description || `Agent created for ${params.agentName}`,
    instruction: params.instructions,
    foundationModel: params.foundationModel || 'anthropic.claude-3-haiku-20240307-v1:0',
    agentResourceRoleArn: roleArn,
    idleSessionTTLInSeconds: params.idleSessionTTLInSeconds || 600,
    tags
  }));

  const agentId = response.agent.agentId;
  console.log(`Agent created with ID: ${agentId}, preparing...`);

  await bedrockClient.send(new PrepareAgentCommand({ agentId }));

  return {
    agentId,
    agentName: response.agent.agentName,
    agentArn: response.agent.agentArn,
    agentStatus: response.agent.agentStatus,
    foundationModel: response.agent.foundationModel,
    message: `Agent ${params.agentName} created successfully and prepared`
  };
}

async function updateBedrockAgent(params) {
  console.log('Updating agent:', params.agentId);

  const updateParams = { agentId: params.agentId };
  if (params.agentName) updateParams.agentName = params.agentName;
  if (params.description) updateParams.description = params.description;
  if (params.instructions) updateParams.instruction = params.instructions;
  if (params.foundationModel) updateParams.foundationModel = params.foundationModel;

  const response = await bedrockClient.send(new UpdateAgentCommand(updateParams));

  return {
    agentId: response.agent.agentId,
    agentName: response.agent.agentName,
    agentStatus: response.agent.agentStatus,
    message: `Agent ${params.agentId} updated successfully`
  };
}

async function listBedrockAgents(params) {
  console.log('Listing agents');

  const response = await bedrockClient.send(new ListAgentsCommand({
    maxResults: params.maxResults || 10
  }));

  let agents = response.agentSummaries || [];

  if (params.filters && params.filters.Project) {
    agents = agents.filter(agent => agent.agentName.includes(params.filters.Project));
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
}

async function prepareBedrockAgent(params) {
  console.log('Preparing agent:', params.agentId);

  const response = await bedrockClient.send(new PrepareAgentCommand({
    agentId: params.agentId
  }));

  return {
    agentId: response.agentId,
    agentStatus: response.agentStatus,
    preparedAt: response.preparedAt,
    message: `Agent ${params.agentId} prepared successfully`
  };
}

async function createAgentAlias(params) {
  console.log('Creating alias for agent:', params.agentId);

  const response = await bedrockClient.send(new CreateAgentAliasCommand({
    agentId: params.agentId,
    agentAliasName: params.aliasName,
    description: params.description || `Alias ${params.aliasName}`
  }));

  return {
    agentId: params.agentId,
    agentAliasId: response.agentAlias.agentAliasId,
    agentAliasName: response.agentAlias.agentAliasName,
    agentAliasArn: response.agentAlias.agentAliasArn,
    message: `Alias ${params.aliasName} created successfully`
  };
}

const toolHandlers = {
  'create_bedrock_agent': createBedrockAgent,
  'update_bedrock_agent': updateBedrockAgent,
  'list_bedrock_agents': listBedrockAgents,
  'prepare_bedrock_agent': prepareBedrockAgent,
  'create_agent_alias': createAgentAlias
};

function mapBedrockToMcpTool(apiPath, parameters) {
  const toolMapping = {
    '/create-bedrock-agent': {
      tool: 'create_bedrock_agent',
      mapper: (params) => ({
        agentName: params.agentName,
        description: params.description,
        instructions: params.instructions,
        foundationModel: params.foundationModel || 'anthropic.claude-3-haiku-20240307-v1:0',
        idleSessionTTLInSeconds: params.idleSessionTTLInSeconds || 600,
        tags: {
          Project: params.projectName,
          Department: params.department || 'Infrastructure',
          CreatedBy: 'DaviviendaAgentCreator'
        }
      })
    },
    '/update-bedrock-agent': {
      tool: 'update_bedrock_agent',
      mapper: (params) => ({
        agentId: params.agentId,
        agentName: params.agentName,
        description: params.description,
        instructions: params.instructions,
        foundationModel: params.foundationModel
      })
    },
    '/list-bedrock-agents': {
      tool: 'list_bedrock_agents',
      mapper: (params) => ({
        maxResults: params.maxResults || 10,
        filters: params.projectName ? { Project: params.projectName } : {}
      })
    },
    '/prepare-bedrock-agent': {
      tool: 'prepare_bedrock_agent',
      mapper: (params) => ({ agentId: params.agentId })
    },
    '/create-agent-alias': {
      tool: 'create_agent_alias',
      mapper: (params) => ({
        agentId: params.agentId,
        aliasName: params.aliasName,
        description: params.description
      })
    }
  };

  const mapping = toolMapping[apiPath];
  if (!mapping) throw new Error(`Unknown API path: ${apiPath}`);

  return {
    tool: mapping.tool,
    params: mapping.mapper(parameters)
  };
}

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const { apiPath, parameters } = event;

    if (!apiPath) {
      return {
        statusCode: 400,
        body: { error: 'Missing apiPath in request' }
      };
    }

    const { tool, params } = mapBedrockToMcpTool(apiPath, parameters || {});
    console.log(`Executing tool: ${tool}`, params);

    const handler = toolHandlers[tool];
    if (!handler) {
      return {
        statusCode: 400,
        body: { error: `Unknown tool: ${tool}` }
      };
    }

    const result = await handler(params);
    console.log('Tool result:', result);

    return {
      statusCode: 200,
      body: result
    };

  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      body: {
        error: error.message,
        details: error.stack
      }
    };
  }
};
