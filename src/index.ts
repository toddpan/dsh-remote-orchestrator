/**
 * @dsh-external/dsh-remote-orchestrator
 * DSH 分布式多智能体协同编排插件
 * 与 dsh-web-service 深度结合，实现主子任务拆解派发、多远程 DSH 并发执行、日志与聊天窗口交互、子智能体配置与全景总结判定。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from 'cordis'
import z from 'schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-tools'

import { OrchestratorStore } from './store.js'
import { TaskOrchestrator } from './orchestrator.js'
import { OrchestratorRouter } from './router.js'
import { registerOrchestratorTools } from './tools.js'
import type { PluginConfig } from './types.js'

export const name = '@dsh-external/dsh-remote-orchestrator'
export const inject = ['webServer', 'tools']

export interface Config extends PluginConfig {}

export const Config: z<Config> = z.object({
  pathPrefix: z.string().default('/dsh-orchestrator').description('编排控制台与 API 路由前缀'),
  storagePath: z.string().default('').description('本地存储文件绝对路径（留空则默认 ~/.dsh/dsh-remote-orchestrator.json）'),
  autoSummary: z.boolean().default(true).description('子任务全部完成后是否自动进行完成状态判定与总结'),
})

export function apply(ctx: Context, config: Config): void {
  const prefix = config.pathPrefix || '/dsh-orchestrator'
  const store = new OrchestratorStore(config.storagePath || undefined)
  const orchestrator = new TaskOrchestrator(ctx, store)
  const router = new OrchestratorRouter(store, orchestrator)

  // 1. 注册 HTTP 路由（包含 Web 控制台与 REST API）
  ctx.effect(() => {
    return ctx.webServer.register({
      kind: 'prefix',
      path: prefix,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const handled = await router.dispatch(req, res, prefix)
        if (!handled && !res.headersSent) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: `Endpoint not found: ${req.url}` }))
        }
      },
    })
  }, '@dsh-external/dsh-remote-orchestrator: webServer route')

  // 2. 注册模型 Tools 给会话 Agent
  registerOrchestratorTools(ctx, store, orchestrator, { pathPrefix: prefix })

  const webServer = ctx.get('webServer') as any
  const port = webServer?.port || 3080
  console.log(`[dsh-remote-orchestrator] Mounted successfully. Web console available at: http://127.0.0.1:${port}${prefix}`)
}
