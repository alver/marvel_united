export { HEROES, HERO_BY_ID, HERO_CARD_BY_ID } from './heroes';
export { VILLAINS, VILLAIN_BY_ID, PLAN_BY_ID, THREAT_BY_ID } from './villains';
export { LOCATIONS, LOCATION_BY_ID } from './locations';

export const MISSION_SIZE = { thugs: 9, civilians: 9, threats: 4 } as const;
export const MISSION_NAME = {
  thugs: 'Defeat Thugs',
  civilians: 'Rescue Civilians',
  threats: 'Clear Threats',
} as const;
export const SOLO_HAND = 5;
export const SOLO_HEROES = 3;
