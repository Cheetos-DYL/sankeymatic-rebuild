import { ReactNode } from 'react'
import './Layout.css'

interface LayoutProps {
  sidebar: ReactNode
  main: ReactNode
}

export function Layout({ sidebar, main }: LayoutProps) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__scroll">
          {sidebar}
        </div>
      </aside>
      <main className="main-area">
        {main}
      </main>
    </div>
  )
}
