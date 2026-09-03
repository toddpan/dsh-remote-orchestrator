/**
 * @dsh-external/dsh-remote-orchestrator - Data Storage
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import type { RemoteDshAgent, OrchestratorTask, OrchestratorSubtask, StorageData } from './types.js'

export class OrchestratorStore {
  private filePath: string
  private data: StorageData

  constructor(customPath?: string) {
    const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
    this.filePath = customPath || join(dshHome, 'dsh-remote-orchestrator.json')
    this.data = {
      agents: [],
      tasks: [],
    }
    this.load()
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        this.data = {
          agents: Array.isArray(parsed.agents) ? parsed.agents : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        }
      } else {
        // 初始注入默认 agent 示例 (本地 DSH 实例)
        this.data = {
          agents: [
            {
              id: 'local-dsh',
              name: '本地 DSH 节点 (默认)',
              apiBaseUrl: 'http://127.0.0.1:3080/api/v1',
              agentPreset: 'cordis',
              permission: 'danger-full-access',
              systemPrompt: '你是分布式协同集群中的专业子任务执行智能体，负责精确高效完成拆解后的子任务。',
              description: '本节点本地 DSH 实例，默认作为开箱即用的工作节点',
              tags: ['local', 'default'],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          tasks: [],
        }
        this.save()
      }
    } catch {
      // 容错回退
    }
  }

  public save(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[dsh-remote-orchestrator] Failed to save store:', err)
    }
  }

  // ---- Agents CRUD ----

  public getAgents(): RemoteDshAgent[] {
    return [...this.data.agents]
  }

  public getAgent(id: string): RemoteDshAgent | undefined {
    return this.data.agents.find((a) => a.id === id)
  }

  public upsertAgent(agent: RemoteDshAgent): RemoteDshAgent {
    const idx = this.data.agents.findIndex((a) => a.id === agent.id)
    const now = Date.now()
    if (idx >= 0) {
      this.data.agents[idx] = {
        ...this.data.agents[idx],
        ...agent,
        updatedAt: now,
      }
      this.save()
      return this.data.agents[idx]
    } else {
      const newAgent: RemoteDshAgent = {
        ...agent,
        createdAt: now,
        updatedAt: now,
      }
      this.data.agents.push(newAgent)
      this.save()
      return newAgent
    }
  }

  public deleteAgent(id: string): boolean {
    const lenBefore = this.data.agents.length
    this.data.agents = this.data.agents.filter((a) => a.id !== id)
    const changed = this.data.agents.length !== lenBefore
    if (changed) this.save()
    return changed
  }

  // ---- Tasks CRUD ----

  public getTasks(): OrchestratorTask[] {
    return [...this.data.tasks].sort((a, b) => b.createdAt - a.createdAt)
  }

  public getTask(id: string): OrchestratorTask | undefined {
    return this.data.tasks.find((t) => t.id === id)
  }

  public upsertTask(task: OrchestratorTask): OrchestratorTask {
    const idx = this.data.tasks.findIndex((t) => t.id === task.id)
    task.updatedAt = Date.now()
    if (idx >= 0) {
      this.data.tasks[idx] = task
    } else {
      this.data.tasks.unshift(task)
    }
    this.save()
    return task
  }

  public deleteTask(id: string): boolean {
    const lenBefore = this.data.tasks.length
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id)
    const changed = this.data.tasks.length !== lenBefore
    if (changed) this.save()
    return changed
  }

  public updateSubtask(
    taskId: string,
    subtaskId: string,
    updater: (subtask: OrchestratorSubtask) => void
  ): OrchestratorSubtask | undefined {
    const task = this.getTask(taskId)
    if (!task) return undefined
    const subtask = task.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) return undefined

    updater(subtask)
    task.updatedAt = Date.now()
    this.save()
    return subtask
  }
}
