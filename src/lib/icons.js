// Set di icone SVG selezionabili per le categorie.
// Ogni icona è monocromatica (usa currentColor) così può essere tinta
// con il colore della categoria. `s` = path con stroke, `f` = path con fill.
// `color` è il colore di default suggerito quando si sceglie l'icona.

export const ICON_SET = [
  { key: 'cart',     label: 'Carrello',   color: '#4ade80', v: '0 0 24 24', s: ['M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 01-8 0'] },
  { key: 'bolt',     label: 'Energia',    color: '#818cf8', v: '0 0 24 24', f: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'] },
  { key: 'home',     label: 'Casa',       color: '#a3e635', v: '0 0 24 24', s: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'] },
  { key: 'car',      label: 'Auto',       color: '#fb923c', v: '0 0 24 24', s: ['M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-3'], f: ['M7 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z'] },
  { key: 'plane',    label: 'Viaggi',     color: '#e879f9', v: '0 0 24 24', f: ['M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z'] },
  { key: 'heart',    label: 'Salute',     color: '#f472b6', v: '0 0 24 24', f: ['M12 21.7C5.8 17.4 2 13 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.3.8 4.5 2.1C13.2 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 4.5-3.8 8.9-10 13.2z'] },
  { key: 'cross',    label: 'Medicina',   color: '#fb7185', v: '0 0 24 24', s: ['M12 5v14M5 12h14'] },
  { key: 'gamepad',  label: 'Svago',      color: '#c084fc', v: '0 0 24 24', s: ['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', 'M12 12v4m0-9v1'] },
  { key: 'fork',     label: 'Ristorante', color: '#fdba74', v: '0 0 24 24', s: ['M18 8h1a4 4 0 010 8h-1', 'M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z', 'M6 1v3m4-3v3m4-3v3'] },
  { key: 'gift',     label: 'Regali',     color: '#34d399', v: '0 0 24 24', s: ['M20 12v10H4V12', 'M22 7H2v5h20V7z', 'M12 22V7', 'M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z'] },
  { key: 'shirt',    label: 'Vestiario',  color: '#22d3ee', v: '0 0 24 24', s: ['M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z'] },
  { key: 'paw',      label: 'Animali',    color: '#fbbf24', v: '0 0 24 24', f: ['M11 4.5C11 5.88 9.88 7 8.5 7S6 5.88 6 4.5 7.12 2 8.5 2 11 3.12 11 4.5zm7 0C18 5.88 16.88 7 15.5 7S13 5.88 13 4.5 14.12 2 15.5 2 18 3.12 18 4.5zM6 11c0 1.38-1.12 2.5-2.5 2.5S1 12.38 1 11s1.12-2.5 2.5-2.5S6 9.62 6 11zm17 0c0 1.38-1.12 2.5-2.5 2.5S18 12.38 18 11s1.12-2.5 2.5-2.5S23 9.62 23 11z', 'M12 14c-4 0-7 2.5-7 5.5V21h14v-1.5c0-3-3-5.5-7-5.5z'] },
  { key: 'briefcase',label: 'Lavoro',     color: '#4ade80', v: '0 0 24 24', s: ['M21 8V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2v-1', 'M13 12h8m-3-3l3 3-3 3'] },
  { key: 'trend',    label: 'Interessi',  color: '#60a5fa', v: '0 0 24 24', s: ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'] },
  { key: 'star',     label: 'Bonus',      color: '#facc15', v: '0 0 24 24', f: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'] },
  { key: 'piggy',    label: 'Risparmi',   color: '#34d399', v: '0 0 24 24', f: ['M17 8C8 10 5.9 16.17 3.82 19.34A1 1 0 004.65 21C8 20 12.46 19 17 18v3l4-4-4-4v3c-3 .5-6 1-8.5 1.5C10 12 13.5 9 17 8z'] },
  { key: 'debt',     label: 'Debiti',     color: '#f87171', v: '0 0 24 24', s: ['M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'] },
  { key: 'user',     label: 'Personale',  color: '#94a3b8', v: '0 0 24 24', s: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'] },
  { key: 'box',      label: 'Altro',      color: '#94a3b8', v: '0 0 24 24', s: ['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z'] },
  { key: 'coffee',   label: 'Caffè',      color: '#d6a06a', v: '0 0 24 24', s: ['M18 8h1a4 4 0 010 8h-1', 'M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z', 'M6 1v3M10 1v3M14 1v3'] },
  { key: 'phone',    label: 'Telefono',   color: '#38bdf8', v: '0 0 24 24', s: ['M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z', 'M11 18h2'] },
  { key: 'book',     label: 'Istruzione', color: '#a78bfa', v: '0 0 24 24', s: ['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'] },
  { key: 'dumbbell', label: 'Sport',      color: '#fb7185', v: '0 0 24 24', s: ['M6.5 6.5l11 11', 'M21 21l-1-1M3 3l1 1', 'M18 22l4-4M2 6l4-4', 'M3 7l4 4M17 13l4 4', 'M14 3l7 7'] },
  { key: 'tools',    label: 'Manutenz.',  color: '#94a3b8', v: '0 0 24 24', s: ['M14.7 6.3a4 4 0 00-5.66 5.66l-6.34 6.34a1 1 0 000 1.41l1.59 1.59a1 1 0 001.41 0l6.34-6.34a4 4 0 005.66-5.66l-2.83 2.83-2.12-2.12 2.83-2.83z'] },
  { key: 'baby',     label: 'Bambini',    color: '#fca5a5', v: '0 0 24 24', s: ['M9 12a1 1 0 012 0M13 12a1 1 0 012 0M9 16c1 1 5 1 6 0'], f: ['M12 2a5 5 0 00-5 5v3a5 5 0 0010 0V7a5 5 0 00-5-5z'] },
  { key: 'leaf',     label: 'Natura',     color: '#84cc16', v: '0 0 24 24', s: ['M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z', 'M2 21c0-3 1.85-5.36 5.08-6'] },
  { key: 'wine',     label: 'Bevande',    color: '#f472b6', v: '0 0 24 24', s: ['M8 22h8M12 15v7', 'M7 2h10l-1 7a4 4 0 01-8 0L7 2z'] },
  { key: 'music',    label: 'Musica',     color: '#c084fc', v: '0 0 24 24', s: ['M9 18V5l12-2v13'], f: ['M6 21a3 3 0 100-6 3 3 0 000 6zM18 19a3 3 0 100-6 3 3 0 000 6z'] },
  { key: 'ticket',   label: 'Eventi',     color: '#fdba74', v: '0 0 24 24', s: ['M3 7a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7z', 'M13 5v14'] },
  { key: 'wallet',   label: 'Portafogli', color: '#4ade80', v: '0 0 24 24', s: ['M21 12V7H5a2 2 0 010-4h14v4', 'M3 5v14a2 2 0 002 2h16v-5', 'M18 12a2 2 0 000 4h4v-4h-4z'] },
]

export const ICON_MAP = Object.fromEntries(ICON_SET.map(i => [i.key, i]))
