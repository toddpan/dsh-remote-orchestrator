# dsh-orchestrator (@dsh-external/dsh-remote-orchestrator)

> **DeepSeek Harness (DSH) 分布式多智能体协同编排插件**  
> 结合 `dsh-web-service`，实现主任务拆解、多远程 DSH 并发派发执行、实时工作日志与聊天窗口追问、远程子智能体配置池管理，以及主任务完成状态评估与总结报告生成。

[![GitHub repo](https://img.shields.io/badge/GitHub-toddpan%2Fdsh--orchestrator-blue?logo=github)](https://github.com/toddpan/dsh-orchestrator)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-green.svg)](LICENSE)
[![Cordis](https://img.shields.io/badge/Cordis-v4-orange.svg)](https://cordis.moe)

---

## 📖 核心功能特性

1. **子智能体管理（远程 DSH 节点池）**：
   - **远程访问地址配置**：自由指定远程 DSH 的 API Base URL（如 `http://<ip>:<port>/api/v1`），支持可选 Bearer API Key 鉴权。
   - **一键连通性探测 (Ping)**：实时探测远程 DSH 的服务状态、端口、运行时间及可用模型提供商列表。
   - **精细化运行配置**：针对每个远程节点独立指定模式预设（`agentPreset`，如 `cordis`）、运行权限（`danger-full-access` / `workspace-write` / `read-only`）、模型提供方（`provider`）、模型名称（`model`）与专属系统角色提示词（`systemPrompt`）。
   - **动态生命周期**：支持节点动态添加、编辑修改、删除与列表查询，数据持久化于本地存储。

2. **主任务智能拆解与协同派发**：
   - **一键智能拆解**：输入宏观业务或工程目标后，调度器可自动按专家团队分工（规划分析、核心实施、质量校验）将主任务自动拆解为子任务，并均匀轮询分配至各远程 DSH。
   - **自由精细规划**：支持手动定义每个子任务的标题、提示词要求，并绑定指定的远程 DSH 节点。
   - **异步并发流水线**：调度引擎并行在多个远程节点上创建会话并启动提示词流水线，不阻塞主会话。

3. **子任务监控、工作日志与聊天窗口**：
   - **全流程状态看板**：直观查看主任务及每个子任务的当前状态（`pending` 待规划、`running` 运行中、`completed` 已完成、`failed` 失败）。
   - **点击呼出详情抽屉**：
     - **工作日志 (Logs)**：完整时序记录，含会话创建、SessionID、下发提示词、工具调用次数统计及结果回执。
     - **聊天窗口 (Remote Chat)**：实时获取远程 DSH 会话的完整消息历史（包含模型的思维链深度推理 `reasoning` 与回答）；在聊天窗口中直接向远程会话**发送追问或追加指令**进行实时交互。

4. **完成状态判定与综合质检报告**：
   - 子任务全部结束时（或手动触发总结评估），系统综合所有子任务的产出成果做出判定：
     - `success`：全部子任务均顺利完成，达成总体目标。
     - `partial_success`：部分子任务成功完成，部分节点异常或超时。
     - `failed`：全部子任务均失败。
   - 自动聚合各个子任务的核心输出要点（Key Points），生成结构化的高层总结与执行结论。

5. **双通道体验**：
   - **交互式 Web 控制台**：浏览器直达 `http://<host>:3080/dsh-orchestrator`，并在 DSH 桌面 Web GUI 的会话视图面板中同步注册集成。
   - **LLM Agent 工具闭环**：内置 5 个标准模型工具，Agent 可在对话中自主编排调度分布式多机协作。

---

## 🛠️ 大模型工具 (Model Tools)

插件在 DSH 会话中自动挂载以下工具：

| 工具名称 | 功能描述 |
|---|---|
| `dsh_remote_agent_manage` | 管理远程 DSH 节点配置（操作类型：`list`, `upsert`, `delete`, `ping`） |
| `dsh_orchestrator_dispatch` | 拆解主任务并并发派发到各远程 DSH 节点执行 |
| `dsh_orchestrator_task_status` | 查询任务进度、子任务列表、执行日志与质检总结报告 |
| `dsh_orchestrator_subtask_chat` | 查看子任务在远程 DSH 的完整聊天记录，或向其发送追问消息 |
| `dsh_orchestrator_evaluate_task` | 综合各子任务产出做出最终完成状态判定，生成全景总结报告 |

---

## 🌐 RESTful API 路由

默认控制台与 API 前缀：`/dsh-orchestrator`

- `GET /dsh-orchestrator`：交互式 Web 控制台
- `GET /dsh-orchestrator/api/agents`：获取所有已配置的远程 DSH 智能体
- `POST /dsh-orchestrator/api/agents`：添加或更新远程 DSH 智能体配置
- `DELETE /dsh-orchestrator/api/agents/:id`：删除指定的远程 DSH 智能体
- `POST /dsh-orchestrator/api/agents/:id/ping`：测试指定远程节点的连通性
- `POST /dsh-orchestrator/api/ping-test`：快速测试任意 URL 的 DSH API 连通性
- `GET /dsh-orchestrator/api/tasks`：查询主任务列表与各子任务状态
- `POST /dsh-orchestrator/api/tasks`：创建并分发新的主任务
- `GET /dsh-orchestrator/api/tasks/:id`：查询指定主任务详情与日志
- `DELETE /dsh-orchestrator/api/tasks/:id`：删除指定主任务记录
- `POST /dsh-orchestrator/api/tasks/:id/summary`：重新评估并生成总结报告
- `GET /dsh-orchestrator/api/tasks/:id/subtasks/:subId/chat`：获取远程子任务聊天记录
- `POST /dsh-orchestrator/api/tasks/:id/subtasks/:subId/followup`：向远程子任务发送追问

---

## 🚀 安装、构建与注入

### 1. 克隆代码
```bash
git clone https://github.com/toddpan/dsh-orchestrator.git
cd dsh-orchestrator
```

### 2. 编译构建
```bash
bash scripts/build.sh
```

### 3. 在 DSH 中热注入
使用 `dsh-super-injector` 提供的运行时注入工具：
```bash
dev_inject_plugin {"dir": "/path/to/dsh-orchestrator"}
```

### 4. 打开控制台
在浏览器中访问：
```text
http://127.0.0.1:3080/dsh-orchestrator
```

---

## 📄 开源许可
[BSD-3-Clause License](LICENSE)
