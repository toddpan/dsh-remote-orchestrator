/**
 * @dsh-external/dsh-remote-orchestrator - Interactive Web Console UI
 */

export function renderWebUi(prefix: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DSH 远程多智能体协同编排器</title>
  <style>
    :root {
      --bg-base: #0f172a;
      --bg-surface: #1e293b;
      --bg-surface-hover: #334155;
      --bg-surface-elevated: #1e293b;
      --border-color: #334155;
      --border-hover: #475569;
      --text-main: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --primary-rgb: 56, 189, 248;
      --accent: #818cf8;
      --success: #34d399;
      --warning: #fbbf24;
      --error: #f87171;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-family);
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* Top Navigation */
    header {
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      padding: 0 24px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      z-index: 20;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0284c7, #818cf8);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 16px;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }
    .tabs {
      display: flex;
      gap: 8px;
      height: 100%;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 600;
      padding: 0 16px;
      height: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.02);
    }
    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .status-badge-top {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.1);
      color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    /* Main Container */
    main {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      position: relative;
    }
    .container {
      max-width: 1280px;
      margin: 0 auto;
    }

    /* Common Card Styles */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: border-color 0.2s ease;
    }
    .card:hover {
      border-color: var(--border-hover);
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Status Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-pending { background: rgba(251, 191, 36, 0.15); color: var(--warning); border: 1px solid rgba(251, 191, 36, 0.3); }
    .badge-running { background: rgba(56, 189, 248, 0.15); color: var(--primary); border: 1px solid rgba(56, 189, 248, 0.3); animation: pulse 2s infinite; }
    .badge-completed, .badge-success { background: rgba(52, 211, 153, 0.15); color: var(--success); border: 1px solid rgba(52, 211, 153, 0.3); }
    .badge-partial_success { background: rgba(129, 140, 248, 0.15); color: var(--accent); border: 1px solid rgba(129, 140, 248, 0.3); }
    .badge-failed { background: rgba(248, 113, 113, 0.15); color: var(--error); border: 1px solid rgba(248, 113, 113, 0.3); }

    @keyframes pulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; filter: brightness(1.2); }
      100% { opacity: 0.8; }
    }

    /* Buttons */
    .btn {
      background: var(--bg-surface-hover);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: var(--border-hover);
      border-color: #64748b;
    }
    .btn-primary {
      background: #0284c7;
      border-color: #0369a1;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.3);
    }
    .btn-sm {
      padding: 4px 10px;
      font-size: 12px;
      border-radius: 6px;
    }

    /* Subtask Grid */
    .subtasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 14px;
    }
    .subtask-card {
      background: #182234;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 14px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .subtask-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }
    .subtask-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .subtask-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }
    .subtask-agent-tag {
      font-size: 11px;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .subtask-preview {
      font-size: 12px;
      color: var(--text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .subtask-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px dashed var(--border-color);
      padding-top: 8px;
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* Summary Card */
    .summary-box {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9));
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 18px;
      margin-top: 16px;
    }
    .summary-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 8px;
    }
    .summary-conclusion {
      font-size: 13px;
      color: var(--text-main);
      background: rgba(0, 0, 0, 0.2);
      padding: 12px;
      border-radius: 8px;
      border-left: 3px solid var(--primary);
      margin-top: 10px;
    }

    /* Drawer for Logs & Chat */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 100;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .drawer-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .drawer {
      position: fixed;
      top: 0;
      right: -850px;
      width: min(850px, 92vw);
      height: 100%;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-color);
      z-index: 101;
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
      transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .drawer.active {
      right: 0;
    }
    .drawer-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .drawer-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      padding: 0 20px;
      gap: 12px;
      flex-shrink: 0;
    }
    .drawer-tab {
      padding: 12px 14px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      cursor: pointer;
      background: transparent;
      border-left: none;
      border-right: none;
      border-top: none;
    }
    .drawer-tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }

    /* Logs View */
    .log-timeline {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: monospace;
      font-size: 12px;
    }
    .log-item {
      padding: 8px 12px;
      border-radius: 6px;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .log-time {
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .log-level {
      font-weight: 700;
      flex-shrink: 0;
    }
    .log-level-info { color: var(--primary); }
    .log-level-warn { color: var(--warning); }
    .log-level-error { color: var(--error); }
    .log-level-tool { color: var(--accent); }
    .log-msg { color: var(--text-main); word-break: break-all; }

    /* Chat View */
    .chat-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 16px;
    }
    .chat-bubble {
      max-width: 88%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.6;
      word-break: break-word;
    }
    .chat-bubble-user {
      align-self: flex-end;
      background: #0369a1;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .chat-bubble-assistant {
      align-self: flex-start;
      background: #182234;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      border-bottom-left-radius: 4px;
    }
    .chat-reasoning {
      background: rgba(0, 0, 0, 0.3);
      border-left: 2px solid var(--accent);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #cbd5e1;
      margin-bottom: 10px;
      white-space: pre-wrap;
    }
    .chat-input-row {
      border-top: 1px solid var(--border-color);
      padding-top: 14px;
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .chat-input {
      flex: 1;
      background: #111827;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-main);
      font-size: 13px;
      outline: none;
      resize: none;
      height: 44px;
    }
    .chat-input:focus {
      border-color: var(--primary);
    }

    /* Agent Management Cards & Form */
    .agent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
    }
    .agent-card {
      background: #182234;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .agent-card-title {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .agent-detail-row {
      font-size: 12px;
      display: flex;
      gap: 8px;
      color: var(--text-secondary);
    }
    .agent-detail-row span.k {
      color: var(--text-muted);
      width: 70px;
      flex-shrink: 0;
    }
    .agent-detail-row span.v {
      color: var(--text-main);
      word-break: break-all;
    }

    /* Modal Form */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 200;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.active {
      display: flex;
    }
    .modal {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      width: min(600px, 94vw);
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
    }
    .form-group {
      margin-bottom: 14px;
    }
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      background: #111827;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text-main);
      font-size: 13px;
      outline: none;
    }
    .form-control:focus {
      border-color: var(--primary);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 10px 18px;
      border-radius: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      font-size: 13px;
      z-index: 999;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      pointer-events: none;
    }
    #toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-icon">D</div>
      <div>
        <span>DSH Remote Orchestrator</span>
        <div style="font-size: 11px; font-weight: normal; color: var(--text-muted);">分布式多智能体协同编排器</div>
      </div>
    </div>

    <nav class="tabs">
      <button class="tab-btn active" onclick="switchTab('tasks')">任务调度大厅</button>
      <button class="tab-btn" onclick="switchTab('dispatch')">+ 新建主任务</button>
      <button class="tab-btn" onclick="switchTab('agents')">子智能体管理 (远程 DSH)</button>
    </nav>

    <div class="status-badge-top">
      <div class="status-dot"></div>
      <span id="header-stat">就绪</span>
    </div>
  </header>

  <main>
    <div class="container">
      <!-- Tab 1: Tasks Hall -->
      <section id="tab-tasks">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2 style="font-size: 18px; font-weight: 700;">主任务编排列表</h2>
          <button class="btn btn-sm" onclick="loadTasks()">↻ 刷新列表</button>
        </div>
        <div id="tasks-list-container">加载中...</div>
      </section>

      <!-- Tab 2: Dispatch New Task -->
      <section id="tab-dispatch" style="display: none;">
        <div class="card">
          <div class="card-title">发起主任务拆解与协同派发</div>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
            输入您的核心总目标。编排器将自动或者根据您的规划，将任务拆解为子任务并并发分发给各远程 DSH 节点执行，最终自动评估与总结完成状态。
          </p>

          <div class="form-group">
            <label class="form-label">主任务名称</label>
            <input type="text" id="new-task-title" class="form-control" placeholder="例如：全栈商城微服务架构拆解与代码设计">
          </div>

          <div class="form-group">
            <label class="form-label">主任务目标详情 (Objective)</label>
            <textarea id="new-task-objective" class="form-control" rows="4" placeholder="详细输入您的任务要求、产出标准与技术指标..."></textarea>
          </div>

          <div style="margin: 16px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label" style="margin: 0;">子任务精细规划 (留空则自动按专家团队拆解分发)</label>
              <button class="btn btn-sm" onclick="addSubtaskRow()">+ 添加自定义子任务</button>
            </div>
            <div id="subtask-inputs-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button class="btn" onclick="clearDispatchForm()">重置</button>
            <button class="btn btn-primary" onclick="submitDispatch()">🚀 启动派发协同执行</button>
          </div>
        </div>
      </section>

      <!-- Tab 3: Remote Agents Management -->
      <section id="tab-agents" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 700;">子智能体管理 (远程 DSH 节点)</h2>
            <div style="font-size: 12px; color: var(--text-secondary);">管理被调度的远程 DSH 实例，配置其 API 地址、预设模式、指定模型、运行权限与专属提示词</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openAgentModal()">+ 添加远程 DSH 节点</button>
        </div>
        <div id="agents-grid-container" class="agent-grid">加载中...</div>
      </section>
    </div>
  </main>

  <!-- Drawer: Subtask Logs & Chat -->
  <div id="drawer-overlay" class="drawer-overlay" onclick="closeDrawer()"></div>
  <div id="drawer" class="drawer">
    <div class="drawer-header">
      <div>
        <div id="drawer-subtask-title" style="font-size: 16px; font-weight: 700;">子任务详情</div>
        <div id="drawer-subtask-meta" style="font-size: 12px; color: var(--text-secondary);">加载中...</div>
      </div>
      <button class="btn btn-sm" onclick="closeDrawer()">✕ 关闭</button>
    </div>
    <div class="drawer-tabs">
      <button id="tab-btn-logs" class="drawer-tab active" onclick="switchDrawerTab('logs')">工作日志 (Logs)</button>
      <button id="tab-btn-chat" class="drawer-tab" onclick="switchDrawerTab('chat')">聊天窗口 (Remote Chat)</button>
    </div>
    <div class="drawer-body">
      <!-- Logs Tab -->
      <div id="drawer-view-logs" style="display: block;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 12px; color: var(--text-secondary);">子任务完整执行日志与远程网络请求记录</span>
          <button class="btn btn-sm" onclick="refreshCurrentSubtask()">↻ 刷新日志</button>
        </div>
        <div id="drawer-logs-content" class="log-timeline">暂无日志</div>
      </div>

      <!-- Chat Tab -->
      <div id="drawer-view-chat" class="chat-container" style="display: none;">
        <div id="drawer-chat-messages" class="chat-messages">加载中...</div>
        <div class="chat-input-row">
          <textarea id="drawer-chat-input" class="chat-input" placeholder="向该远程会话发送追问或追加指令... (Enter 发送)"></textarea>
          <button class="btn btn-primary" onclick="sendFollowupMessage()">发送</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Add / Edit Agent -->
  <div id="agent-modal-overlay" class="modal-overlay">
    <div class="modal">
      <h3 id="modal-agent-title" style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">配置远程 DSH 智能体</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">智能体唯一 ID *</label>
          <input type="text" id="agent-form-id" class="form-control" placeholder="如 dsh-node-1">
        </div>
        <div class="form-group">
          <label class="form-label">显示名称 *</label>
          <input type="text" id="agent-form-name" class="form-control" placeholder="如 代码工程专家节点">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">远程 DSH API 访问地址 *</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="agent-form-api" class="form-control" placeholder="http://127.0.0.1:3080/api/v1">
          <button class="btn btn-sm" onclick="testFormConnection()">Ping 测试</button>
        </div>
        <div id="agent-ping-result" style="font-size: 11px; margin-top: 4px;"></div>
      </div>

      <div class="form-group">
        <label class="form-label">API Key / Bearer 认证 Token (可选)</label>
        <input type="password" id="agent-form-key" class="form-control" placeholder="若远程开启鉴权则填写">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">模式 (Preset / Mode)</label>
          <div id="preset-field-container">
            <input type="text" id="agent-form-preset" class="form-control" value="cordis" placeholder="cordis / default">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">运行权限 (Permission)</label>
          <select id="agent-form-permission" class="form-control">
            <option value="danger-full-access">danger-full-access (全权限)</option>
            <option value="workspace-write">workspace-write (工作区读写)</option>
            <option value="read-only">read-only (只读)</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">模型提供方 (Provider)</label>
          <div id="provider-field-container">
            <input type="text" id="agent-form-provider" class="form-control" placeholder="留空则用节点默认模型" oninput="refreshModelOptions()">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">指定模型名称 (Model)</label>
          <div id="model-field-container">
            <input type="text" id="agent-form-model" class="form-control" placeholder="留空则用节点默认模型">
          </div>
        </div>
      </div>

      <div class="form-group">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-sm" onclick="loadFormModels(false, true)">⤓ 获取该节点可用模型/预设</button>
          <span id="agent-models-result" style="font-size: 11px; color: var(--text-secondary);">可从远程节点拉取可用模型与 Agent 预设，避免手填导致执行失败</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">专属系统提示词 / 角色定位 (System Prompt)</label>
        <textarea id="agent-form-prompt" class="form-control" rows="3" placeholder="例如：你是由主编排器调度的专业代码架构师，负责精确执行架构设计与核心实现..."></textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
        <button class="btn" onclick="closeAgentModal()">取消</button>
        <button class="btn btn-primary" onclick="saveAgentForm()">保存配置</button>
      </div>
    </div>
  </div>

  <div id="toast"></div>

  <script>
    const API_PREFIX = '${prefix}';
    let gAgents = [];
    let gTasks = [];
    let gActiveTaskId = null;
    let gActiveSubtaskId = null;
    let gDrawerTab = 'logs';

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    function switchTab(name) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(name));
      if (activeBtn) activeBtn.classList.add('active');

      document.getElementById('tab-tasks').style.display = name === 'tasks' ? 'block' : 'none';
      document.getElementById('tab-dispatch').style.display = name === 'dispatch' ? 'block' : 'none';
      document.getElementById('tab-agents').style.display = name === 'agents' ? 'block' : 'none';

      if (name === 'tasks') loadTasks();
      if (name === 'agents') loadAgents();
    }

    // ---- API Requests ----
    async function apiReq(endpoint, method = 'GET', body = null) {
      try {
        const opts = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(API_PREFIX + endpoint, opts);
        return await res.json();
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

    // ---- Agents Management ----
    async function loadAgents() {
      const res = await apiReq('/agents');
      if (res.ok) {
        gAgents = res.data || [];
        renderAgents();
        document.getElementById('header-stat').textContent = '已连接 ' + gAgents.length + ' 节点';
      }
    }

    function renderAgents() {
      const container = document.getElementById('agents-grid-container');
      if (gAgents.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); grid-column:1/-1;">暂未配置远程 DSH 智能体，请点击上方按钮添加。</div>';
        return;
      }
      container.innerHTML = gAgents.map(a => \`
        <div class="agent-card">
          <div class="agent-card-title">
            <span>\${escapeHtml(a.name)}</span>
            <span class="badge badge-completed">\${escapeHtml(a.id)}</span>
          </div>
          <div class="agent-detail-row">
            <span class="k">API 地址:</span>
            <span class="v" style="color:var(--primary); font-family:monospace;">\${escapeHtml(a.apiBaseUrl)}</span>
          </div>
          <div class="agent-detail-row">
            <span class="k">模式/预设:</span>
            <span class="v">\${escapeHtml(a.agentPreset || 'cordis')}</span>
          </div>
          <div class="agent-detail-row">
            <span class="k">模型指定:</span>
            <span class="v">\${escapeHtml(a.provider ? a.provider + ' / ' + (a.model || 'default') : '系统默认')}</span>
          </div>
          <div class="agent-detail-row">
            <span class="k">运行权限:</span>
            <span class="v">\${escapeHtml(a.permission || 'danger-full-access')}</span>
          </div>
          \${a.systemPrompt ? \`
          <div class="agent-detail-row">
            <span class="k">提示词:</span>
            <span class="v" style="font-size:11px; color:var(--text-muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">\${escapeHtml(a.systemPrompt)}</span>
          </div>\` : ''}
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px; border-top:1px dashed var(--border-color); padding-top:10px;">
            <button class="btn btn-sm" onclick="pingAgent('\${a.id}')">⚡ 连通性测试</button>
            <button class="btn btn-sm" onclick="editAgent('\${a.id}')">编辑</button>
            <button class="btn btn-sm btn-danger" onclick="deleteAgent('\${a.id}')">删除</button>
          </div>
        </div>
      \`).join('');
    }

    async function pingAgent(agentId) {
      showToast('正在测试远程 DSH 连通性...');
      const res = await apiReq('/agents/' + agentId + '/ping', 'POST');
      if (res.ok && res.data?.ok) {
        showToast('✓ 远程节点响应成功! 端口:' + (res.data.port || 3080) + ' 提供商:' + (res.data.providers?.join(',') || '无'));
      } else {
        showToast('✗ 连接失败: ' + (res.data?.error || res.error || '无法访问'));
      }
    }

    async function deleteAgent(agentId) {
      if (!confirm('确定删除该远程 DSH 智能体吗？')) return;
      const res = await apiReq('/agents/' + agentId, 'DELETE');
      if (res.ok) {
        showToast('已删除节点');
        loadAgents();
      }
    }

    function openAgentModal(agent = null) {
      document.getElementById('agent-modal-overlay').classList.add('active');
      document.getElementById('agent-ping-result').textContent = '';
      if (agent) {
        document.getElementById('modal-agent-title').textContent = '修改远程 DSH 智能体';
        document.getElementById('agent-form-id').value = agent.id;
        document.getElementById('agent-form-id').disabled = true;
        document.getElementById('agent-form-name').value = agent.name;
        document.getElementById('agent-form-api').value = agent.apiBaseUrl;
        document.getElementById('agent-form-key').value = agent.apiKey || '';
        document.getElementById('agent-form-preset').value = agent.agentPreset || 'cordis';
        document.getElementById('agent-form-permission').value = agent.permission || 'danger-full-access';
        document.getElementById('agent-form-provider').value = agent.provider || '';
        document.getElementById('agent-form-model').value = agent.model || '';
        document.getElementById('agent-form-prompt').value = agent.systemPrompt || '';
      } else {
        document.getElementById('modal-agent-title').textContent = '添加远程 DSH 智能体';
        document.getElementById('agent-form-id').value = 'remote-dsh-' + Math.random().toString(36).substring(2, 7);
        document.getElementById('agent-form-id').disabled = false;
        document.getElementById('agent-form-name').value = '远程执行节点';
        document.getElementById('agent-form-api').value = 'http://127.0.0.1:3080/api/v1';
        document.getElementById('agent-form-key').value = '';
        document.getElementById('agent-form-preset').value = 'cordis';
        document.getElementById('agent-form-permission').value = 'danger-full-access';
        document.getElementById('agent-form-provider').value = '';
        document.getElementById('agent-form-model').value = '';
        document.getElementById('agent-form-prompt').value = '你是受主编排器指派的专业子任务执行智能体。';
      }
      // 打开弹窗即自动拉取该地址的可用模型（静默，命中缓存则直接应用）
      const modelsHint = document.getElementById('agent-models-result');
      modelsHint.style.color = 'var(--text-secondary)';
      modelsHint.textContent = '正在拉取可用模型...';
      loadFormModels(true);
    }

    function editAgent(agentId) {
      const a = gAgents.find(x => x.id === agentId);
      if (a) openAgentModal(a);
    }

    function closeAgentModal() {
      document.getElementById('agent-modal-overlay').classList.remove('active');
    }

    async function testFormConnection() {
      const url = document.getElementById('agent-form-api').value.trim();
      const key = document.getElementById('agent-form-key').value.trim();
      const el = document.getElementById('agent-ping-result');
      el.style.color = 'var(--text-secondary)';
      el.textContent = '正在发起探测...';
      const res = await apiReq('/ping-test', 'POST', { apiBaseUrl: url, apiKey: key });
      if (res.ok && res.data?.ok) {
        el.style.color = 'var(--success)';
        el.textContent = '✓ 连通成功: ' + (res.data.name || 'DSH Web API') + ' (v' + (res.data.version || '1.0') + ')';
        loadFormModels(true); // 连通成功后静默拉取可用模型
      } else {
        el.style.color = 'var(--error)';
        el.textContent = '✗ 无法连接: ' + (res.data?.error || res.error || '请求失败');
      }
    }

    // ---- 远程可用模型/预设拉取与选择 ----
    let gFormModels = null; // { url, key, at, models, defaultModel, presets, presetsOk }
    const MODELS_CACHE_TTL = 60000; // 缓存 60 秒，过期自动重新拉取

    async function loadFormModels(silent = false, force = false) {
      const url = document.getElementById('agent-form-api').value.trim();
      const key = document.getElementById('agent-form-key').value.trim();
      const el = document.getElementById('agent-models-result');
      if (!url) {
        el.style.color = 'var(--error)';
        el.textContent = '请先填写远程 API 访问地址';
        return;
      }
      // 缓存命中（未强制刷新且未超时）则直接应用
      const cacheFresh = gFormModels && gFormModels.url === url && gFormModels.key === key
        && gFormModels.models && (Date.now() - (gFormModels.at || 0) < MODELS_CACHE_TTL);
      if (!force && cacheFresh) {
        applyFormModels(gFormModels);
        return;
      }
      if (!silent) {
        el.style.color = 'var(--text-secondary)';
        el.textContent = '正在拉取可用模型/预设...';
      }
      const [res, presRes] = await Promise.all([
        apiReq('/models-test', 'POST', { apiBaseUrl: url, apiKey: key }),
        apiReq('/presets-test', 'POST', { apiBaseUrl: url, apiKey: key }),
      ]);
      if (res.ok && res.data?.ok) {
        gFormModels = {
          url,
          key,
          at: Date.now(),
          models: res.data.models || [],
          defaultModel: res.data.defaultModel,
          presets: (presRes.ok && presRes.data?.ok) ? (presRes.data.presets || []) : [],
          presetsOk: !!(presRes.ok && presRes.data?.ok),
        };
        applyFormModels(gFormModels);
      } else {
        el.style.color = 'var(--error)';
        el.textContent = '✗ 拉取模型失败: ' + (res.data?.error || res.error || '请求失败（远端可能未安装 dsh-web-service 或版本过旧）');
      }
    }

    // 将文本输入动态升级为可见的 <select> 下拉（保留元素 id，兼容既有读写逻辑）
    function setFieldOptions(inputId, containerId, options, selectedValue, emptyLabel) {
      const container = document.getElementById(containerId);
      if (!container) return;
      let el = document.getElementById(inputId);
      // 无可选项时保持文本输入（远端不支持拉取的降级场景）
      if (!options || !options.length) return;
      if (!el || el.tagName !== 'SELECT') {
        const sel = document.createElement('select');
        sel.id = inputId;
        sel.className = 'form-control';
        sel.oninput = function () { refreshModelOptions(); };
        sel.onchange = function () { refreshModelOptions(); };
        container.replaceChild(sel, el);
        el = sel;
      }
      const cur = (selectedValue !== undefined && selectedValue !== null) ? String(selectedValue) : (el.value || '');
      el.innerHTML = '';
      let hasCur = false;
      if (emptyLabel !== null && emptyLabel !== undefined) {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = emptyLabel;
        el.appendChild(o);
        if (cur === '') hasCur = true;
      }
      for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        el.appendChild(o);
        if (opt.value === cur) hasCur = true;
      }
      if (cur && !hasCur) {
        const o = document.createElement('option');
        o.value = cur;
        o.textContent = cur + '（自定义）';
        el.appendChild(o);
      }
      el.value = cur;
    }

    function applyFormModels(m) {
      const el = document.getElementById('agent-models-result');
      const provEl = document.getElementById('agent-form-provider');
      const providers = [];
      const seenProv = new Set();
      for (const x of m.models) {
        if (x.provider && !seenProv.has(x.provider)) { seenProv.add(x.provider); providers.push(x.provider); }
      }
      const dm = m.defaultModel;
      const provOptions = providers.map(function (p) {
        return { value: p, label: p + (dm && dm.provider === p ? '（节点默认）' : '') };
      });
      setFieldOptions('agent-form-provider', 'provider-field-container', provOptions, provEl.value, '（节点默认提供方）');
      refreshModelOptions();
      const dmText = (dm && dm.provider) ? '；节点默认模型: ' + dm.provider + ' / ' + (dm.model || 'default') : '';
      const curProv = document.getElementById('agent-form-provider').value.trim();
      const willFill = !curProv && dm && dm.provider;
      el.style.color = 'var(--success)';
      el.textContent = '✓ 拉取到 ' + m.models.length + ' 个可选模型（' + providers.length + ' 个提供方）' + dmText + describePresets(m.presets || [], m.presetsOk) + (willFill ? '（已自动填充默认模型）' : '');
      // 未指定模型时自动填充该节点默认模型，避免依赖猜测
      if (willFill) {
        document.getElementById('agent-form-provider').value = dm.provider;
        document.getElementById('agent-form-model').value = dm.model || '';
        refreshModelOptions();
      }
      applyFormPresets(m.presets || [], m.presetsOk, document.getElementById('agent-form-preset').value);
    }

    function describePresets(presets, presetsOk) {
      if (!presetsOk) return '；远端未提供预设列表 (需 dsh-web-service >= 0.0.2)，可手动填写';
      if (!presets.length) return '；远端无可用预设';
      const dflt = presets.find(function (p) { return p.isDefault; });
      let text = '；预设 ' + presets.length + ' 个' + (dflt ? '（默认 ' + dflt.id + '）' : '');
      const cur = document.getElementById('agent-form-preset').value.trim();
      if (cur && !presets.some(function (p) { return p.id === cur; })) {
        text += '，⚠ 当前填写 "' + cur + '" 不在节点可用列表';
      }
      return text;
    }

    function refreshModelOptions() {
      if (!gFormModels) return;
      const prov = document.getElementById('agent-form-provider').value.trim();
      const modelEl = document.getElementById('agent-form-model');
      if (!prov) {
        // 未选提供方 = 使用节点默认，模型框只保留默认项
        setFieldOptions('agent-form-model', 'model-field-container',
          [{ value: '', label: '（节点默认模型）' }], modelEl.value, null);
        return;
      }
      const entries = (gFormModels.models || []).filter(function (x) { return x.provider === prov; });
      const opts = entries.map(function (x) {
        const mid = x.id || x.name;
        return { value: mid, label: mid + (x.isDefault ? '（默认）' : '') };
      });
      setFieldOptions('agent-form-model', 'model-field-container', opts, modelEl.value, '（该提供方默认模型）');
    }

    function applyFormPresets(presets, presetsOk, selectedValue) {
      if (!presetsOk || !presets || !presets.length) return; // 拉取失败则保持文本输入
      const opts = presets.map(function (p) {
        return { value: p.id, label: p.id + (p.isDefault ? '（默认）' : '') };
      });
      setFieldOptions('agent-form-preset', 'preset-field-container', opts, selectedValue, null);
    }

    async function saveAgentForm() {
      const id = document.getElementById('agent-form-id').value.trim();
      const name = document.getElementById('agent-form-name').value.trim();
      const apiBaseUrl = document.getElementById('agent-form-api').value.trim();
      if (!id || !name || !apiBaseUrl) {
        alert('请填写完整必填字段 (ID, 名称, API 地址)');
        return;
      }
      const payload = {
        id,
        name,
        apiBaseUrl,
        apiKey: document.getElementById('agent-form-key').value.trim() || undefined,
        agentPreset: document.getElementById('agent-form-preset').value.trim() || 'cordis',
        permission: document.getElementById('agent-form-permission').value,
        provider: document.getElementById('agent-form-provider').value.trim() || undefined,
        model: document.getElementById('agent-form-model').value.trim() || undefined,
        systemPrompt: document.getElementById('agent-form-prompt').value.trim() || undefined,
      };

      const res = await apiReq('/agents', 'POST', payload);
      if (res.ok) {
        showToast('保存成功');
        closeAgentModal();
        loadAgents();
      } else {
        alert('保存失败: ' + res.error);
      }
    }

    // ---- Tasks Management & Hall ----
    async function loadTasks() {
      const res = await apiReq('/tasks');
      if (res.ok) {
        gTasks = res.data || [];
        renderTasks();
      }
    }

    function renderTasks() {
      const container = document.getElementById('tasks-list-container');
      if (gTasks.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:32px 0; text-align:center;">暂无编排任务，可点击上方「+ 新建主任务」发起分布式协同。</div>';
        return;
      }

      container.innerHTML = gTasks.map(t => {
        const completedCount = t.subtasks.filter(s => s.status === 'completed').length;
        const totalCount = t.subtasks.length;

        return \`
          <div class="card" id="task-card-\${t.id}">
            <div class="card-title">
              <div style="display:flex; align-items:center; gap:10px;">
                <span>\${escapeHtml(t.title)}</span>
                <span class="badge badge-\${t.status}">\${t.status}</span>
                <span style="font-size:12px; font-weight:normal; color:var(--text-muted);">\${new Date(t.createdAt).toLocaleTimeString()}</span>
              </div>
              <div style="display:flex; gap:8px;">
                <span style="font-size:13px; font-weight:600; color:var(--text-secondary);">子任务进度: \${completedCount} / \${totalCount}</span>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('\${t.id}')">删除任务</button>
              </div>
            </div>

            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">\${escapeHtml(t.objective)}</p>

            <!-- Subtasks Cards -->
            <div class="subtasks-grid">
              \${t.subtasks.map(st => {
                const agent = gAgents.find(a => a.id === st.remoteAgentId);
                const agentName = agent ? agent.name : st.remoteAgentId;
                const preview = st.result?.content || (st.error ? '错误: ' + st.error : st.prompt);

                return \`
                  <div class="subtask-card" onclick="openDrawer('\${t.id}', '\${st.id}')">
                    <div>
                      <div class="subtask-card-header">
                        <div class="subtask-title">\${escapeHtml(st.title)}</div>
                        <span class="badge badge-\${st.status}">\${st.status}</span>
                      </div>
                      <div class="subtask-agent-tag">🖥️ \${escapeHtml(agentName)}</div>
                      <div class="subtask-preview">\${escapeHtml(preview)}</div>
                    </div>
                    <div class="subtask-footer">
                      <span>\${st.logs.length} 条日志</span>
                      <span style="color:var(--primary);">查看日志与聊天 ➔</span>
                    </div>
                  </div>
                \`;
              }).join('')}
            </div>

            <!-- Summary Evaluation Box -->
            \${t.summary ? \`
              <div class="summary-box">
                <div class="summary-header">
                  <span>📊 主任务完成状态总结与质检报告</span>
                  <span class="badge badge-\${t.summary.status}">\${t.summary.status}</span>
                </div>
                <div style="font-size:13px; color:var(--text-secondary);">\${escapeHtml(t.summary.overview)}</div>
                <div class="summary-conclusion">\${escapeHtml(t.summary.finalConclusion)}</div>
              </div>
            \` : ''}
          </div>
        \`;
      }).join('');
    }

    async function deleteTask(taskId) {
      if (!confirm('确定删除此主任务记录？')) return;
      const res = await apiReq('/tasks/' + taskId, 'DELETE');
      if (res.ok) {
        showToast('已删除主任务');
        loadTasks();
      }
    }

    // ---- Drawer Details (Logs & Chat) ----
    function openDrawer(taskId, subtaskId) {
      gActiveTaskId = taskId;
      gActiveSubtaskId = subtaskId;
      document.getElementById('drawer-overlay').classList.add('active');
      document.getElementById('drawer').classList.add('active');
      refreshCurrentSubtask();
    }

    function closeDrawer() {
      document.getElementById('drawer-overlay').classList.remove('active');
      document.getElementById('drawer').classList.remove('active');
      gActiveTaskId = null;
      gActiveSubtaskId = null;
    }

    function switchDrawerTab(tab) {
      gDrawerTab = tab;
      document.getElementById('tab-btn-logs').classList.toggle('active', tab === 'logs');
      document.getElementById('tab-btn-chat').classList.toggle('active', tab === 'chat');
      document.getElementById('drawer-view-logs').style.display = tab === 'logs' ? 'block' : 'none';
      document.getElementById('drawer-view-chat').style.display = tab === 'chat' ? 'flex' : 'none';

      if (tab === 'chat') {
        loadSubtaskChat();
      }
    }

    async function refreshCurrentSubtask() {
      if (!gActiveTaskId || !gActiveSubtaskId) return;
      const res = await apiReq('/tasks/' + gActiveTaskId);
      if (!res.ok) return;
      const task = res.data;
      const subtask = task.subtasks.find(s => s.id === gActiveSubtaskId);
      if (!subtask) return;

      const agent = gAgents.find(a => a.id === subtask.remoteAgentId);

      document.getElementById('drawer-subtask-title').textContent = subtask.title;
      document.getElementById('drawer-subtask-meta').textContent =
        '状态: ' + subtask.status + ' | 执行节点: ' + (agent ? agent.name : subtask.remoteAgentId) +
        (subtask.remoteSessionId ? ' | 远程会话: ' + subtask.remoteSessionId : '');

      // Render Logs
      const logsContainer = document.getElementById('drawer-logs-content');
      if (!subtask.logs || subtask.logs.length === 0) {
        logsContainer.innerHTML = '<div style="color:var(--text-muted);">暂无日志</div>';
      } else {
        logsContainer.innerHTML = subtask.logs.map(log => \`
          <div class="log-item">
            <span class="log-time">\${new Date(log.timestamp).toLocaleTimeString()}</span>
            <span class="log-level log-level-\${log.level}">[\${log.level.toUpperCase()}]</span>
            <span class="log-msg">\${escapeHtml(log.message)}</span>
          </div>
        \`).join('');
      }

      if (gDrawerTab === 'chat') {
        loadSubtaskChat();
      }
    }

    async function loadSubtaskChat() {
      if (!gActiveTaskId || !gActiveSubtaskId) return;
      const msgBox = document.getElementById('drawer-chat-messages');
      msgBox.innerHTML = '<div style="color:var(--text-muted);">加载远程聊天记录...</div>';

      const res = await apiReq('/tasks/' + gActiveTaskId + '/subtasks/' + gActiveSubtaskId + '/chat');
      if (!res.ok) {
        msgBox.innerHTML = '<div style="color:var(--error);">获取聊天记录失败: ' + escapeHtml(res.error) + '</div>';
        return;
      }

      const messages = res.data?.messages || [];
      if (messages.length === 0) {
        msgBox.innerHTML = '<div style="color:var(--text-muted);">该会话暂无消息内容</div>';
        return;
      }

      msgBox.innerHTML = messages.map(m => {
        const isUser = m.role === 'user';
        const raw = m.content || '';
        // 上下文注入消息（AGENTS.md / 运行时上下文 / skills 等）不算用户指令
        const isInjection = isUser && /^(<system-reminder>|Current runtime context|The following workspace instructions)/.test(raw.trim());
        const kindLabel = isInjection ? '📦 上下文注入（系统自动附加）' : (isUser ? '👤 发送指令' : '🤖 远程智能体响应');
        let html = '';
        if (m.reasoning) {
          html += \`<div class="chat-reasoning"><strong style="color:var(--accent);">💭 深度思考过程:</strong><br>\${escapeHtml(m.reasoning)}</div>\`;
        }
        // 长消息默认折叠，避免上下文注入刷屏
        const CLAMP_LEN = 800;
        if (raw.length > CLAMP_LEN) {
          html += \`<div class="chat-clamp">\${escapeHtml(raw.slice(0, CLAMP_LEN))}<span style="color:var(--text-muted);"> …[内容过长已折叠，共 \${raw.length} 字符]</span></div>\`;
          html += \`<div class="chat-full" style="display:none;">\${escapeHtml(raw)}</div>\`;
          html += '<button class="btn btn-sm" style="margin-top:6px;" onclick="toggleChatCollapse(this)">⤢ 展开全文</button>';
        } else {
          html += \`<div>\${escapeHtml(raw)}</div>\`;
        }

        return \`
          <div class="chat-bubble \${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}" \${isInjection ? 'style="opacity:0.72;"' : ''}>
            <div style="font-size:10px; margin-bottom:4px; opacity:0.8;">\${kindLabel}</div>
            \${html}
          </div>
        \`;
      }).join('');

      msgBox.scrollTop = msgBox.scrollHeight;
    }

    function toggleChatCollapse(btn) {
      const bubble = btn.parentElement;
      const clamp = bubble.querySelector('.chat-clamp');
      const full = bubble.querySelector('.chat-full');
      if (!clamp || !full) return;
      const expanded = full.style.display !== 'none';
      full.style.display = expanded ? 'none' : 'block';
      clamp.style.display = expanded ? 'block' : 'none';
      btn.textContent = expanded ? '⤢ 展开全文' : '⌃ 收起';
    }

    async function sendFollowupMessage() {
      const input = document.getElementById('drawer-chat-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      showToast('正在向远程 DSH 会话发送追问...');

      const res = await apiReq(
        '/tasks/' + gActiveTaskId + '/subtasks/' + gActiveSubtaskId + '/followup',
        'POST',
        { message: text }
      );

      if (res.ok) {
        showToast('✓ 远程已回复');
        loadSubtaskChat();
        refreshCurrentSubtask();
      } else {
        alert('发送追问失败: ' + res.error);
      }
    }

    // ---- Dispatch Center ----
    function addSubtaskRow(title = '', prompt = '', agentId = '') {
      const c = document.getElementById('subtask-inputs-container');
      const id = 'st-row-' + Math.random().toString(36).substring(2, 7);
      const row = document.createElement('div');
      row.id = id;
      row.style.background = '#111827';
      row.style.padding = '10px';
      row.style.borderRadius = '8px';
      row.style.border = '1px solid var(--border-color)';

      const agentOptions = gAgents.map(a => \`<option value="\${a.id}" \${a.id === agentId ? 'selected' : ''}>\${escapeHtml(a.name)} (\${a.apiBaseUrl})</option>\`).join('');

      row.innerHTML = \`
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <input type="text" class="form-control st-title" placeholder="子任务名称" value="\${escapeHtml(title)}" style="width:50%;">
          <select class="form-control st-agent" style="width:40%;">\${agentOptions}</select>
          <button class="btn btn-sm btn-danger" onclick="document.getElementById('\${id}').remove()">✕</button>
        </div>
        <textarea class="form-control st-prompt" rows="2" placeholder="子任务具体提示词要求...">\${escapeHtml(prompt)}</textarea>
      \`;
      c.appendChild(row);
    }

    function clearDispatchForm() {
      document.getElementById('new-task-title').value = '';
      document.getElementById('new-task-objective').value = '';
      document.getElementById('subtask-inputs-container').innerHTML = '';
    }

    async function submitDispatch() {
      const title = document.getElementById('new-task-title').value.trim();
      const objective = document.getElementById('new-task-objective').value.trim();
      if (!objective) {
        alert('请至少填写主任务目标详情');
        return;
      }

      const rows = document.querySelectorAll('#subtask-inputs-container > div');
      const subtasks = [];
      rows.forEach(r => {
        const stTitle = r.querySelector('.st-title').value.trim();
        const stAgent = r.querySelector('.st-agent').value;
        const stPrompt = r.querySelector('.st-prompt').value.trim();
        if (stPrompt) {
          subtasks.push({
            title: stTitle || '自定义子任务',
            prompt: stPrompt,
            remoteAgentId: stAgent,
          });
        }
      });

      showToast('正在派发协同任务...');
      const res = await apiReq('/tasks', 'POST', {
        title: title || undefined,
        objective,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      });

      if (res.ok) {
        showToast('🚀 主任务派发成功，各子任务开始运行！');
        clearDispatchForm();
        switchTab('tasks');
      } else {
        alert('派发失败: ' + res.error);
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Auto-polling for running tasks
    setInterval(() => {
      const hasRunning = gTasks.some(t => t.status === 'running');
      if (hasRunning) {
        loadTasks();
        if (gActiveTaskId) refreshCurrentSubtask();
      }
    }, 3000);

    // Initial Load
    window.addEventListener('load', () => {
      loadAgents();
      loadTasks();
    });
  </script>
</body>
</html>`;
}
