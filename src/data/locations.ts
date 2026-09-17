// locations.ts — the 8 Core Set Locations. `slots` is the total number of token
// slots; `startCivilians` / `startThugs` are the pre-printed tokens placed at setup.

import type { LocationDef, LocationId } from '../types';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'starklabs',
    name: 'Stark Labs',
    slots: 4,
    startCivilians: 1,
    startThugs: 2,
    endOfTurn: {
      key: 'swap_storyline',
      name: 'End of Turn',
      text: 'You may swap 1 card from your hand with 1 of your cards in the Storyline.',
    },
  },
  {
    id: 'avengersmansion',
    name: 'Avengers Mansion',
    slots: 3,
    startCivilians: 1,
    startThugs: 0,
    endOfTurn: {
      key: 'draw_to_3',
      name: 'End of Turn',
      text: 'You may draw cards until you have 3 in your hand.',
    },
  },
  {
    id: 'nypd',
    name: 'New York Police Headquarters',
    slots: 4,
    startCivilians: 2,
    startThugs: 1,
    endOfTurn: {
      key: 'discard_thug_anywhere',
      name: 'End of Turn',
      text: 'You may discard 1 {thug} from any Location.',
    },
  },
  {
    id: 'timessquare',
    name: 'Times Square',
    slots: 5,
    startCivilians: 2,
    startThugs: 1,
    endOfTurn: {
      key: 'rescue_here',
      name: 'End of Turn',
      text: 'You may Rescue 1 {civilian} from this Location.',
    },
  },
  {
    id: 'avengerstower',
    name: 'Avengers Tower',
    slots: 3,
    startCivilians: 1,
    startThugs: 0,
    endOfTurn: {
      key: 'tutor_top',
      name: 'End of Turn',
      text: 'You may search your deck for 1 card and set it aside. Then, shuffle your deck and place that card on top.',
    },
  },
  {
    id: 'helicarrier',
    name: 'S.H.I.E.L.D. Helicarrier',
    slots: 4,
    startCivilians: 1,
    startThugs: 2,
    endOfTurn: {
      key: 'move_anywhere',
      name: 'End of Turn',
      text: 'You may move to any other Location.',
    },
  },
  {
    id: 'centralpark',
    name: 'Central Park',
    slots: 5,
    startCivilians: 2,
    startThugs: 2,
    endOfTurn: {
      key: 'relocate_tokens',
      name: 'End of Turn',
      text: 'You may move up to 2 {civilian} or {thug}, in any combination, from this Location to any other Location(s).',
    },
  },
  {
    id: 'shieldhq',
    name: 'S.H.I.E.L.D. Headquarters',
    slots: 4,
    startCivilians: 1,
    startThugs: 1,
    endOfTurn: {
      key: 'discard_for_crisis',
      name: 'End of Turn',
      text: 'You may discard 1 card from your hand to the bottom of your deck to remove 1 Crisis token from anywhere.',
    },
  },
];

export const LOCATION_BY_ID: Record<LocationId, LocationDef> = Object.fromEntries(
  LOCATIONS.map(l => [l.id, l])
) as Record<LocationId, LocationDef>;
