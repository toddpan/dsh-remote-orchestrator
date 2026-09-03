/**
 * @dsh-external/dsh-remote-orchestrator — DSH Web GUI 集成。
 *
 * 将 /dsh-orchestrator 远程编排控制台嵌入 Web 页面：
 *  1. 侧栏入口行（plain DOM + MutationObserver 自愈，与 task-board / ssh 同一模式）；
 *  2. 中央列接管面板（html[data-dsh-orchestrator-active] 属性作用域显示规则），
 *     内嵌 iframe 加载编排控制台，带刷新 / 全屏 / 关闭操作；
 *  3. sidebar.footer.action 席位注册（设置旁的底部图标按钮，第二入口）。
 *
 * 中央列为单占有者：打开本面板时清除 task-board / ssh 的激活属性并广播
 * dsh-panel-activate，点击侧栏会话行时自动交还中央列。
 */

export const inject = ['slots']

import React from 'react'

type OrchContext = {
  slots: {
    inject(slot: string, factory: () => (() => void) | void): () => void
    register(config: Record<string, unknown>, component: unknown): () => void
  }
  locale?: { subscribe(listener: () => void): () => void }
  effect(fn: () => () => void, name: string): () => void
}

const PANEL_NAME = 'orchestrator'
const ACTIVE_ATTR = 'data-dsh-orchestrator-active'
const OTHER_ACTIVE_ATTRS = ['data-dsh-taskboard-active', 'data-dsh-ssh-active']
const ACTIVATE_EVENT = 'dsh-panel-activate'
const CONVERSATION_COLUMN_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]'
const ENTRY_SELECTOR = '[data-dsh-orchestrator-entry]'
const CONSOLE_PATH = '/dsh-orchestrator'

/** Family block: sibling plugin sidebar rows this entry orders against. */
const FAMILY_SELECTORS = [
  '[data-dsh-taskboard-entry]',
  '[data-dsh-ssh-entry]',
  '[data-dsh-orchestrator-entry]',
]

/** Inline orchestration glyph (three connected nodes), sized like shell sidebar icons. */
const ICON =
  '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="3.4" cy="3.4" r="1.7"/><circle cx="12.6" cy="3.4" r="1.7"/><circle cx="8" cy="12.6" r="1.7"/>' +
  '<path d="M5.1 3.4h5.8"/><path d="M4.3 4.9l2.9 6.2"/><path d="M11.7 4.9l-2.9 6.2"/></svg>'

/** Attribute-scoped stylesheet: center-column takeover + sidebar entry row. */
const CSS = `
[data-pane='conversation'], [class*='centerCol'] { position: relative; }
[data-dsh-orchestrator-view] {
  position: absolute; inset: 0; display: none; z-index: 60;
  flex-direction: column;
  background: #0f172a;
}
html[data-dsh-orchestrator-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-dsh-orchestrator-view] { display: flex; }
html[data-dsh-orchestrator-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-pane='conversation'] > :not([data-dsh-orchestrator-view]),
html[data-dsh-orchestrator-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [class*='centerCol'] > :not([data-dsh-orchestrator-view]) { display: none !important; }
.orc-panel-header {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; min-height: 40px; box-sizing: border-box;
  background: #1e293b; border-bottom: 1px solid #334155;
  color: #f8fafc; font-family: sans-serif; font-size: 13px;
  flex: none;
}
.orc-panel-title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.orc-panel-spacer { flex: 1; }
.orc-panel-btn {
  background: #0284c7; color: #fff; border: none; border-radius: 6px;
  padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap;
  font-family: inherit;
}
.orc-panel-btn.ghost { background: transparent; border: 1px solid #475569; color: #cbd5e1; }
.orc-panel-btn.close { background: transparent; border: 1px solid #64748b; color: #e2e8f0; padding: 5px 8px; }
.orc-panel-btn:hover { filter: brightness(1.15); }
.orc-panel-frame { flex: 1; width: 100%; border: none; background: #0f172a; }
[data-dsh-orchestrator-entry] {
  box-sizing: border-box; display: flex; align-items: center; gap: 10px;
  width: 100%; min-height: 36px; padding: 0 10px;
  background: transparent; border: none; border-radius: 8px;
  color: var(--dsw-alias-label-secondary, #94a3b8); cursor: pointer;
  font-size: 13px; white-space: nowrap; font-family: inherit; text-align: left;
}
[data-dsh-orchestrator-entry]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(148, 163, 184, 0.12));
  color: var(--dsw-alias-label-primary, #e2e8f0);
}
[data-dsh-orchestrator-entry][data-active] {
  background: var(--dsw-alias-interactive-bg-active, rgba(148, 163, 184, 0.2));
  color: var(--dsw-alias-label-primary, #e2e8f0); font-weight: 600;
}
.orc-entry-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: none; }
.orc-entry-icon svg { display: block; width: 18px; height: 18px; }
.orc-entry-label { overflow: hidden; text-overflow: ellipsis; }
[data-dsh-frame][data-sidebar-collapsed] [data-dsh-orchestrator-entry] {
  justify-content: center; padding: 0; width: 36px; min-height: 36px;
  margin: 0 auto 12px; border-radius: 50%;
}
[data-dsh-frame][data-sidebar-collapsed] .orc-entry-label { display: none; }
`

