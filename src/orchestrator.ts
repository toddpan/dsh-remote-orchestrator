/**
 * @dsh-external/dsh-remote-orchestrator - Task Orchestration Engine
 */

import { randomUUID } from 'node:crypto'
import type { Context } from 'cordis'
import type { OrchestratorStore } from './store.js'
import { RemoteDshClient } from './remote-client.js'
import type {
  OrchestratorTask,
  OrchestratorSubtask,
  TaskSummary,
  RemoteDshAgent,
} from './types.js'

export interface CreateTaskInput {
  title: string
  objective: string
  subtasks?: Array<{
    title: string
    prompt: string
    remoteAgentId?: string
  }>
}

export class TaskOrchestrator {
  private store: OrchestratorStore
  private client: RemoteDshClient
  private ctx: Context
  private activeJobs: Map<string, AbortController> = new Map()

  constructor(ctx: Context, store: OrchestratorStore) {
    this.ctx = ctx
    this.store = store
    this.client = new RemoteDshClient()
  }

  /** 创建主任务并派发执行 */
  public async dispatch(input: CreateTaskInput): Promise<OrchestratorTask> {
    const agents = this.store.getAgents()
    if (agents.length === 0) {
      throw new Error('未配置任何远程 DSH 智能体，请先添加至少一个远程 DSH 节点')
    }

    const taskId = `task-${randomUUID().slice(0, 8)}`
    let subtaskInputs = input.subtasks

    // 如果未手动拆解子任务，自动根据 objective 与可用 agents 进行智能拆解
    if (!subtaskInputs || subtaskInputs.length === 0) {
      subtaskInputs = this.autoDecomposeObjective(input.objective, agents)
    }

    const subtasks: OrchestratorSubtask[] = subtaskInputs.map((st, i) => {
      // 若未指定 agentId，则轮询分配
      const assignedAgent =
        agents.find((a) => a.id === st.remoteAgentId) ||
        agents[i % agents.length]

      return {
        id: `sub-${randomUUID().slice(0, 8)}`,
        taskId,
        title: st.title || `子任务 ${i + 1}`,
        prompt: st.prompt,
        remoteAgentId: assignedAgent.id,
        status: 'pending',
        logs: [
          {
            timestamp: Date.now(),
            level: 'info',
            message: `子任务已规划，预分配执行节点: ${assignedAgent.name} (${assignedAgent.apiBaseUrl})`,
          },
        ],
      }
    })

    const task: OrchestratorTask = {
      id: taskId,
      title: input.title || `主任务: ${input.objective.slice(0, 20)}...`,
      objective: input.objective,
      status: 'running',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subtasks,
    }

    this.store.upsertTask(task)

    // 启动异步调度执行（不阻塞当前响应）
    this.runTaskPipeline(task).catch((err) => {
      console.error(`[dsh-remote-orchestrator] Task ${taskId} pipeline error:`, err)
    })

    return task
  }

  /** 自动拆解任务策略 */
  private autoDecomposeObjective(
    objective: string,
    agents: RemoteDshAgent[]
  ): Array<{ title: string; prompt: string; remoteAgentId: string }> {
    const count = Math.min(Math.max(agents.length, 2), 4)
    const result: Array<{ title: string; prompt: string; remoteAgentId: string }> = []

    if (count === 1) {
      result.push({
        title: '完整执行与验证',
        prompt: `请完成以下任务目标，并详细输出执行过程与最终验证结果：\n${objective}`,
        remoteAgentId: agents[0].id,
      })
      return result
    }

    // 经典拆解三段论：分析规划 / 核心实施 / 验证审查
    result.push({
      title: '阶段一：需求分析与方案规划',
      prompt: `作为方案规划专家，请针对以下总目标进行深入的技术选型、可行性分析与关键拆解规划：\n${objective}`,
      remoteAgentId: agents[0].id,
    })

    result.push({
      title: '阶段二：核心执行与具体实施',
      prompt: `作为核心执行工程师，请针对以下总目标落实具体实现，编写核心方案、代码或详细交付内容：\n${objective}`,
      remoteAgentId: agents[1 % agents.length].id,
    })

    if (count >= 3) {
      result.push({
        title: '阶段三：质量审查与优化建议',
        prompt: `作为质检与安全审查员，请对上述总目标及其执行方案进行边界测试、安全审查与性能优化推演：\n${objective}`,
        remoteAgentId: agents[2 % agents.length].id,
      })
    }

    return result
  }

