import { useState } from 'react';
import { VILLAIN_BY_ID } from '../data';
import { Board } from './Board';
import { HandBar } from './HandBar';
import { Modals } from './Modals';
import { HeroStrip, Log, MissionPanel, Preview, Storyline, VillainPanel } from './Panels';
import { SetupScreen } from './SetupScreen';
import { useGame } from './store';
import { Help } from './Help';

export function App() {
  const G = useGame();
  const [help, setHelp] = useState(false);
  if (!G) return <SetupScreen />;
  const V = VILLAIN_BY_ID[G.villain];
  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">
          Marvel United <span className="sub">solo</span>
        </div>
        <div className="status">
          Turn {G.turnNo} · vs {V.name} · seed {G.options.seed}
          {G.options.challenge !== 'none' && ` · ${G.options.challenge} challenge`}
        </div>
        <div className="topbtns">
          <button className="btn ghost" onClick={() => setHelp(true)}>
            How to play
          </button>
          <button className="btn ghost" onClick={() => location.assign(location.pathname)}>
            New game
          </button>
        </div>
      </header>
      <main className="table">
        <section className="left">
          <VillainPanel G={G} />
          <MissionPanel G={G} />
          <HeroStrip G={G} />
        </section>
        <section className="center">
          <Board G={G} />
          <Storyline G={G} />
        </section>
        <aside className="right">
          <Log G={G} />
        </aside>
      </main>
      <HandBar G={G} />
      <Modals G={G} />
      <Preview />
      {help && <Help onClose={() => setHelp(false)} />}
      {G.gameOver && (
        <div className="modal-backdrop">
          <div className={`modal gameover ${G.gameOver.win ? 'win' : 'lose'}`}>
            <h2>{G.gameOver.title}</h2>
            <p>{G.gameOver.sub}</p>
            <p className="small">
              {G.turnNo} Hero turns · Missions: {G.missions.done.length}/3 · {V.name} health {Math.max(0, G.villainHealth)}
            </p>
            <div className="modal-options">
              <button className="btn" onClick={() => location.assign(location.pathname)}>
                New game
              </button>
              <button className="btn ghost" onClick={() => location.assign(`${location.pathname}?villain=${G.villain}&heroes=${G.heroes.map(h => h.id).join(',')}&seed=${G.options.seed}&challenge=${G.options.challenge}`)}>
                Replay this seed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
