export interface IMcpService {
  isEnabled(): boolean;
  executeTool(toolName: string, params: Record<string, any>): Promise<any>;
  listAvailableTools(): Promise<Array<{ name: string; description: string }>>;
  getContext(contextId: string): Promise<any>;
}
