/** Satellite naturale principale di un pianeta. */
export interface MoonData {
  name: string;
  /** Raggio orbitale in px (scala simulazione). */
  orbitRadius: number;
  /** Dimensione del disco in px. */
  size: number;
  /** Periodo orbitale in "secondi di simulazione" a velocità 1x. */
  period: number;
  color: string;
}

/** Dati fisici estesi per il pannello informativo. */
export interface PlanetFacts {
  atmosphere: string;
  temperature: string;
  moonsCount: number;
  dayLength: string;
  missions: string[];
  /** Fatti curiosi per la modalità esplorazione. */
  trivia: string[];
  /** Confronto con oggetti familiari (es. "Giove contiene 1.300 Terre"). */
  comparison: string;
}

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
  /** Inclinazione assiale in gradi (per rotazione e anelli realistici). */
  axialTilt: number;
  /** Periodo di rotazione in ore (negativo = rotazione retrograda). */
  rotationHours: number;
  /** Eccentricità orbitale reale (per orbite kepleriane). */
  eccentricity: number;
  /** Anomalia media all'epoca J2000 (gradi), per posizioni datate. */
  meanLongitudeJ2000: number;
  /** Satelliti naturali principali. */
  moons: MoonData[];
  facts: PlanetFacts;
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
    axialTilt: 0.03,
    rotationHours: 1407.6,
    eccentricity: 0.2056,
    meanLongitudeJ2000: 252.25,
    moons: [],
    facts: {
      atmosphere: 'Quasi assente ( esosfera di Na, H, He)',
      temperature: '-173 °C / +427 °C',
      moonsCount: 0,
      dayLength: '58,6 giorni terrestri',
      missions: ['Mariner 10', 'MESSENGER', 'BepiColombo'],
      trivia: [
        'Un anno su Mercurio dura 88 giorni ma un giorno solare ne dura 176.',
        'Il polo nord contiene ghiaccio nonostante le temperature estreme.',
      ],
      comparison: 'La sua superficie ha dimensioni simili a quelle dell’Asia.',
    },
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
    axialTilt: 177.4,
    rotationHours: -5832.5,
    eccentricity: 0.0068,
    meanLongitudeJ2000: 181.98,
    moons: [],
    facts: {
      atmosphere: '96,5% CO₂, 3,5% N₂ (pressione 92 atm)',
      temperature: '~465 °C media al suolo',
      moonsCount: 0,
      dayLength: '243 giorni terrestri (retrograda)',
      missions: ['Venera 7', 'Magellan', 'Akatsuki'],
      trivia: [
        'Ruota in senso opposto alla maggior parte dei pianeti.',
        'Un giorno venusiano è più lungo di un anno venusiano.',
      ],
      comparison: 'È quasi gemello della Terra per dimensioni (95% del diametro).',
    },
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
    axialTilt: 23.44,
    rotationHours: 23.93,
    eccentricity: 0.0167,
    meanLongitudeJ2000: 100.46,
    moons: [{ name: 'Luna', orbitRadius: 16, size: 5, period: 2.4, color: '#cfcfcf' }],
    facts: {
      atmosphere: '78% N₂, 21% O₂, 0,9% Ar',
      temperature: '15 °C media superficiale',
      moonsCount: 1,
      dayLength: '23h 56m (siderale)',
      missions: ['ISS', 'Sentinel-2', 'James Webb (L2)'],
      trivia: [
        'È l’unico pianeta non nominato da una divinità.',
        'La Luna si allontana di ~3,8 cm ogni anno.',
      ],
      comparison:
        'Sulla Terra potresti far "entrare" tutti gli altri pianeti nell’Oceano Pacifico.',
    },
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
    axialTilt: 25.19,
    rotationHours: 24.62,
    eccentricity: 0.0934,
    meanLongitudeJ2000: 355.45,
    moons: [
      { name: 'Phobos', orbitRadius: 11, size: 3, period: 1.4, color: '#9c8b7a' },
      { name: 'Deimos', orbitRadius: 16, size: 2, period: 2.6, color: '#b3a292' },
    ],
    facts: {
      atmosphere: '95% CO₂, pressione 0,006 atm',
      temperature: '-63 °C media',
      moonsCount: 2,
      dayLength: '24h 37m',
      missions: ['Perseverance', 'Curiosity', 'InSight'],
      trivia: [
        'Ospita Olympus Mons, il vulcano più alto del sistema solare (21 km).',
        'Le sue tempeste di polvere possono avvolgere l’intero pianeta.',
      ],
      comparison: 'Marte è grande circa metà della Terra.',
    },
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
    axialTilt: 3.13,
    rotationHours: 9.93,
    eccentricity: 0.0489,
    meanLongitudeJ2000: 34.4,
    moons: [
      { name: 'Io', orbitRadius: 22, size: 4, period: 1.8, color: '#e8d15a' },
      { name: 'Europa', orbitRadius: 27, size: 4, period: 2.6, color: '#d9cbb2' },
      { name: 'Ganimede', orbitRadius: 33, size: 5, period: 3.9, color: '#a89a86' },
      { name: 'Callisto', orbitRadius: 39, size: 5, period: 6.2, color: '#7f7466' },
    ],
    facts: {
      atmosphere: '90% H₂, 10% He',
      temperature: '-110 °C (sommità nuvole)',
      moonsCount: 95,
      dayLength: '9h 56m',
      missions: ['Galileo', 'Juno', 'Europa Clipper'],
      trivia: [
        'La Grande Macchia Rossa è una tempesta più ampia della Terra.',
        'Giove possiede il campo magnetico più forte tra i pianeti.',
      ],
      comparison: 'Dentro Giove potrebbero stare ~1.300 Terre.',
    },
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
    axialTilt: 26.73,
    rotationHours: 10.66,
    eccentricity: 0.0565,
    meanLongitudeJ2000: 49.94,
    moons: [
      { name: 'Titano', orbitRadius: 30, size: 5, period: 4.5, color: '#e0a95a' },
      { name: 'Encelado', orbitRadius: 24, size: 3, period: 2.2, color: '#eef3f6' },
    ],
    facts: {
      atmosphere: '96% H₂, 3% He',
      temperature: '-140 °C (livello 1 bar)',
      moonsCount: 146,
      dayLength: '10h 40m',
      missions: ['Cassini-Huygens', 'Dragonfly (in viaggio)'],
      trivia: [
        'Gli anelli sono fatti per il 99,9% di ghiaccio dacqua.',
        'Su Titano piove metano liquido.',
      ],
      comparison: 'Saturno è meno denso dell’acqua: galleggerebbe in una vasca gigante.',
    },
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
    axialTilt: 97.77,
    rotationHours: -17.24,
    eccentricity: 0.0457,
    meanLongitudeJ2000: 313.23,
    moons: [{ name: 'Titania', orbitRadius: 18, size: 3, period: 3.2, color: '#c9cdd4' }],
    facts: {
      atmosphere: '83% H₂, 15% He, 2,3% CH₄',
      temperature: '-195 °C (record -224 °C)',
      moonsCount: 28,
      dayLength: '17h 14m (retrograda)',
      missions: ['Voyager 2 (1986)'],
      trivia: [
        'Il suo asse è inclinato di 98°: "rotola" lungo lorbita.',
        'Fu il primo pianeta scoperto con un telescopio (1781).',
      ],
      comparison: 'Urano è grande ~4 volte la Terra.',
    },
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
    axialTilt: 28.32,
    rotationHours: 16.11,
    eccentricity: 0.0113,
    meanLongitudeJ2000: 304.88,
    moons: [{ name: 'Tritone', orbitRadius: 18, size: 4, period: 3.4, color: '#cfd6e4' }],
    facts: {
      atmosphere: '80% H₂, 19% He, tracce CH₄',
      temperature: '-200 °C (sommità nuvole)',
      moonsCount: 16,
      dayLength: '16h 6m',
      missions: ['Voyager 2 (1989)'],
      trivia: [
        'I venti superano i 2.000 km/h: i più veloci del sistema solare.',
        'Tritone orbita in senso retrogrado, forse un KBO catturato.',
      ],
      comparison:
        'Nettuno è grande ~4 volte la Terra ma con il 17% della massa terrestre... in peso specifico.',
    },
  },
];
