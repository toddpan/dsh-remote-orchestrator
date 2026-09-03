/**
 * @dsh-external/dsh-remote-orchestrator - Data Types & Protocol Models
 */

export interface RemoteDshAgent {
  id: string
  name: string
  apiBaseUrl: string
  apiKey?: string
  agentPreset?: string
  provider?: string
  model?: string
  permission?: string
  systemPrompt?: string
  description?: string
  tags?: string[]
  createdAt: number
  updatedAt: number
}

export interface SubtaskLogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'tool'
  message: string
}

export interface SubtaskResult {
  content: string
  reasoning?: string
  toolCalls?: Array<{
    id?: string
    name: string
    arguments?: any
    result?: any
  }>
}

export interface OrchestratorSubtask {
  id: string
  taskId: string
  title: string
  prompt: string
  remoteAgentId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  remoteSessionId?: string
  startedAt?: number
  completedAt?: number
  error?: string
  result?: SubtaskResult
  logs: SubtaskLogEntry[]
}

export interface TaskSummary {
  status: 'success' | 'partial_success' | 'failed'
  overview: string
  subtaskSummaries: Array<{
    id: string
    title: string
    status: string
    keyPoints: string
  }>
  finalConclusion: string
  completedAt: number
}

export interface OrchestratorTask {
  id: string
  title: string
  objective: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial_success' | 'success'
  createdAt: number
  updatedAt: number
  subtasks: OrchestratorSubtask[]
  summary?: TaskSummary
}

export interface StorageData {
  agents: RemoteDshAgent[]
  tasks: OrchestratorTask[]
}

export interface PluginConfig {
  pathPrefix?: string
  storagePath?: string
  autoSummary?: boolean
}
