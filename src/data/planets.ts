export interface PlanetData {
  name: string;
  nameIt: string;
  symbol: string;
  diameter: number; // km
  distanceFromSun: number; // mln km
  orbitalPeriod: number; // giorni
  color: string;
  gradient: string;
  size: number;
  orbitRadius: number;
  description: string;
  animationDuration: number;
}

export const planets: PlanetData[] = [
  {
    name: 'Mercury',
    nameIt: 'Mercurio',
    symbol: '☿',
    diameter: 4879,
    distanceFromSun: 57.9,
    orbitalPeriod: 88,
    color: '#b5b5b5',
    gradient: 'radial-gradient(circle at 32% 30%, #e0e0e0, #b5b5b5 45%, #6f6f72 100%)',
    size: 10,
    orbitRadius: 62,
    description: 'Il pianeta più piccolo e più vicino al Sole.',
    animationDuration: 4,
  },
  {
    name: 'Venus',
    nameIt: 'Venere',
    symbol: '♀',
    diameter: 12104,
    distanceFromSun: 108.2,
    orbitalPeriod: 225,
    color: '#e8cda0',
    gradient: 'radial-gradient(circle at 32% 30%, #f7e6c0, #e8cda0 45%, #a9834d 100%)',
    size: 14,
    orbitRadius: 94,
    description: 'Il pianeta più caldo del sistema solare.',
    animationDuration: 7,
  },
  {
    name: 'Earth',
    nameIt: 'Terra',
    symbol: '♁',
    diameter: 12756,
    distanceFromSun: 149.6,
    orbitalPeriod: 365,
    color: '#4fa4e8',
    gradient: 'radial-gradient(circle at 32% 30%, #9fd4ff, #4fa4e8 45%, #1b5e9c 100%)',
    size: 15,
    orbitRadius: 130,
    description: "Il nostro pianeta, l'unico con vita conosciuta.",
    animationDuration: 10,
  },
  {
    name: 'Mars',
    nameIt: 'Marte',
    symbol: '♂',
    diameter: 6792,
    distanceFromSun: 227.9,
    orbitalPeriod: 687,
    color: '#e07040',
    gradient: 'radial-gradient(circle at 32% 30%, #ffb08c, #e07040 45%, #8f3816 100%)',
    size: 12,
    orbitRadius: 166,
    description: 'Il pianeta rosso, obiettivo di esplorazione umana.',
    animationDuration: 15,
  },
  {
    name: 'Jupiter',
    nameIt: 'Giove',
    symbol: '♃',
    diameter: 142984,
    distanceFromSun: 778.6,
    orbitalPeriod: 4333,
    color: '#c8a060',
    gradient:
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0 3px, transparent 3px 7px), radial-gradient(circle at 32% 30%, #eccfa0, #c8a060 45%, #7d5a2e 100%)',
    size: 30,
    orbitRadius: 216,
    description: 'Il pianeta più grande del sistema solare.',
    animationDuration: 25,
  },
  {
    name: 'Saturn',
    nameIt: 'Saturno',
    symbol: '♄',
    diameter: 120536,
    distanceFromSun: 1433.5,
    orbitalPeriod: 10759,
    color: '#e8d088',
    gradient: 'radial-gradient(circle at 32% 30%, #f7e7bb, #e8d088 45%, #9c7f45 100%)',
    size: 26,
    orbitRadius: 276,
    description: 'Famoso per i suoi magnifici anelli.',
    animationDuration: 35,
  },
  {
    name: 'Uranus',
    nameIt: 'Urano',
    symbol: '♅',
    diameter: 51118,
    distanceFromSun: 2872.5,
    orbitalPeriod: 30687,
    color: '#7de8e8',
    gradient: 'radial-gradient(circle at 32% 30%, #ccfbfb, #7de8e8 45%, #2f8f96 100%)',
    size: 20,
    orbitRadius: 334,
    description: 'Un gigante di ghiaccio che ruota su un fianco.',
    animationDuration: 50,
  },
  {
    name: 'Neptune',
    nameIt: 'Nettuno',
    symbol: '♆',
    diameter: 49528,
    distanceFromSun: 4495.1,
    orbitalPeriod: 60190,
    color: '#4060e0',
    gradient: 'radial-gradient(circle at 32% 30%, #93aaff, #4060e0 45%, #1d2f8c 100%)',
    size: 19,
    orbitRadius: 388,
    description: 'Il pianeta più lontano dal Sole.',
    animationDuration: 70,
  },
];