/** Inject the plugin stylesheet once; returns a disposer removing the tag. */
function injectStyles(): () => void {
  const existing = document.querySelector('style[data-plugin-css="dsh-remote-orchestrator/orchestrator.css"]')
  if (existing !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-remote-orchestrator'
  tag.dataset.pluginCss = 'dsh-remote-orchestrator/orchestrator.css'
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => {
    tag.remove()
  }
}

/** Minimal open/close state owner shared by every entry point. */
function createPanelController() {
  let open = false
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const listener of listeners) {
      try {
        listener()
      } catch {
        /* a throwing listener must not skip the others */
      }
    }
  }
  return {
    get isOpen(): boolean {
      return open
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    open(): void {
      if (open) return
      open = true
      emit()
    },
    close(): void {
      if (!open) return
      open = false
      emit()
    },
    toggle(): void {
      open = !open
      emit()
    },
  }
}

type PanelController = ReturnType<typeof createPanelController>

/** Find the sidebar shell root, or undefined while the shell is not mounted. */
function sidebarRoot(): HTMLElement | undefined {
  const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]')
  if (column === null) return undefined
  const logoOwner = column.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement
  return logoOwner ?? (column.firstElementChild as HTMLElement | undefined)
}

/** The New Session button: nested in the logo row on current shells. */
function newSessionButton(root: HTMLElement): HTMLButtonElement | undefined {
  const nested = root.querySelector<HTMLButtonElement>('button[class*="newSession"]')
  if (nested !== null) return nested
  for (const child of root.children) {
    if (child.tagName === 'BUTTON') return child as HTMLButtonElement
  }
  return undefined
}

/**
 * Mount the sidebar entry row (plain DOM, self-healing across shell re-renders).
 * @returns disposer removing the row and its observers.
 */
