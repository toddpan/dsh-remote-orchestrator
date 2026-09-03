/**
 * @dsh-external/dsh-remote-orchestrator — Client UI 面板（conversation.view slot）。
 */
export const inject = ['slots']

export function apply(ctx: any): void {
  ctx.effect(
    () =>
      ctx.slots.inject('conversation.view', () =>
        ctx.slots.register({
          name: 'conversation.view',
          id: 'dsh-remote-orchestrator-view',
          label: () => '分布式编排协同',
          component: () => ({
            render() {
              const wrapper = document.createElement('div')
              wrapper.style.display = 'flex'
              wrapper.style.flexDirection = 'column'
              wrapper.style.height = '100%'
              wrapper.style.width = '100%'
              wrapper.style.background = '#0f172a'
              wrapper.style.color = '#f8fafc'
              wrapper.style.fontFamily = 'sans-serif'

              const header = document.createElement('div')
              header.style.padding = '12px 18px'
              header.style.display = 'flex'
              header.style.alignItems = 'center'
              header.style.justifyContent = 'space-between'
              header.style.borderBottom = '1px solid #334155'
              header.style.background = '#1e293b'

              const title = document.createElement('span')
              title.innerHTML = '<strong>⚡ DSH 远程多智能体协同编排器</strong>'
              title.style.fontSize = '14px'

              const openBtn = document.createElement('button')
              openBtn.textContent = '在新标签页打开全屏控制台 ↗'
              openBtn.style.background = '#0284c7'
              openBtn.style.color = '#fff'
              openBtn.style.border = 'none'
              openBtn.style.padding = '6px 12px'
              openBtn.style.borderRadius = '6px'
              openBtn.style.cursor = 'pointer'
              openBtn.style.fontSize = '12px'
              openBtn.onclick = () => {
                window.open('/dsh-orchestrator', '_blank')
              }

              header.appendChild(title)
              header.appendChild(openBtn)

              const iframe = document.createElement('iframe')
              iframe.src = '/dsh-orchestrator'
              iframe.style.flex = '1'
              iframe.style.border = 'none'
              iframe.style.width = '100%'
              iframe.style.height = '100%'

              wrapper.appendChild(header)
              wrapper.appendChild(iframe)
              return wrapper
            },
          }),
        })
      ),
    '@dsh-external/dsh-remote-orchestrator: client view'
  )
}