  /** 异步流水线调度执行 */
  private async runTaskPipeline(task: OrchestratorTask): Promise<void> {
    const abortCtrl = new AbortController()
    this.activeJobs.set(task.id, abortCtrl)

    try {
      // 并行启动所有子任务
      const promises = task.subtasks.map((st) => this.runSingleSubtask(task.id, st.id, abortCtrl.signal))
      await Promise.all(promises)

      // 检查更新主任务状态并进行智能总结
      await this.evaluateAndSummarizeTask(task.id)
    } finally {
      this.activeJobs.delete(task.id)
    }
  }

  /** 执行单个子任务 */
  public async runSingleSubtask(taskId: string, subtaskId: string, signal?: AbortSignal): Promise<void> {
    const task = this.store.getTask(taskId)
    if (!task) return
    const subtask = task.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) return

    const agent = this.store.getAgent(subtask.remoteAgentId)
    if (!agent) {
      this.appendLog(taskId, subtaskId, 'error', `未找到指定的远程节点: ${subtask.remoteAgentId}`)
      this.store.updateSubtask(taskId, subtaskId, (s) => {
        s.status = 'failed'
        s.error = `指定的远程智能体 [${subtask.remoteAgentId}] 不存在`
      })
      return
    }

    this.store.updateSubtask(taskId, subtaskId, (s) => {
      s.status = 'running'
      s.startedAt = Date.now()
    })

    this.appendLog(
      taskId,
      subtaskId,
      'info',
      `开始在远程节点 [${agent.name}] (${agent.apiBaseUrl}) 上启动子任务执行...`
    )

    // 1. 在远程 DSH 创建会话
    const sessionRes = await this.client.createSession(agent, `[子任务] ${subtask.title}`)
    if (!sessionRes.ok || !sessionRes.sessionId) {
      const err = sessionRes.error || '创建远程会话失败'
      this.appendLog(taskId, subtaskId, 'error', `创建远程会话失败: ${err}`)
      this.store.updateSubtask(taskId, subtaskId, (s) => {
        s.status = 'failed'
        s.error = err
      })
      return
    }

    const remoteSessionId = sessionRes.sessionId
    this.store.updateSubtask(taskId, subtaskId, (s) => {
      s.remoteSessionId = remoteSessionId
    })
    this.appendLog(taskId, subtaskId, 'info', `远程会话创建成功，SessionID: ${remoteSessionId}`)

    if (signal?.aborted) {
      this.appendLog(taskId, subtaskId, 'warn', '任务已被中止')
      return
    }

    // 2. 发送提示词执行（同步等待；超时或远端仍在跑时自动转轮询，长任务不再被误判失败）
    const execRes = await this.client.executePrompt(agent, remoteSessionId, subtask.prompt, {
      onLog: (msg, level) => {
        this.appendLog(taskId, subtaskId, level || 'info', msg)
      },
    })

    let finalRes = execRes

    const syncTimedOut = !execRes.ok && execRes.timedOut
    if (syncTimedOut) {
      this.appendLog(taskId, subtaskId, 'info', '转入轮询模式等待远端会话完成...')
    } else if (execRes.ok) {
      // 同步返回了，但若远端会话其实还在跑（远端超时窗口先到等场景），同样兜底等待
      const st = await this.client.getSession(agent, remoteSessionId)
      if (st.ok && st.status === 'running') {
        this.appendLog(taskId, subtaskId, 'info', '远端会话仍在执行，转入轮询等待其完成...')
        finalRes = { ok: false, error: 'pending-poll' }
      }
    }

