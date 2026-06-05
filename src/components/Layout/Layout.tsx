import { ReactNode } from 'react'
import './Layout.css'

interface LayoutProps {
  tabBar?: ReactNode
  sidebar: ReactNode
  main: ReactNode
}

export function Layout({ tabBar, sidebar, main }: LayoutProps) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        {tabBar && (
          <div className="sidebar__tabs">
            {tabBar}
          </div>
        )}
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
