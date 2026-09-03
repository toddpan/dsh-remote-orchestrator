/**
 * @dsh-external/dsh-remote-orchestrator - HTTP Router & API Dispatcher
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { OrchestratorStore } from './store.js'
import type { TaskOrchestrator } from './orchestrator.js'
import { RemoteDshClient } from './remote-client.js'
import { renderWebUi } from './web-ui.js'

export class OrchestratorRouter {
  private store: OrchestratorStore
  private orchestrator: TaskOrchestrator
  private client: RemoteDshClient

  constructor(store: OrchestratorStore, orchestrator: TaskOrchestrator) {
    this.store = store
    this.orchestrator = orchestrator
    this.client = new RemoteDshClient()
  }

  private sendJson(res: ServerResponse, statusCode: number, data: any): void {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.end(JSON.stringify(data))
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch {
          resolve({})
        }
      })
      req.on('error', () => resolve({}))
    })
  }

  public async dispatch(req: IncomingMessage, res: ServerResponse, prefix: string): Promise<boolean> {
    const rawUrl = req.url || '/'
    const method = (req.method || 'GET').toUpperCase()

    // 处理 CORS 预检请求
    if (method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.end()
      return true
    }

    // 规范化 URL 路径，剥离查询参数
    const urlObj = new URL(rawUrl, 'http://localhost')
    const pathname = urlObj.pathname

    // 检查是否属于本路由前缀
    if (!pathname.startsWith(prefix)) {
      return false
    }

    const relPath = pathname.slice(prefix.length) || '/'

    // 1. Web UI 控制台首页 (GET / 或 GET /console)
    if (method === 'GET' && (relPath === '' || relPath === '/' || relPath === '/console')) {
      const html = renderWebUi(`${prefix}/api`)
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(html)
      return true
    }

    // 2. Agents CRUD 路由
    if (relPath === '/api/agents') {
      if (method === 'GET') {
        const agents = this.store.getAgents()
        this.sendJson(res, 200, { ok: true, data: agents })
        return true
      }
      if (method === 'POST') {
        const body = await this.parseBody(req)
        if (!body.id || !body.name || !body.apiBaseUrl) {
          this.sendJson(res, 400, { ok: false, error: 'id, name, apiBaseUrl 为必填项' })
          return true
        }
        const saved = this.store.upsertAgent(body)
        this.sendJson(res, 200, { ok: true, data: saved })
        return true
      }
    }

    // 单个 Agent 删除
    const agentMatch = /^\/api\/agents\/([^\/]+)$/.exec(relPath)
    if (agentMatch) {
      const agentId = decodeURIComponent(agentMatch[1])
      if (method === 'DELETE') {
        const success = this.store.deleteAgent(agentId)
        this.sendJson(res, 200, { ok: true, data: { deleted: success, agentId } })
        return true
      }
    }

    // 测试已保存 Agent 连通性
    const pingAgentMatch = /^\/api\/agents\/([^\/]+)\/ping$/.exec(relPath)
    if (pingAgentMatch && method === 'POST') {
      const agentId = decodeURIComponent(pingAgentMatch[1])
      const agent = this.store.getAgent(agentId)
      if (!agent) {
        this.sendJson(res, 404, { ok: false, error: 'Agent not found' })
        return true
      }
      const pingRes = await this.client.ping(agent)
      this.sendJson(res, 200, { ok: true, data: pingRes })
      return true
    }

    // 表单快速 Ping 测试任意 URL
    if (relPath === '/api/ping-test' && method === 'POST') {
      const body = await this.parseBody(req)
      if (!body.apiBaseUrl) {
        this.sendJson(res, 400, { ok: false, error: '缺少 apiBaseUrl' })
        return true
      }
      const tempAgent: any = {
        id: 'temp',
        name: 'temp',
        apiBaseUrl: body.apiBaseUrl,
        apiKey: body.apiKey,
      }
      const pingRes = await this.client.ping(tempAgent)
      this.sendJson(res, 200, { ok: true, data: pingRes })
      return true
    }

    // 3. Tasks CRUD 路由
    if (relPath === '/api/tasks') {
      if (method === 'GET') {
        const tasks = this.store.getTasks()
        this.sendJson(res, 200, { ok: true, data: tasks })
        return true
      }
      if (method === 'POST') {
        const body = await this.parseBody(req)
        if (!body.objective) {
          this.sendJson(res, 400, { ok: false, error: '缺少必填字段 objective' })
          return true
        }
        try {
          const task = await this.orchestrator.dispatch(body)
          this.sendJson(res, 201, { ok: true, data: task })
        } catch (err: any) {
          this.sendJson(res, 500, { ok: false, error: err.message })
        }
        return true
      }
    }

    // 单个 Task 获取与删除
    const taskMatch = /^\/api\/tasks\/([^\/]+)$/.exec(relPath)
    if (taskMatch) {
      const taskId = decodeURIComponent(taskMatch[1])
      if (method === 'GET') {
        const task = this.store.getTask(taskId)
        if (!task) {
          this.sendJson(res, 404, { ok: false, error: 'Task not found' })
          return true
        }
        this.sendJson(res, 200, { ok: true, data: task })
        return true
      }
      if (method === 'DELETE') {
        const success = this.store.deleteTask(taskId)
        this.sendJson(res, 200, { ok: true, data: { deleted: success, taskId } })
        return true
      }
    }

    // 单个 Task 手动重新触发总结判定
    const summaryMatch = /^\/api\/tasks\/([^\/]+)\/summary$/.exec(relPath)
    if (summaryMatch && method === 'POST') {
      const taskId = decodeURIComponent(summaryMatch[1])
      const task = await this.orchestrator.evaluateAndSummarizeTask(taskId)
      if (!task) {
        this.sendJson(res, 404, { ok: false, error: 'Task not found' })
        return true
      }
      this.sendJson(res, 200, { ok: true, data: task })
      return true
    }

    // 获取子任务聊天历史
    const chatMatch = /^\/api\/tasks\/([^\/]+)\/subtasks\/([^\/]+)\/chat$/.exec(relPath)
    if (chatMatch && method === 'GET') {
      const taskId = decodeURIComponent(chatMatch[1])
      const subtaskId = decodeURIComponent(chatMatch[2])
      const chatRes = await this.orchestrator.getSubtaskChat(taskId, subtaskId)
      this.sendJson(res, 200, { ok: chatRes.ok, data: chatRes })
      return true
    }

    // 在子任务聊天窗口中发送追问
    const followupMatch = /^\/api\/tasks\/([^\/]+)\/subtasks\/([^\/]+)\/followup$/.exec(relPath)
    if (followupMatch && method === 'POST') {
      const taskId = decodeURIComponent(followupMatch[1])
      const subtaskId = decodeURIComponent(followupMatch[2])
      const body = await this.parseBody(req)
      if (!body.message) {
        this.sendJson(res, 400, { ok: false, error: '缺少 message' })
        return true
      }
      const followRes = await this.orchestrator.sendFollowupToSubtask(taskId, subtaskId, body.message)
      this.sendJson(res, 200, followRes)
      return true
    }

    return false
  }
}
