/**
 * @dsh-external/dsh-remote-orchestrator - Remote DSH Web Service Client
 */

import type { RemoteDshAgent, SubtaskResult } from './types.js'

export interface PingResult {
  ok: boolean
  name?: string
  version?: string
  port?: number
  uptime?: number
  providers?: string[]
  error?: string
}

export interface RemoteModelEntry {
  id: string
  provider: string
  name: string
  isDefault?: boolean
  routeOnly?: boolean
  description?: string
  reasoning?: boolean
}

export interface RemoteModelsResult {
  ok: boolean
  defaultModel?: { provider?: string; model?: string }
  models: RemoteModelEntry[]
  error?: string
}

export interface RemotePresetEntry {
  id: string
  name?: string
  description?: string
  isDefault?: boolean
}

export interface RemotePresetsResult {
  ok: boolean
  presets: RemotePresetEntry[]
  error?: string
}

export class RemoteDshClient {
  private cleanUrl(url: string): string {
    return url.replace(/\/+$/, '')
  }

  private getHeaders(agent: RemoteDshAgent): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (agent.apiKey && agent.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${agent.apiKey.trim()}`
    }
    return headers
  }

  /** 测试远程 DSH API 连通性 */
  public async ping(agent: RemoteDshAgent): Promise<PingResult> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/system/status`
    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: this.getHeaders(agent),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        const text = await res.text()
        return { ok: false, error: `HTTP ${res.status}: ${text || res.statusText}` }
      }
      const json = (await res.json()) as any
      if (json.ok && json.data) {
        return {
          ok: true,
          name: json.data.name,
          version: json.data.version,
          port: json.data.port,
          uptime: json.data.uptime,
          providers: json.data.providers || [],
        }
      }
      return { ok: false, error: json.error || 'Invalid response structure' }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Connection failed' }
    }
  }

  /** 获取远程 DSH 可用模型列表（含节点默认模型，供节点配置 UI 下拉选择） */
  public async getModels(agent: RemoteDshAgent): Promise<RemoteModelsResult> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/models`
    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: this.getHeaders(agent),
        signal: AbortSignal.timeout(10000),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json.ok) {
        return { ok: false, models: [], error: json.error || `HTTP ${res.status}` }
      }
      const data = json.data || {}
      const models: RemoteModelEntry[] = Array.isArray(data.models) ? data.models : []
      return {
        ok: true,
        defaultModel: data.defaultModel,
        models,
      }
    } catch (err: any) {
      return { ok: false, models: [], error: err.message || 'Failed to fetch models' }
    }
  }

  /** 获取远程 DSH 可用 Agent Preset 列表（供节点配置 UI 下拉选择；旧版远端无此端点时返回 ok:false） */
  public async getPresets(agent: RemoteDshAgent): Promise<RemotePresetsResult> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/presets`
    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: this.getHeaders(agent),
        signal: AbortSignal.timeout(10000),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json.ok) {
        return { ok: false, presets: [], error: json.error || `HTTP ${res.status}` }
      }
      const presets: RemotePresetEntry[] = Array.isArray(json.data?.presets) ? json.data.presets : []
      return { ok: true, presets }
    } catch (err: any) {
      return { ok: false, presets: [], error: err.message || 'Failed to fetch presets' }
    }
  }

  /** 在远程 DSH 上创建会话 */
  public async createSession(
    agent: RemoteDshAgent,
    title: string,
    options?: { cwd?: string }
  ): Promise<{ ok: boolean; sessionId?: string; error?: string }> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/sessions`

    const payload: Record<string, any> = {
      title,
      agentPreset: agent.agentPreset || 'cordis',
    }
    if (agent.provider) payload.provider = agent.provider
    if (agent.model) payload.model = agent.model
    if (options?.cwd) payload.cwd = options.cwd

    try {
      const res = await fetch(target, {
        method: 'POST',
        headers: this.getHeaders(agent),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || `HTTP ${res.status}` }
      }
      return { ok: true, sessionId: json.data?.sessionId }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to create session' }
    }
  }

  /** 向远程会话发送 Prompt 执行任务 */
  public async executePrompt(
    agent: RemoteDshAgent,
    sessionId: string,
    prompt: string,
    options?: {
      timeoutMs?: number
      remoteTimeoutMs?: number
      onLog?: (msg: string, level?: 'info' | 'warn' | 'error' | 'tool') => void
    }
  ): Promise<{ ok: boolean; result?: SubtaskResult; error?: string; timedOut?: boolean }> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/sessions/${encodeURIComponent(sessionId)}/prompt`

    options?.onLog?.(`向远程会话 [${sessionId}] 发送提示词指令...`, 'info')

    // 如果配置了自定义系统提示词，前置拼接以增强约束
    let fullPrompt = prompt
    if (agent.systemPrompt && agent.systemPrompt.trim()) {
      fullPrompt = `[系统角色与前置指导]:\n${agent.systemPrompt.trim()}\n\n[当前子任务指令]:\n${prompt}`
    }

    // 本端等待窗口（fetch 中止）必须短于远端等待窗口（body timeoutMs），
    // 保证超时总是先在本端发生，从而可转入轮询等待而非误判失败
    const localTimeoutMs = options?.timeoutMs || 300000
    const remoteTimeoutMs = options?.remoteTimeoutMs || 1800000

    try {
      const res = await fetch(target, {
        method: 'POST',
        headers: this.getHeaders(agent),
        body: JSON.stringify({
          prompt: fullPrompt,
          timeoutMs: remoteTimeoutMs,
        }),
        signal: AbortSignal.timeout(localTimeoutMs),
      })

      const json = (await res.json()) as any
      if (!res.ok || !json.ok) {
        const errMsg = json.error || `HTTP ${res.status}`
        options?.onLog?.(`远程执行失败: ${errMsg}`, 'error')
        return { ok: false, error: errMsg }
      }

      const data = json.data || {}
      const result: SubtaskResult = {
        content: data.content || '',
        reasoning: data.reasoning,
        toolCalls: data.toolCalls || [],
      }

      options?.onLog?.(`远程会话执行完成，生成回答 ${result.content.length} 字符`, 'info')
      if (result.toolCalls && result.toolCalls.length > 0) {
        options?.onLog?.(`执行期间触发 ${result.toolCalls.length} 次工具调用`, 'tool')
      }

      return { ok: true, result }
    } catch (err: any) {
      const errMsg = err.message || 'Prompt execution timed out or failed'
      const isTimeout = err.name === 'AbortError' || /abort|timeout/i.test(errMsg)
      if (isTimeout) {
        options?.onLog?.(`同步等待超时 (${Math.round(localTimeoutMs / 1000)}s)，远端会话继续执行中...`, 'warn')
        return { ok: false, error: errMsg, timedOut: true }
      }
      options?.onLog?.(`执行异常: ${errMsg}`, 'error')
      return { ok: false, error: errMsg }
    }
  }

  /** 查询远程会话状态 */
  public async getSession(
    agent: RemoteDshAgent,
    sessionId: string
  ): Promise<{ ok: boolean; status?: string; eventCount?: number; error?: string }> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/sessions/${encodeURIComponent(sessionId)}`
    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: this.getHeaders(agent),
        signal: AbortSignal.timeout(10000),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || `HTTP ${res.status}` }
      }
      return { ok: true, status: json.data?.status, eventCount: json.data?.eventCount }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to fetch session' }
    }
  }

  /** 从会话历史提取最后一条非空助手回复 */
  private extractLastAssistantMessage(messages: any[]): { content: string; reasoning?: string } {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m?.role !== 'assistant') continue
      const raw = m.content
      const text =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw
                .filter((b: any) => b?.type === 'text')
                .map((b: any) => b.text || '')
                .join('\n')
            : ''
      if (text && text.trim()) {
        return { content: text, reasoning: m.reasoning }
      }
    }
    return { content: '' }
  }

  /** 轮询等待远程会话完成，并从历史提取最终助手回复（用于同步等待超时后的兜底） */
  public async waitForSessionResult(
    agent: RemoteDshAgent,
    sessionId: string,
    options?: {
      maxMs?: number
      intervalMs?: number
      onLog?: (msg: string, level?: 'info' | 'warn' | 'error' | 'tool') => void
    }
  ): Promise<{ ok: boolean; content?: string; reasoning?: string; error?: string }> {
    const maxMs = options?.maxMs || 1800000
    const intervalMs = options?.intervalMs || 15000
    const deadline = Date.now() + maxMs
    let lastStatus = ''
    options?.onLog?.(`开始轮询远程会话状态（最长 ${Math.round(maxMs / 60000)} 分钟）...`, 'info')
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      const st = await this.getSession(agent, sessionId)
      if (!st.ok) {
        return { ok: false, error: st.error }
      }
      if (st.status !== lastStatus) {
        options?.onLog?.(`远程会话状态: ${st.status || 'unknown'}`, 'info')
        lastStatus = st.status || ''
      }
      if (st.status && st.status !== 'running') {
        const hist = await this.getHistory(agent, sessionId)
        if (!hist.ok) {
          return { ok: false, error: hist.error }
        }
        const extracted = this.extractLastAssistantMessage(hist.messages || [])
        return { ok: true, content: extracted.content, reasoning: extracted.reasoning }
      }
    }
    return { ok: false, error: `等待远程会话完成超时 (>${Math.round(maxMs / 60000)} 分钟)` }
  }

  /** 获取远程会话的历史消息（用于聊天窗口） */
  public async getHistory(
    agent: RemoteDshAgent,
    sessionId: string
  ): Promise<{ ok: boolean; messages?: any[]; error?: string }> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/sessions/${encodeURIComponent(sessionId)}/history?maxMessages=100`

    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: this.getHeaders(agent),
        signal: AbortSignal.timeout(10000),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || `HTTP ${res.status}` }
      }
      // 远端返回 { sessionId, messages: [...] }（旧版为数组），两种形态都兼容
      const data = json.data
      const messages = Array.isArray(data)
        ? data
        : Array.isArray(data?.messages)
          ? data.messages
          : []
      return { ok: true, messages }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to fetch history' }
    }
  }

  /** 在聊天窗口中跟进对话 (Follow-up) */
  public async followup(
    agent: RemoteDshAgent,
    sessionId: string,
    message: string
  ): Promise<{ ok: boolean; reply?: string; error?: string }> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/sessions/${encodeURIComponent(sessionId)}/prompt`

    try {
      const res = await fetch(target, {
        method: 'POST',
        headers: this.getHeaders(agent),
        body: JSON.stringify({ prompt: message }),
        signal: AbortSignal.timeout(120000),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || `HTTP ${res.status}` }
      }
      return { ok: true, reply: json.data?.content || '' }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Followup message failed' }
    }
  }
}
