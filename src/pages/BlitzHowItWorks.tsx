import { useNavigate } from 'react-router-dom';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

const PLACEMENT_PTS = [
  { place: '1st', pts: 50, color: colors.gold },
  { place: '2nd', pts: 35, color: colors.silver },
  { place: '3rd', pts: 22, color: colors.bronze },
  { place: '4th', pts: 12, color: colors.textSecondary },
  { place: '5th', pts: 5, color: colors.textSecondary },
];

const BETTING_PTS = [
  { place: '1st', pts: 8 },
  { place: '2nd', pts: 5 },
  { place: '3rd', pts: 3 },
  { place: '4th', pts: 1 },
  { place: '5th+', pts: 0 },
];

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: spacing.xxl }}>
      <h2 style={{
        fontFamily: fonts.sans, fontSize: typeScale.title.fontSize, fontWeight: 700,
        color: colors.primary, margin: 0, marginBottom: spacing.md,
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Text({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary,
      margin: 0, marginBottom: spacing.md, lineHeight: 1.6,
    }}>
      {children}
    </p>
  );
}

export default function BlitzHowItWorks() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: `${spacing.xl}px ${spacing.lg}px` }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: colors.text, fontSize: 20, cursor: 'pointer', padding: spacing.xs }}
          >
            ←
          </button>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0,
          }}>
            How it Works
          </h1>
        </div>

        {/* Blitz Format */}
        <Section title="The Blitz Format">
          <Text>
            A Blitz is a round-robin padel tournament. All players face each other across multiple rounds.
            After each round, the schedule rotates automatically.
          </Text>
          <Text>
            At the end, players are ranked by matches won. A draw counts as half a win for both teams.
            If two players have the same number of match wins, the one with more total games won breaks the tie.
            If both are equal, they share the same placement and earn the same ranking points.
          </Text>
        </Section>

        {/* Scoring */}
        <Section title="Ranking Points">
          <Text>
            After each tournament, players earn ranking points based on their final placement
            (determined by matches won, then games as tiebreaker).
            Your overall ranking uses your best 4 results from the last 6 tournaments.
          </Text>
          <div style={{
            background: colors.surface, borderRadius: radius.lg,
            border: `1px solid ${colors.border}`, overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.muted, textTransform: 'uppercase' }}>Place</span>
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', textAlign: 'right' }}>Points</span>
            </div>
            {PLACEMENT_PTS.map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom: i < PLACEMENT_PTS.length - 1 ? `1px solid ${colors.border}` : 'none',
              }}>
                <span style={{ fontFamily: fonts.sans, fontSize: 15, fontWeight: 600, color: row.color }}>
                  {row.place}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: 15, fontWeight: 700, color: colors.text, textAlign: 'right' }}>
                  {row.pts}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Betting */}
        <Section title="Betting Bonus">
          <Text>
            When you're resting (not playing a round), you can predict the winner. If you bet and your prediction
            is correct, you earn profit. At the end, the best bettors earn bonus ranking points.
          </Text>
          <Text>
            Only players who actually placed bets are eligible for the bonus. If nobody bets, no bonus is awarded.
          </Text>
          <div style={{
            background: colors.surface, borderRadius: radius.lg,
            border: `1px solid ${colors.border}`, overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.muted, textTransform: 'uppercase' }}>Bet Rank</span>
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', textAlign: 'right' }}>Bonus</span>
            </div>
            {BETTING_PTS.map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom: i < BETTING_PTS.length - 1 ? `1px solid ${colors.border}` : 'none',
              }}>
                <span style={{ fontFamily: fonts.sans, fontSize: 15, fontWeight: 600, color: colors.textSecondary }}>
                  {row.place}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: 15, fontWeight: 700, color: colors.primary, textAlign: 'right' }}>
                  +{row.pts}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Best of */}
        <Section title="Best 4 of 6">
          <Text>
            Your ranking score is the sum of your 4 best tournament results out of the last 6 you played.
            This rewards consistency — one bad tournament doesn't ruin your ranking.
          </Text>
        </Section>



        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
