import { useState } from 'react';

export interface SidePanelTab {
  id: string;
  label: string;
  /** Número opcional junto a la pestaña (p. ej. escenarios que cumplen). */
  counter?: string;
  content: React.ReactNode;
}

interface SidePanelProps {
  tabs: SidePanelTab[];
}

/** Panel lateral con pestañas: las herramientas para probar el backend. */
export const SidePanel = ({ tabs }: SidePanelProps) => {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <aside className="side-panel">
      <div className="tabs" role="tablist" aria-label="Herramientas de prueba">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === active?.id}
            aria-controls={`panel-${tab.id}`}
            className={tab.id === active?.id ? 'tab tab--active' : 'tab'}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
            {tab.counter && <span className="tab__counter">{tab.counter}</span>}
          </button>
        ))}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`panel-${active.id}`}
          aria-labelledby={`tab-${active.id}`}
          className="side-panel__content"
        >
          {active.content}
        </div>
      )}
    </aside>
  );
};