function mountSidebarEntry(controller: PanelController, locale?: OrchContext['locale']): () => void {
  if (document.querySelector(ENTRY_SELECTOR) !== null) return () => {}
  const entry = document.createElement('button')
  entry.type = 'button'
  entry.setAttribute('data-dsh-orchestrator-entry', '')
  entry.setAttribute('data-dsh-plugin', 'dsh-remote-orchestrator')
  entry.setAttribute('data-dsh-part', 'sidebar-entry')
  const iconSpan = document.createElement('span')
  iconSpan.className = 'orc-entry-icon'
  iconSpan.innerHTML = ICON
  const labelSpan = document.createElement('span')
  labelSpan.className = 'orc-entry-label'
  entry.append(iconSpan, labelSpan)
  const applyLabel = (): void => {
    labelSpan.textContent = '编排中心'
    entry.setAttribute('aria-label', '远程多智能体编排控制台')
    entry.setAttribute('title', '远程多智能体编排控制台')
  }
  applyLabel()
  entry.addEventListener('click', () => {
    controller.toggle()
  })

  let root: HTMLElement | undefined
  let placed = false
  const placeEntry = (): boolean => {
    const current = root
    if (current === undefined) return false
    const button = newSessionButton(current)
    if (button === undefined) return false
    if (entry.parentElement !== current) {
      const row = button.closest('[class*="logoRow"]')
      const base = row !== null && row.parentElement === current ? row : button
      const family = Array.from(current.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.matches(FAMILY_SELECTORS.join(', ')),
      )
      const anchor =
        family.length > 0 ? family[family.length - 1]!.nextElementSibling : base.nextElementSibling
      current.insertBefore(entry, anchor)
    }
    return true
  }
  const tryPlace = (): void => {
    if (root !== undefined && !root.isConnected) {
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    if (placed) {
      if (document.body.contains(entry)) return
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    root ??= sidebarRoot()
    if (root === undefined) return
    placed = placeEntry()
    if (placed) rootObserver.observe(root, { childList: true, subtree: true })
  }
  const waitObserver = new MutationObserver(() => {
    tryPlace()
  })
  waitObserver.observe(document.body, { childList: true, subtree: true })
  const rootObserver = new MutationObserver(() => {
    if (root === undefined || !root.isConnected) {
      placed = false
      tryPlace()
      return
    }
    if (!root.contains(entry)) placed = placeEntry()
  })
  const unsubscribeActive = controller.subscribe(() => {
    if (controller.isOpen) entry.dataset.active = 'true'
    else delete entry.dataset.active
  })
  let unsubscribeLocale: (() => void) | undefined
  if (locale !== undefined) {
    try {
      unsubscribeLocale = locale.subscribe(applyLabel)
    } catch {
      /* locale absent: keep the mount-time copy */
    }
  }
  tryPlace()
  return () => {
    waitObserver.disconnect()
    rootObserver.disconnect()
    unsubscribeActive()
    unsubscribeLocale?.()
    entry.remove()
  }
}

/** Build the takeover panel: header bar (title / refresh / fullscreen / close) + console iframe. */
function buildPanel(controller: PanelController): HTMLElement {
  const container = document.createElement('div')
  container.dataset.dshOrchestratorView = ''
  container.dataset.dshPlugin = 'dsh-remote-orchestrator'

  const header = document.createElement('div')
  header.className = 'orc-panel-header'
  const title = document.createElement('span')
  title.className = 'orc-panel-title'
  title.textContent = '⚡ DSH 远程多智能体编排中心'
  const spacer = document.createElement('span')
  spacer.className = 'orc-panel-spacer'
  const refreshBtn = document.createElement('button')
  refreshBtn.className = 'orc-panel-btn ghost'
  refreshBtn.textContent = '刷新'
  const openBtn = document.createElement('button')
  openBtn.className = 'orc-panel-btn'
  openBtn.textContent = '新标签页全屏 ↗'
  const closeBtn = document.createElement('button')
  closeBtn.className = 'orc-panel-btn close'
  closeBtn.textContent = '✕'
  const iframe = document.createElement('iframe')
  iframe.className = 'orc-panel-frame'
  iframe.src = CONSOLE_PATH
  iframe.title = 'DSH 远程多智能体编排控制台'
  refreshBtn.addEventListener('click', () => {
    iframe.src = CONSOLE_PATH
  })
  openBtn.addEventListener('click', () => {
    window.open(CONSOLE_PATH, '_blank')
  })
  closeBtn.addEventListener('click', () => {
    controller.close()
  })
  header.append(title, spacer, refreshBtn, openBtn, closeBtn)
  container.append(header, iframe)
  return container
}

/**
 * Mount the takeover panel into the center column; visibility rides the
 * html[data-dsh-orchestrator-active] attribute set from controller state.
 * @returns disposer unmounting the panel and restoring the column.
 */
function mountPanel(controller: PanelController): () => void {
  let container: HTMLDivElement | undefined
  const ensure = (): void => {
    if (container !== undefined) {
      if (container.isConnected) return
      container.remove()
      container = undefined
    }
    const column = document.querySelector<HTMLElement>(CONVERSATION_COLUMN_SELECTOR)
    if (column === null) return
    container = buildPanel(controller) as HTMLDivElement
    column.appendChild(container)
  }
  const waitObserver = new MutationObserver(() => {
    ensure()
  })
  waitObserver.observe(document.body, { childList: true, subtree: true })

  const applyActive = (): void => {
    if (controller.isOpen) {
      for (const attr of OTHER_ACTIVE_ATTRS) document.documentElement.removeAttribute(attr)
      document.documentElement.setAttribute(ACTIVE_ATTR, '')
      document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }))
    } else {
      document.documentElement.removeAttribute(ACTIVE_ATTR)
    }
  }
  const onOtherActivate = (event: Event): void => {
    const detail = (event as CustomEvent).detail
    if ((detail === 'taskboard' || detail === 'ssh') && controller.isOpen) controller.close()
  }
  const SIDEBAR_ROW_SELECTOR =
    '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]'
  const onClickSidebarRow = (event: MouseEvent): void => {
    if (!controller.isOpen) return
    const target = event.target as HTMLElement | null
    if (target === null) return
    if (target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.close()
  }
  document.addEventListener('click', onClickSidebarRow, true)
  document.addEventListener(ACTIVATE_EVENT, onOtherActivate)
  const unsubscribe = controller.subscribe(applyActive)
  applyActive()
  ensure()

  return () => {
    document.removeEventListener('click', onClickSidebarRow, true)
    document.removeEventListener(ACTIVATE_EVENT, onOtherActivate)
    waitObserver.disconnect()
    unsubscribe()
    document.documentElement.removeAttribute(ACTIVE_ATTR)
    container?.remove()
    container = undefined
  }
}

