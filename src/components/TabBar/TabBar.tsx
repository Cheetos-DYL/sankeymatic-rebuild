import './TabBar.css'

export type DiagramTab = 'sankey' | 'gantt'

interface TabBarProps {
  activeTab: DiagramTab
  onTabChange: (tab: DiagramTab) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      <button
        type="button"
        className={`tab-bar__tab ${activeTab === 'sankey' ? 'tab-bar__tab--active' : ''}`}
        onClick={() => onTabChange('sankey')}
      >
        <span className="tab-bar__icon">📊</span>
        <span className="tab-bar__label">Sankey</span>
      </button>
      <button
        type="button"
        className={`tab-bar__tab ${activeTab === 'gantt' ? 'tab-bar__tab--active' : ''}`}
        onClick={() => onTabChange('gantt')}
      >
        <span className="tab-bar__icon">📅</span>
        <span className="tab-bar__label">Gantt</span>
      </button>
    </div>
  )
}
