import { Icon } from './Icons';

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide help" onClick={e => e.stopPropagation()}>
        <h3>How to play — S.H.I.E.L.D. solo mode</h3>
        <ul>
          <li>
            <b>Goal.</b> Complete 2 of the 3 Missions (Defeat 9 Thugs, Rescue 9 Civilians, Clear 4 Threats), then remove all the Villain's Health.
            The Villain wins if their Master Plan deck runs out, their Villainous Plot succeeds, you start a turn with no cards in deck and hand, or a Hero is KO'd.
          </li>
          <li>
            <b>Your turn.</b> You draw 1 card automatically. Click a card in your hand to play it — that card's Hero becomes the active Hero. You get the
            symbols of the card <i>and</i> of the previous Hero card in the Storyline (not its special effect).
          </li>
          <li>
            <Icon g="move" size={16} /> <b>Move</b>: click the arrow on an adjacent Location. <Icon g="attack" size={16} /> <b>Attack</b>: click a Thug, a Henchman
            Threat, or the Villain (once 2 Missions are done). <Icon g="heroic" size={16} /> <b>Heroic</b>: click a Civilian to rescue it or a Threat card to
            place a token (3 clear it). <Icon g="wild" size={16} /> <b>Wild</b> counts as any of the three. Expiring symbols are spent before saved tokens.
          </li>
          <li>
            <b>Special effect.</b> The ✦ button on the action bar, usable once, before or after any other action.
          </li>
          <li>
            <b>End turn.</b> If your Location has no Threat card you may use its End of Turn effect. After every 3 Hero cards (2 once the Villain is Under
            Pressure) the Villain plays a Master Plan card: move ↻ clockwise, BAM!, add Thugs/Civilians around the Villain, special effect.
          </li>
          <li>
            <b>Damage</b> makes you discard a card from hand to the bottom of the deck, per Hero hit. Discarding your last card (or ending a turn with an
            empty hand) KOs the Hero — in solo that is a loss, unless you chose the forgiving KO rule.
          </li>
          <li>
            <b>Undo</b> takes back the last action (any prompt decisions included).
          </li>
        </ul>
        <div className="modal-options">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
