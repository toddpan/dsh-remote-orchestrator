---
name: dsh-orchestrator
description: 用 DSH Remote Orchestrator 把主任务拆解并派发给多个远程 DSH 节点并发执行：管理远程子智能体节点池、查看任务进度与工作日志、向远程会话追问、生成质检总结报告。需要多机协同、分布式执行或并行处理大任务时使用。
whenToUse: 用户要求多智能体协同、把任务分发给多个远程 DSH 执行、查询编排任务进度、向远程子任务追问、生成任务总结报告，或管理远程 DSH 节点配置时使用。
---

# DSH Remote Orchestrator（dsh-orchestrator）

本机 DSH 已由插件 `@dsh-external/dsh-remote-orchestrator` 提供分布式多智能体编排能力：把一个主任务拆解为若干子任务，并发派发到多个远程 DSH 节点（每个节点是一台装了 dsh-web-service 插件的 DSH 实例）执行，全程可监控、可追问、可出综合报告。

## 两条使用路径

| 路径 | 适用场景 |
|---|---|
| **LLM 工具**（推荐，本节重点） | AI 在会话中直接调用 5 个 `dsh_*` 工具完成编排闭环 |
| **REST API** | 外部脚本/三方系统集成；控制台 `http://127.0.0.1:3080/dsh-orchestrator` |

## LLM 工具速查

| 工具 | 何时用 | 关键参数 |
|---|---|---|
| `dsh_remote_agent_manage` | 配置远程节点池 | `action: list/upsert/delete/ping`；upsert 传 `agent` 对象，delete/ping 传 `agentId` |
| `dsh_orchestrator_dispatch` | **拆解并派发主任务** | `title` + `objective`；可选 `subtasks[]` 手动规划 |
| `dsh_orchestrator_task_status` | 查进度/日志/报告 | `taskId`（不传返回全部任务概览） |
| `dsh_orchestrator_subtask_chat` | 看远程会话记录 / 追问 | `taskId` + `subtaskId`；`followupMessage` 发追问 |
| `dsh_orchestrator_evaluate_task` | 终局判定与总结 | `taskId` |

## 标准编排流程（4 步）

### 1. 准备节点池

```text
dsh_remote_agent_manage { "action": "list" }        // 先看现有节点
dsh_remote_agent_manage { "action": "ping", "agentId": "brain-dsh" }  // 探测连通性
```

添加/更新节点（upsert，传 `id` 即更新，不传即新增）：

```json
{
  "action": "upsert",
  "agent": {
    "id": "brain-dsh",
    "name": "Brain 远程服务器节点",
    "apiBaseUrl": "http://<ip>:<port>/api/v1",
    "apiKey": "<可选 Bearer Token>",
    "agentPreset": "cordis",
    "permission": "danger-full-access",
    "provider": "gemini37flash",
    "model": "gemini-3.8-flash-high",
    "systemPrompt": "你是部署在远程服务器上的专业执行智能体……",
    "description": "节点用途说明"
  }
}
```

字段说明：
- `apiBaseUrl`：远程 DSH 的 Web Service 地址（**远程机须已注入 dsh-web-service 插件**），通常 `http://<ip>:<port>/api/v1`
- `permission`：`danger-full-access` / `workspace-write` / `read-only`
- `provider`/`model`：不传则用远程节点自己的全局默认模型；传 `"model"` 而不传 `"provider"` 时按远程节点默认 provider 解析
- 新装节点自带 `local-dsh`（本机回环），可作为兜底工作节点

### 2. 拆解并派发主任务

自动拆解（推荐，调度器按规划/实施/校验分工并轮询分配节点）：

```json
{
  "title": "重构支付模块",
  "objective": "详细总目标与产出要求：重构 src/payment 下的支付模块，保持接口兼容，输出改动清单与测试报告"
}
```

手动精细规划（`remoteAgentId` 必须是节点池里已存在的 id）：

