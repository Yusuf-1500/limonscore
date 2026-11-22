export interface Team {
  id: string;
  name: string;
  short_name: string;
  country?: string;
  logo_url: string | null;
}

export interface League {
  id: string;
  name: string;
  country: string;
  flag?: string;
  logo_url: string | null;
}

export interface MatchItem {
  id: string;
  league_id: string;
  date_category?: string;
  kickoff_time: string;
  status: 'LIVE' | 'FT' | 'NS' | 'HT';
  minute: number | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  ht_home?: number | null;
  ht_away?: number | null;
  fixture_date?: string | null;
  venue_name?: string | null;
  referee_name?: string | null;
  home_team: Team;
  away_team: Team;
  league: League;
}

export interface MatchEventDetail {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: 'Goal' | 'Card' | 'subst' | 'Var' | string;
  detail: string;
}

export interface MatchStatRow {
  type: string;
  home: string | number | null;
  away: string | number | null;
}

export interface LineupPlayer {
  player: {
    id: number;
    name: string;
    number: number;
    pos: string;
    grid: string | null;
  };
}

export interface TeamLineup {
  team: { id: number; name: string; logo: string };
  formation: string;
  coach: { id: number | null; name: string | null };
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface PlayerMatchStat {
  player: { id: number; name: string; photo?: string };
  statistics: Array<{
    games: { minutes: number | null; number: number; position: string; rating: string | null };
    shots: { total: number | null; on: number | null };
    goals: { total: number | null; assists: number | null };
    passes: { total: number | null; accuracy: string | null };
    tackles: { total: number | null };
    duels: { total: number | null; won: number | null };
    cards: { yellow: number; red: number };
  }>;
}

export interface StandingRow {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  form: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export interface H2HMatch {
  fixture: { id: number; date: string; status: { short: string } };
  league: { name: string; logo: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export interface FixtureDetailsResponse {
  fixtureId: string;
  events: MatchEventDetail[];
  statistics: MatchStatRow[];
  lineups: TeamLineup[];
  players?: PlayerMatchStat[];
  standings: StandingRow[];
  h2h: H2HMatch[];
  cached?: boolean;
}