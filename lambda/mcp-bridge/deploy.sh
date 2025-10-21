#!/bin/bash

set -e

FUNCTION_NAME="bedrock-mcp-bridge"
ROLE_NAME="BedrockMcpBridgeRole"
REGION="us-east-1"

echo "=========================================="
echo "  Deploying MCP Bridge Lambda Function"
echo "=========================================="

echo "1. Creating IAM role for Lambda..."
ROLE_ARN=$(aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }]
  }' \
  --query 'Role.Arn' \
  --output text 2>/dev/null || \
  aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)

echo "   Role ARN: $ROLE_ARN"

echo "2. Attaching basic Lambda execution policy..."
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || echo "   Policy already attached"

echo "3. Waiting for role to be available..."
sleep 10

echo "4. Creating deployment package..."
zip -j function.zip index.js package.json

echo "5. Creating/updating Lambda function..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{MCP_SERVER_URL=,MCP_AUTH_TOKEN=}" \
  --region $REGION \
  2>/dev/null && echo "   Function created" || \
  (aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION && echo "   Function updated")

echo "6. Getting Lambda ARN..."
LAMBDA_ARN=$(aws lambda get-function \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --query 'Configuration.FunctionArn' \
  --output text)

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Lambda ARN: $LAMBDA_ARN"
echo ""
echo "Next steps:"
echo "1. Update Lambda environment variables with your MCP server URL:"
echo "   aws lambda update-function-configuration \\"
echo "     --function-name $FUNCTION_NAME \\"
echo "     --environment Variables=\"{MCP_SERVER_URL=http://your-mcp-server:8080/mcp,MCP_AUTH_TOKEN=your-token}\" \\"
echo "     --region $REGION"
echo ""
echo "2. Grant Bedrock permission to invoke this Lambda:"
echo "   aws lambda add-permission \\"
echo "     --function-name $FUNCTION_NAME \\"
echo "     --statement-id bedrock-agent-invoke \\"
echo "     --action lambda:InvokeFunction \\"
echo "     --principal bedrock.amazonaws.com \\"
echo "     --source-arn arn:aws:bedrock:$REGION:<account-id>:agent/DDJJQCFXFN \\"
echo "     --region $REGION"
echo ""
echo "3. Create Action Group using the Lambda ARN above"
echo ""
echo "Clean up: rm function.zip"
