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

/** SSH 连接认证方式：密码 / 私钥 */
export type SshAuthType = 'password' | 'key'

/** 可供 AI 编排使用的 SSH 连接资源（账号 + 密码/密钥 + 主机） */
export interface SshResource {
  id: string
  name: string
  /** 连接 IP 或主机名 */
  host: string
  /** SSH 端口，默认 22 */
  port: number
  /** 连接方式：password 密码认证 / key 私钥认证 */
  authType: SshAuthType
  /** SSH 登录账号 */
  username: string
  /** 密码（authType=password 时使用） */
  password?: string
  /** 私钥 PEM 内容（authType=key 时使用） */
  privateKey?: string
  /** 私钥口令（可选） */
  passphrase?: string
  description?: string
  tags?: string[]
  /** 最近一次连通性测试 */
  lastTestedAt?: number
  lastTestOk?: boolean
  lastTestError?: string
  createdAt: number
  updatedAt: number
}

/** 列表/搜索场景下的脱敏视图（不回传明文密钥） */
export type SshResourceMasked = Omit<
  SshResource,
  'password' | 'privateKey' | 'passphrase'
> & {
  hasPassword: boolean
  hasPrivateKey: boolean
  hasPassphrase: boolean
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
