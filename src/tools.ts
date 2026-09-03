/**
 * @dsh-external/dsh-remote-orchestrator - Model Tools for DSH Agents
 */

import type { Context } from 'cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { OrchestratorStore } from './store.js'
import type { TaskOrchestrator } from './orchestrator.js'
import { RemoteDshClient } from './remote-client.js'

export function registerOrchestratorTools(
  ctx: Context,
  store: OrchestratorStore,
  orchestrator: TaskOrchestrator,
  config: { pathPrefix?: string; port?: number }
): void {
  const client = new RemoteDshClient()
  const webServer = ctx.get('webServer') as any
  const port = config.port || webServer?.port || 3080
  const prefix = config.pathPrefix || '/dsh-orchestrator'
  const consoleUrl = `http://127.0.0.1:${port}${prefix}`

  // 1. 远程 DSH 子智能体管理工具
  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'dsh_remote_agent_manage',
          description:
            '管理远程 DSH 子智能体配置：查询列表、添加新节点、更新配置、删除节点或测试连通性',
          parameters: {
            action: {
              type: 'string',
              description: '操作类型: list(列出), upsert(添加或更新), delete(删除), ping(测试连通性)',
            },
            agent: {
              type: 'json',
              description:
                '子智能体配置对象（适用于 upsert 操作）：{ id, name, apiBaseUrl, agentPreset, provider, model, permission, systemPrompt, apiKey }',
            },
            agentId: {
              type: 'string',
              description: '目标智能体 ID（适用于 delete 或 ping 操作）',
            },
          },
          output: {
            schema: { type: 'string' },
            render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: any) {
            const action = args.action || 'list'

            if (action === 'list') {
              const list = store.getAgents()
              return JSON.stringify(
                {
                  ok: true,
                  count: list.length,
                  agents: list,
                  consoleUrl,
                },
                null,
                2
              )
            }

            if (action === 'upsert') {
              if (!args.agent || !args.agent.id || !args.agent.name || !args.agent.apiBaseUrl) {
                return JSON.stringify({ ok: false, error: '缺少必填字段 id, name, apiBaseUrl' })
              }
              const saved = store.upsertAgent(args.agent)
              return JSON.stringify({ ok: true, message: '远程智能体配置已保存', agent: saved }, null, 2)
            }

            if (action === 'delete') {
              if (!args.agentId) return JSON.stringify({ ok: false, error: '缺少 agentId' })
              const deleted = store.deleteAgent(args.agentId)
              return JSON.stringify({ ok: true, deleted, agentId: args.agentId })
            }

            if (action === 'ping') {
              if (!args.agentId) return JSON.stringify({ ok: false, error: '缺少 agentId' })
              const a = store.getAgent(args.agentId)
              if (!a) return JSON.stringify({ ok: false, error: '未找到指定智能体' })
              const pingRes = await client.ping(a)
              return JSON.stringify({ ok: true, agent: a.name, ping: pingRes }, null, 2)
            }

            return JSON.stringify({ ok: false, error: `不支持的 action: ${action}` })
          },
        })
      ),
    '@dsh-external/dsh-remote-orchestrator: agent_manage tool'
  )

  // 2. 主任务拆解与协同派发工具
  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'dsh_orchestrator_dispatch',
          description:
            '将一个主任务拆解成若干子任务并分发给多个远程 DSH 执行。如果未手动传入 subtasks，系统将自动拆解规划并派发。',
          parameters: {
            title: {
              type: 'string',
              description: '主任务简明标题',
            },
            objective: {
              type: 'string',
              description: '主任务详细总目标与产出要求',
            },
            subtasks: {
              type: 'json',
              description:
                '可选的子任务规划列表：[{ title, prompt, remoteAgentId }]。若省略则自动拆解分发。',
            },
          },
          output: {
            schema: { type: 'string' },
            render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: any) {
            if (!args.objective) {
              return JSON.stringify({ ok: false, error: '缺少主任务目标 objective' })
            }
            try {
              const task = await orchestrator.dispatch({
                title: args.title,
                objective: args.objective,
                subtasks: args.subtasks,
              })
              return JSON.stringify(
                {
                  ok: true,
                  message: '主任务已成功拆解并派发至各远程 DSH 执行节点',
                  taskId: task.id,
                  title: task.title,
                  subtasksCount: task.subtasks.length,
                  subtasks: task.subtasks.map((s) => ({
                    id: s.id,
                    title: s.title,
                    agentId: s.remoteAgentId,
                    status: s.status,
                  })),
                  consoleUrl: `${consoleUrl}#task-card-${task.id}`,
                },
                null,
                2
              )
            } catch (err: any) {
              return JSON.stringify({ ok: false, error: err.message })
            }
          },
        })
      ),
    '@dsh-external/dsh-remote-orchestrator: dispatch tool'
  )

  // 3. 查询主任务与子任务状态及日志
  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'dsh_orchestrator_task_status',
          description:
            '查询主任务及其各子任务的执行进度、状态、工作日志与最终质检总结报告',
          parameters: {
            taskId: {
              type: 'string',
              description: '主任务 ID（若不传则返回所有任务概览）',
            },
          },
          output: {
            schema: { type: 'string' },
            render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: any) {
            if (!args.taskId) {
              const tasks = store.getTasks()
              return JSON.stringify(
                {
                  ok: true,
                  count: tasks.length,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    subtasksCount: t.subtasks.length,
                    completedCount: t.subtasks.filter((s) => s.status === 'completed').length,
                    createdAt: new Date(t.createdAt).toISOString(),
                  })),
                  consoleUrl,
                },
                null,
                2
              )
            }

            const task = store.getTask(args.taskId)
            if (!task) {
              return JSON.stringify({ ok: false, error: `未找到主任务: ${args.taskId}` })
            }

            return JSON.stringify(
              {
                ok: true,
                task: {
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  objective: task.objective,
                  subtasks: task.subtasks.map((s) => ({
                    id: s.id,
                    title: s.title,
                    status: s.status,
                    remoteAgentId: s.remoteAgentId,
                    remoteSessionId: s.remoteSessionId,
                    logsCount: s.logs.length,
                    recentLogs: s.logs.slice(-3),
                    resultPreview: s.result?.content?.slice(0, 150),
                  })),
                  summary: task.summary,
                },
                consoleUrl: `${consoleUrl}#task-card-${task.id}`,
              },
              null,
              2
            )
          },
        })
      ),
    '@dsh-external/dsh-remote-orchestrator: task_status tool'
  )

  // 4. 查看子任务在远程 DSH 的完整聊天记录并可追问
  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'dsh_orchestrator_subtask_chat',
          description:
            '查看指定子任务在远程 DSH 会话上的完整聊天消息记录，或向该远程会话发送追问指令',
          parameters: {
            taskId: {
              type: 'string',
              description: '主任务 ID',
            },
            subtaskId: {
              type: 'string',
              description: '子任务 ID',
            },
            followupMessage: {
              type: 'string',
              description: '可选的追问消息。提供后将直接发送给远程会话并等待回复。',
            },
          },
          output: {
            schema: { type: 'string' },
            render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: any) {
            if (!args.taskId || !args.subtaskId) {
              return JSON.stringify({ ok: false, error: '缺少 taskId 或 subtaskId' })
            }

            // 如果有追问内容，先发送追问
            if (args.followupMessage && args.followupMessage.trim()) {
              const res = await orchestrator.sendFollowupToSubtask(
                args.taskId,
                args.subtaskId,
                args.followupMessage.trim()
              )
              if (!res.ok) {
                return JSON.stringify({ ok: false, error: `发送追问失败: ${res.error}` })
              }
            }

            const chatRes = await orchestrator.getSubtaskChat(args.taskId, args.subtaskId)
            return JSON.stringify(chatRes, null, 2)
          },
        })
      ),
    '@dsh-external/dsh-remote-orchestrator: subtask_chat tool'
  )

  // 5. 决定主任务完成状态并生成总结报告
  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'dsh_orchestrator_evaluate_task',
          description:
            '检查主任务的所有子任务完成情况，综合各子任务产出做出最终完成状态判定，生成完整总结报告',
          parameters: {
            taskId: {
              type: 'string',
              description: '主任务 ID',
            },
          },
          output: {
            schema: { type: 'string' },
            render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
          },
          async execute(args: any) {
            if (!args.taskId) return JSON.stringify({ ok: false, error: '缺少 taskId' })
            const task = await orchestrator.evaluateAndSummarizeTask(args.taskId)
            if (!task) return JSON.stringify({ ok: false, error: `未找到任务: ${args.taskId}` })
            return JSON.stringify(
              {
                ok: true,
                taskId: task.id,
                finalStatus: task.status,
                summary: task.summary,
              },
              null,
              2
            )
          },
        })
      ),
    '@dsh-external/dsh-remote-orchestrator: evaluate_task tool'
  )
}