/** Footer-seat entry component (beside Settings): icon button opening the panel. */
function FooterOrchestratorEntry(props: { wide?: boolean; t?: (key: string, fallback: string) => string }) {
  const wide = props.wide ?? true
  const label = props.t !== undefined ? props.t('orchestrator.entry', '编排中心') : '编排中心'
  return React.createElement(
    'button',
    {
      type: 'button',
      title: '远程多智能体编排控制台',
      'aria-label': label,
      onClick: () => window.dispatchEvent(new CustomEvent('dsh-orchestrator-open')),
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: wide ? 'flex-start' : 'center',
        gap: '8px',
        width: '100%',
        minHeight: '32px',
        padding: wide ? '0 10px' : '0',
        background: 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: 'var(--dsw-alias-label-secondary, #94a3b8)',
        cursor: 'pointer',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      },
    },
    React.createElement('span', {
      style: { display: 'inline-flex', width: '16px', height: '16px', flex: 'none' },
      dangerouslySetInnerHTML: { __html: ICON },
    }),
    wide ? React.createElement('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, label) : null,
  )
}

export function apply(ctx: OrchContext): void {
  const disposeStyles = injectStyles()
  ctx.effect(() => disposeStyles, 'dsh-remote-orchestrator: styles')

  const controller = createPanelController()
  const disposers = [
    mountSidebarEntry(controller, ctx.locale),
    mountPanel(controller),
  ]
  ctx.effect(
    () => () => {
      for (const dispose of disposers.splice(0)) dispose()
    },
    'dsh-remote-orchestrator: sidebar entry + center panel',
  )

  // Footer-seat second entry beside Settings (slot API, shell-rendered).
  ctx.effect(
    () =>
      ctx.slots.inject('sidebar.footer.action', () => {
        // NOTE: `{ name: ... }` 必须与 register( 同行内联——注入器骨架校验
        // 用 register\(\{ 前缀正则匹配 slot 名，换行会导致重启恢复被跳过。
        const unregister = ctx.slots.register({ name: 'sidebar.footer.action', id: 'dsh-remote-orchestrator', order: 120 }, FooterOrchestratorEntry)
        return () => {
          unregister()
        }
      }),
    'dsh-remote-orchestrator: footer entry',
  )

  // Bridge footer-seat clicks (inside React-managed subtrees) to the controller.
  const onOpenRequest = (): void => {
    controller.open()
  }
  window.addEventListener('dsh-orchestrator-open', onOpenRequest)
  ctx.effect(
    () => () => {
      window.removeEventListener('dsh-orchestrator-open', onOpenRequest)
    },
    'dsh-remote-orchestrator: open-request bridge',
  )
}