    if (syncTimedOut || (!finalRes.ok && finalRes.error === 'pending-poll')) {
      const polled = await this.client.waitForSessionResult(agent, remoteSessionId, {
        onLog: (msg, level) => {
          this.appendLog(taskId, subtaskId, level || 'info', msg)
        },
      })
      if (polled.ok) {
        finalRes = {
          ok: true,
          result: { content: polled.content || '', reasoning: polled.reasoning, toolCalls: [] },
        }
        this.appendLog(
          taskId,
          subtaskId,
          'info',
          `远端会话已结束，从历史提取最终回答 ${(polled.content || '').length} 字符`
        )
      } else if (syncTimedOut) {
        finalRes = { ok: false, error: polled.error || '等待远程会话完成失败' }
      } else {
        // 轮询失败但同步阶段已有内容，保留同步结果
        finalRes = execRes
      }
    }

    if (!finalRes.ok || !finalRes.result) {
      const err = finalRes.error || '远程执行未返回结果'
      this.store.updateSubtask(taskId, subtaskId, (s) => {
        s.status = 'failed'
        s.error = err
        s.completedAt = Date.now()
      })
      this.appendLog(taskId, subtaskId, 'error', `子任务执行失败: ${err}`)
    } else if (!finalRes.result.content || !finalRes.result.content.trim()) {
      // 远端返回 ok 但 0 字符产出：绝大多数是该节点 LLM 静默失败（模型不可用/配置错误），不能算完成
      const err =
        '远程节点返回空回答 (0 字符)：该节点的 Provider/Model 很可能不可用或配置错误，请在「节点池」用「获取可用模型」重新选择并单项重试'
      this.store.updateSubtask(taskId, subtaskId, (s) => {
        s.status = 'failed'
        s.error = err
        s.result = finalRes.result
        s.completedAt = Date.now()
      })
      this.appendLog(taskId, subtaskId, 'error', err)
    } else {
      this.store.updateSubtask(taskId, subtaskId, (s) => {
        s.status = 'completed'
        s.result = finalRes.result
        s.completedAt = Date.now()
      })
      this.appendLog(taskId, subtaskId, 'info', `子任务已顺利完成，产出内容已就绪`)
    }
  }

  /** 追加日志辅助方法 */
  private appendLog(
    taskId: string,
    subtaskId: string,
    level: 'info' | 'warn' | 'error' | 'tool',
    message: string
  ): void {
    this.store.updateSubtask(taskId, subtaskId, (s) => {
      s.logs.push({
        timestamp: Date.now(),
        level,
        message,
      })
    })
  }

  /** 对所有子任务进行完成状态检查与总结构建 */
  public async evaluateAndSummarizeTask(taskId: string): Promise<OrchestratorTask | undefined> {
    const task = this.store.getTask(taskId)
    if (!task) return undefined

    const subtasks = task.subtasks
    const completedCount = subtasks.filter((s) => s.status === 'completed').length
    const failedCount = subtasks.filter((s) => s.status === 'failed').length
    const totalCount = subtasks.length

    let finalStatus: 'success' | 'partial_success' | 'failed'
    if (completedCount === totalCount) {
      finalStatus = 'success'
    } else if (completedCount > 0) {
      finalStatus = 'partial_success'
    } else {
      finalStatus = 'failed'
    }

    const subtaskSummaries = subtasks.map((s) => {
      let keyPoints = ''
      if (s.result?.content) {
        keyPoints = s.result.content.slice(0, 300).trim() + (s.result.content.length > 300 ? '...' : '')
      } else if (s.error) {
        keyPoints = `执行异常: ${s.error}`
      } else {
        keyPoints = '未产出有效内容'
      }
      return {
        id: s.id,
        title: s.title,
        status: s.status,
        keyPoints,
      }
    })

    // 构建结构化总结结论
    let finalConclusion = ''
    if (finalStatus === 'success') {
      finalConclusion = `所有 ${totalCount} 个远程子任务均已全部顺利完成。各 DSH 工作节点紧密协同，分别就规划、执行及校验产出了完整的解决方案与工程交付。总目标已圆满达成。`
    } else if (finalStatus === 'partial_success') {
      finalConclusion = `部分子任务完成（${completedCount}/${totalCount}）。部分节点返回了符合预期的执行成果，但有 ${failedCount} 个子任务发生错误或超时，请点开对应子任务的工作日志与聊天窗口排查原因并单项重试。`
    } else {
      finalConclusion = `全部子任务执行失败（0/${totalCount}）。远程 DSH 节点可能存在连接超时、服务未就绪或参数配置问题，建议检查远程 DSH 的 API 连通性。`
    }

    const summary: TaskSummary = {
      status: finalStatus,
      overview: `主任务共拆解为 ${totalCount} 个子任务，分配给多台远程 DSH 节点执行。最终完成统计：成功 ${completedCount} 个，失败 ${failedCount} 个。`,
      subtaskSummaries,
      finalConclusion,
      completedAt: Date.now(),
    }

    task.status = finalStatus
    task.summary = summary
    task.updatedAt = Date.now()

    this.store.upsertTask(task)
    return task
  }

  /** 获取子任务在远程 DSH 的完整聊天记录 */
  public async getSubtaskChat(
    taskId: string,
    subtaskId: string
  ): Promise<{ ok: boolean; agent?: RemoteDshAgent; messages?: any[]; error?: string }> {
    const task = this.store.getTask(taskId)
    if (!task) return { ok: false, error: 'Task not found' }
    const subtask = task.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) return { ok: false, error: 'Subtask not found' }
    const agent = this.store.getAgent(subtask.remoteAgentId)
    if (!agent) return { ok: false, error: 'Remote agent not found' }

    if (!subtask.remoteSessionId) {
      return {
        ok: true,
        agent,
        messages: [
          {
            role: 'user',
            content: subtask.prompt,
            time: subtask.startedAt || task.createdAt,
          },
        ],
      }
    }

    const historyRes = await this.client.getHistory(agent, subtask.remoteSessionId)
    if (historyRes.ok && historyRes.messages && historyRes.messages.length > 0) {
      return { ok: true, agent, messages: historyRes.messages }
    }

    // fallback 构建消息
    const messages: any[] = [
      {
        role: 'user',
        content: subtask.prompt,
        time: subtask.startedAt || task.createdAt,
      },
    ]
    if (subtask.result?.content) {
      messages.push({
        role: 'assistant',
        content: subtask.result.content,
        reasoning: subtask.result.reasoning,
        time: subtask.completedAt || Date.now(),
      })
    }
    return { ok: true, agent, messages }
  }

  /** 在子任务的远程会话中直接发消息追问交互 */
  public async sendFollowupToSubtask(
    taskId: string,
    subtaskId: string,
    message: string
  ): Promise<{ ok: boolean; reply?: string; error?: string }> {
    const task = this.store.getTask(taskId)
    if (!task) return { ok: false, error: 'Task not found' }
    const subtask = task.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) return { ok: false, error: 'Subtask not found' }
    const agent = this.store.getAgent(subtask.remoteAgentId)
    if (!agent) return { ok: false, error: 'Remote agent not found' }
    if (!subtask.remoteSessionId) {
      return { ok: false, error: 'Subtask remote session not created' }
    }

    this.appendLog(taskId, subtaskId, 'info', `用户在聊天窗口中发送追问消息: ${message}`)
    const res = await this.client.followup(agent, subtask.remoteSessionId, message)
    if (res.ok) {
      this.appendLog(taskId, subtaskId, 'info', `远程会话回复完成`)
    } else {
      this.appendLog(taskId, subtaskId, 'error', `远程追问执行失败: ${res.error}`)
    }
    return res
  }
}
