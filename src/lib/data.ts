export interface Pin {
  id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  street_name: string | null;
  word_date: string;
}

export interface DailyWord {
  word_en: string;
  word_es: string;
  active_date: string;
}

export const SAMPLE_WORD: DailyWord = {
  word_en: "DOOR",
  word_es: "puerta",
  active_date: "2025-02-03",
};

export const BARCELONA_CENTER: [number, number] = [41.3874, 2.1686];

export const SAMPLE_PIN_LOCATIONS: Array<{
  coords: [number, number];
  street_name: string;
}> = [
  { coords: [41.4036, 2.1574], street_name: "Carrer de Verdi" },
  { coords: [41.3851, 2.1834], street_name: "Passeig del Born" },
  { coords: [41.3807, 2.1897], street_name: "Carrer de la Mare de Déu" },
  { coords: [41.3922, 2.1640], street_name: "Avinguda Diagonal" },
  { coords: [41.3797, 2.1682], street_name: "La Rambla" },
  { coords: [41.4030, 2.2044], street_name: "Carrer del Consell de Cent" },
  { coords: [41.4036, 2.1744], street_name: "Passeig de Gràcia" },
  { coords: [41.3639, 2.1577], street_name: "Carrer d'Aragó" },
  { coords: [41.3780, 2.1620], street_name: "Via Laietana" },
  { coords: [41.3720, 2.1640], street_name: "Carrer de Balmes" },
  { coords: [41.3800, 2.1740], street_name: "La Rambla" },
  { coords: [41.3950, 2.1550], street_name: "Diagonal" },
  { coords: [41.3880, 2.1870], street_name: "Ciutadella" },
  { coords: [41.4180, 2.1650], street_name: "Horta" },
  { coords: [41.3850, 2.1300], street_name: "Les Corts" },
];

export const SAMPLE_DOOR_IMAGES = [
  "https://plus.unsplash.com/premium_photo-1667223580483-9b02f86d1367?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1693478076486-450057fa1392?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1741621065314-1429b973e39b?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1623851692869-28acd596066d?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1643835298350-7555e9e18c83?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1522750234083-e96ce0ff1d5d?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1598997864016-d699a766b0be?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1693478078217-f5da543304aa?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1695057111572-9af573c9a178?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1717435641716-cabb5a87903d?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1767976768943-8cf305ef6585?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1601654137618-50901313584b?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1627893436302-498c69c877c3?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1577996447407-ddb382333b52?w=400&h=400&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1699899477258-8ae38250d67a?w=400&h=400&fit=crop&auto=format",
];

export function getSamplePins(): Pin[] {
  return SAMPLE_PIN_LOCATIONS.map((loc, i) => ({
    id: `sample-${i}`,
    image_url: SAMPLE_DOOR_IMAGES[i % SAMPLE_DOOR_IMAGES.length],
    latitude: loc.coords[0],
    longitude: loc.coords[1],
    street_name: loc.street_name,
    word_date: SAMPLE_WORD.active_date,
  }));
}
