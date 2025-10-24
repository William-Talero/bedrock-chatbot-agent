const https = require('https');
const http = require('http');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

async function sendMcpRequest(method, params) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_SERVER_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const postData = JSON.stringify({
      method,
      params
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${MCP_AUTH_TOKEN}`
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse MCP response: ${e.message}`));
          }
        } else {
          reject(new Error(`MCP request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`MCP request error: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

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
        filters: params.projectName ? {
          Project: params.projectName
        } : {}
      })
    },
    '/prepare-bedrock-agent': {
      tool: 'prepare_bedrock_agent',
      mapper: (params) => ({
        agentId: params.agentId
      })
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
  if (!mapping) {
    throw new Error(`Unknown API path: ${apiPath}`);
  }

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
        body: {
          error: 'Missing apiPath in request'
        }
      };
    }

    const { tool, params } = mapBedrockToMcpTool(apiPath, parameters || {});

    console.log(`Executing MCP tool: ${tool}`, params);

    const mcpResponse = await sendMcpRequest('execute_tool', {
      tool,
      parameters: params
    });

    console.log('MCP response:', mcpResponse);

    return {
      statusCode: 200,
      body: mcpResponse
    };

  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      body: {
        error: error.message,
        details: 'Failed to execute Bedrock agent operation via MCP'
      }
    };
  }
};
