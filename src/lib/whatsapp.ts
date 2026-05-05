import { formatEuros } from './euros';

interface Match {
  id?: string;
  teamA: string[];
  teamB: string[];
  deadline: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  credits: number;
  matchesWon: number;
  matchesLost?: number;
}

interface AuctionResult {
  lotTitle: string;
  winnerName: string;
  finalBid: number;
  pledgedBy: string;
}

/**
 * Calculate how many days until a deadline
 */
function daysUntilDeadline(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine nudge stage based on days until deadline
 */
function determineStage(
  deadline: string
): 'reminder' | 'warning' | 'final' | null {
  const daysLeft = daysUntilDeadline(deadline);

  if (daysLeft < 1) return 'final';
  if (daysLeft < 3) return 'final';
  if (daysLeft < 7) return 'warning';
  if (daysLeft >= 7) return 'reminder';

  return null;
}

/**
 * Format team names for display
 */
function formatTeam(players: string[]): string {
  if (players.length === 1) return players[0];
  return players.join(' & ');
}

/**
 * Format date in Italian format (e.g., "15 Aprile")
 */
function formatDateItalian(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Generate nudge text for a single match
 */
export function generateNudge(
  stage: 'reminder' | 'warning' | 'final',
  match: Match,
  bookingUrl?: string
): string {
  const teamAName = formatTeam(match.teamA);
  const teamBName = formatTeam(match.teamB);
  const dateFormatted = formatDateItalian(match.deadline);
  const daysLeft = daysUntilDeadline(match.deadline);

  let header = '';
  let message = '';
  let penalty = '';
  let cta = '';

  if (stage === 'reminder') {
    header = '🎾 Padel time!';
    message = `📋 Match: ${teamAName} vs ${teamBName}\n⏰ Deadline: ${dateFormatted}`;
    cta = '👉 Prenotate il campo';
    if (bookingUrl) {
      cta += `: ${bookingUrl}`;
    }
    cta += '\nChi prenota? Fatevi vivi!';
  } else if (stage === 'warning') {
    header = '⚠️ Il tempo stringe!';
    message = `📋 Match: ${teamAName} vs ${teamBName}\n⏰ Scade tra ${daysLeft} ${daysLeft === 1 ? 'giorno' : 'giorni'}`;
    penalty = '💀 Penalità: -€0.50 a testa se non giocate';
    cta = '👉 Prenotate ORA';
    if (bookingUrl) {
      cta += `: ${bookingUrl}`;
    }
  } else if (stage === 'final') {
    header = '🚨 ULTIMA CHIAMATA 🚨';
    message = `📋 Match: ${teamAName} vs ${teamBName}\n⏰ Scade DOMANI`;
    penalty = '💀 -€0.50 a testa tra 24 ore';
    cta = 'Non fate i fantasmi. Prenotate';
    if (bookingUrl) {
      cta += `: ${bookingUrl}`;
    }
  }

  const parts = [header, message];
  if (penalty) parts.push(penalty);
  parts.push(cta);

  return parts.join('\n');
}

/**
 * Generate nudge for ALL overdue matches in a round
 */
export function generateRoundNudge(
  stage: 'reminder' | 'warning' | 'final',
  matches: Array<Match>,
  bookingUrl?: string
): string {
  if (matches.length === 0) {
    return 'Nessuna partita in sospeso. Bene! 🎉';
  }

  const stageEmoji = stage === 'reminder' ? '🎾' : stage === 'warning' ? '⚠️' : '🚨';
  const stageText =
    stage === 'reminder'
      ? 'reminder'
      : stage === 'warning'
        ? 'ATTENZIONE'
        : 'ULTIMA CHIAMATA';

  const header = `${stageEmoji} ${stageText} - ${matches.length} partita${matches.length > 1 ? 'e' : ''} in sospeso\n`;

  const nudges = matches
    .map((match) => generateNudge(stage, match, bookingUrl))
    .join('\n\n---\n\n');

  return header + nudges;
}

/**
 * Generate shareable tournament results text
 */
export function generateResultsSummary(
  tournamentName: string,
  leaderboard: LeaderboardEntry[],
  topN: number = 10
): string {
  const displayLeaderboard = leaderboard.slice(0, topN);

  const medals = ['🥇', '🥈', '🥉'];
  const header = `🏆 ${tournamentName.toUpperCase()} — Classifica Finale\n\n`;

  const entries = displayLeaderboard
    .map((entry, idx) => {
      const medal = idx < 3 ? medals[idx] : `${idx + 1}.`;
      const winLoss = entry.matchesLost
        ? `${entry.matchesWon}W-${entry.matchesLost}L`
        : `${entry.matchesWon}W`;
      return `${medal} ${entry.name} — ${formatEuros(entry.credits, false)} (${winLoss})`;
    })
    .join('\n');

  const footer = '\n\n🎾 Grazie a tutti! Alla prossima!';

  return header + entries + footer;
}

/**
 * Generate auction results summary
 */
export function generateAuctionSummary(
  results: AuctionResult[]
): string {
  if (results.length === 0) {
    return '🔨 Nessun lotto venduto.';
  }

  const header = '🔨 ASTA FINALE — Risultati\n\n';

  const entries = results
    .map(
      (result) =>
        `${result.lotTitle} — vinta da ${result.winnerName} (${formatEuros(result.finalBid, false)}) [offerta da ${result.pledgedBy}]`
    )
    .join('\n');

  const footer = '\n\nConsegna: Sabato al club';

  return header + entries + footer;
}
