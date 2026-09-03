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

  /** 获取远程 DSH 支持的模型列表 */
  public async getModels(agent: RemoteDshAgent): Promise<any[]> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/models`
    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: this.getHeaders(agent),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return []
      const json = (await res.json()) as any
      return json.data || []
    } catch {
      return []
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
      onLog?: (msg: string, level?: 'info' | 'warn' | 'error' | 'tool') => void
    }
  ): Promise<{ ok: boolean; result?: SubtaskResult; error?: string }> {
    const base = this.cleanUrl(agent.apiBaseUrl)
    const target = `${base}/sessions/${encodeURIComponent(sessionId)}/prompt`

    options?.onLog?.(`向远程会话 [${sessionId}] 发送提示词指令...`, 'info')

    // 如果配置了自定义系统提示词，前置拼接以增强约束
    let fullPrompt = prompt
    if (agent.systemPrompt && agent.systemPrompt.trim()) {
      fullPrompt = `[系统角色与前置指导]:\n${agent.systemPrompt.trim()}\n\n[当前子任务指令]:\n${prompt}`
    }

    try {
      const res = await fetch(target, {
        method: 'POST',
        headers: this.getHeaders(agent),
        body: JSON.stringify({
          prompt: fullPrompt,
          timeoutMs: options?.timeoutMs || 300000,
        }),
        signal: AbortSignal.timeout(options?.timeoutMs || 300000),
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
      options?.onLog?.(`执行异常: ${errMsg}`, 'error')
      return { ok: false, error: errMsg }
    }
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
      return { ok: true, messages: json.data || [] }
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
