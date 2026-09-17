import { useEffect, useState } from 'react';
import { HEROES, VILLAINS } from '../data';
import type { Challenge, HeroId, VillainId } from '../types';
import { startGame } from '../engine/game';
import { A, img } from './assets';
import { clearSnapshots, run } from './store';

const CHALLENGES: { id: Challenge; label: string; hint: string }[] = [
  { id: 'none', label: 'Standard', hint: 'Full Hero decks.' },
  { id: 'moderate', label: 'Moderate', hint: 'Each Hero loses their single-Wild card.' },
  { id: 'hard', label: 'Hard', hint: 'Each Hero loses their double-Wild card.' },
  { id: 'heroic', label: 'Heroic', hint: 'Each Hero loses both Wild cards.' },
];

function fromUrl() {
  const p = new URLSearchParams(location.search);
  const villain = (p.get('villain') as VillainId | null) ?? 'redskull';
  const heroes = (p.get('heroes')?.split(',') ?? []).filter(h => HEROES.some(x => x.id === h)) as HeroId[];
  return { villain, heroes, seed: p.get('seed') ?? '', challenge: (p.get('challenge') as Challenge | null) ?? 'none', auto: p.has('auto') };
}

export function SetupScreen() {
  const init = fromUrl();
  const [villain, setVillain] = useState<VillainId>(VILLAINS.some(v => v.id === init.villain) ? init.villain : 'redskull');
  const [heroes, setHeroes] = useState<HeroId[]>(init.heroes.slice(0, 3));
  const [challenge, setChallenge] = useState<Challenge>(init.challenge);
  const [koLimit, setKoLimit] = useState(0);
  const [seed, setSeed] = useState(init.seed);

  const toggleHero = (id: HeroId) => {
    setHeroes(h => (h.includes(id) ? h.filter(x => x !== id) : h.length < 3 ? [...h, id] : h));
  };
  const randomTeam = () => {
    const pool = HEROES.map(h => h.id);
    const pick: HeroId[] = [];
    while (pick.length < 3) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      if (!pick.includes(id)) pick.push(id);
    }
    setHeroes(pick);
  };
  const start = () => {
    if (heroes.length !== 3) return;
    clearSnapshots();
    void run(() => startGame({ villain, heroes, challenge, seed: seed.trim() || undefined, koLimit }), { snap: false });
  };
  // ?villain=…&heroes=a,b,c&auto=1 skips the setup screen (handy for testing)
  useEffect(() => {
    if (init.auto && init.heroes.length === 3) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="setup">
      <h1>
        Marvel United <span className="sub">S.H.I.E.L.D. solo mode</span>
      </h1>
      <p className="lead">
        You are S.H.I.E.L.D., coordinating three Heroes with one shared deck and hand. Complete two of the
        three Missions, then take the Villain down before their Master Plan runs out.
      </p>

      <h2>Villain</h2>
      <div className="pick-row">
        {VILLAINS.map(v => (
          <button
            key={v.id}
            className={`pick villain-pick ${villain === v.id ? 'on' : ''}`}
            style={{ ['--villain' as string]: v.color }}
            onClick={() => setVillain(v.id)}
          >
            {img(A.dashboardBack(v.id)) ? (
              <img className="banner-img" src={img(A.dashboardBack(v.id))!} alt="" />
            ) : (
              img(A.figure(v.id)) && <img className="figure" src={img(A.figure(v.id))!} alt="" />
            )}
            <div className="pick-name">{v.name}</div>
            <div className="pick-hint">Health 8 · {v.track ? 'Fear Track' : v.plotText ? 'Villainous Plot' : 'Special Rules'}</div>
          </button>
        ))}
      </div>

      <h2>
        Heroes <span className="hint">(choose 3)</span>{' '}
        <button className="link" onClick={randomTeam}>
          random team
        </button>
      </h2>
      <div className="pick-row heroes">
        {HEROES.map(h => (
          <button
            key={h.id}
            className={`pick hero-pick ${heroes.includes(h.id) ? 'on' : ''}`}
            style={{ ['--hero' as string]: h.color }}
            onClick={() => toggleHero(h.id)}
          >
            {img(A.figure(h.id)) && <img className="figure" src={img(A.figure(h.id))!} alt="" />}
            <div className="pick-name">{h.name}</div>
            <div className="pick-hint">{h.cards.filter(c => c.special).map(c => c.special!.name).filter((n, i, a) => a.indexOf(n) === i).join(' · ')}</div>
          </button>
        ))}
      </div>

      <h2>Options</h2>
      <div className="options">
        <label>
          Challenge
          <select value={challenge} onChange={e => setChallenge(e.target.value as Challenge)}>
            {CHALLENGES.map(c => (
              <option key={c.id} value={c.id}>
                {c.label} — {c.hint}
              </option>
            ))}
          </select>
        </label>
        <label>
          KO rule
          <select value={koLimit} onChange={e => setKoLimit(Number(e.target.value))}>
            <option value={0}>Official: a KO is an immediate loss</option>
            <option value={1}>Forgiving: lose on the second KO (designers' suggestion for tough Villains)</option>
          </select>
        </label>
        <label>
          Seed <input value={seed} onChange={e => setSeed(e.target.value)} placeholder="random" />
        </label>
      </div>

      <button className="start" disabled={heroes.length !== 3} onClick={start}>
        Assemble!
      </button>
    </div>
  );
}