```json
{
  "title": "全站升级",
  "objective": "主任务总目标……",
  "subtasks": [
    { "title": "前端适配", "prompt": "改造……验收标准……", "remoteAgentId": "local-dsh" },
    { "title": "后端迁移", "prompt": "迁移……产出 SQL 与回滚脚本", "remoteAgentId": "brain-dsh" }
  ]
}
```

返回 `taskId` 与各 `subtaskId` —— 后续所有查询都用它。

### 3. 监控进度、看日志、追问

```text
dsh_orchestrator_task_status { "taskId": "t-xxx" }              // 子任务状态 + 工作日志
dsh_orchestrator_subtask_chat { "taskId": "t-xxx", "subtaskId": "s-1" }   // 远程会话完整消息（含 reasoning）
dsh_orchestrator_subtask_chat { "taskId": "t-xxx", "subtaskId": "s-1",
  "followupMessage": "请补充单元测试后重新汇报" }                 // 向远程会话发追问并等待回复
```

子任务状态：`pending`（待执行）→ `running` → `completed` / `failed`。
`task_status` 不传 `taskId` 可返回所有主任务概览；全部子任务结束时会附带自动生成的质检总结报告。

### 4. 终局评估

```text
dsh_orchestrator_evaluate_task { "taskId": "t-xxx" }
```

综合各子任务产出做最终判定：`success` / `partial_success` / `failed`，聚合各子任务核心要点生成结构化总结报告。

## REST API（外部集成用）

前缀：`http://127.0.0.1:3080/dsh-orchestrator`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/agents` | 节点列表 |
| POST | `/api/agents` | 添加/更新节点（body 同工具的 agent 对象） |
| DELETE | `/api/agents/:id` | 删除节点 |
| POST | `/api/agents/:id/ping` | 探测指定节点 |
| POST | `/api/ping-test` | 探测任意 URL：`{"apiBaseUrl": "..."}` |
| GET | `/api/tasks` | 主任务列表 |
| POST | `/api/tasks` | 创建并派发主任务 |
| GET | `/api/tasks/:id` | 任务详情与日志 |
| DELETE | `/api/tasks/:id` | 删除任务记录 |
| POST | `/api/tasks/:id/summary` | 重新生成总结报告 |
| GET | `/api/tasks/:id/subtasks/:subId/chat` | 远程子任务聊天记录 |
| POST | `/api/tasks/:id/subtasks/:subId/followup` | 向远程子任务发追问 |

Web 控制台：`http://127.0.0.1:3080/dsh-orchestrator`（也可从 DSH Web GUI 侧栏「编排中心」进入）。

## 排错速查

| 现象 | 处理 |
|---|---|
| ping 失败 | 远程机 DSH 未启动、端口不通，或远程机**没装 dsh-web-service 插件**（节点依赖其 `/api/v1` 接口） |
| 派发后子任务一直 pending | 节点池为空或 `remoteAgentId` 不存在；先 `action: list` 核对 |
| subtask_chat 报找不到会话 | 远程子任务尚未创建会话或已失败；先看 task_status 的日志 |
| 远程执行用了错误模型 | 节点配置里显式指定 `provider`/`model`，别依赖远程默认 |
| 任务已删 / taskId 无效 | `task_status` 不传 taskId 先拿概览 |
| 追问无响应 | 远程会话可能仍在跑；稍候重发，或先 chat 查看当前状态 |

## 调用策略

- **先 ping 再派发**：派发前确认目标节点连通，避免子任务直接 failed。
- `objective` 要写清**产出要求**（交付物、验收标准），子任务提示词质量决定执行质量。
- 节点数少于子任务数时调度器会轮询复用节点；重负载任务优先手动 `subtasks` 均衡分配。
- 长任务用 `task_status` 轮询而非阻塞等待；需要人工介入时用 `followupMessage` 追问。
- 一切以**实测工具调用/ curl** 为准，不要凭记忆猜测字段。
