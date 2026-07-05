import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { BETTING_ENABLED } from '@/lib/feature-flags';

// D3v5 example points at N=8 players — the reference tournament size.
// The full formula (1st = 50 + (N-8)*5) means winning at 5 players is 35,
// at 12 players is 70. See the scaling table in the section below.
const PLACEMENT_PTS = [
  { place: '1st', pts: 50, color: colors.gold },
  { place: '2nd', pts: 32, color: colors.silver },
  { place: '3rd', pts: 20, color: colors.bronze },
  { place: '4th', pts: 13, color: colors.textSecondary },
  { place: '5th', pts: 8,  color: colors.textSecondary },
  { place: '6th', pts: 5,  color: colors.textSecondary },
  { place: '7th', pts: 3,  color: colors.textSecondary },
  { place: '8th', pts: 2,  color: colors.textSecondary },
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

// Single line in the worked-example card. `highlight` makes the value
// pop in primary green so the eye lands on the result, not the inputs.
function ExampleRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: `${spacing.xs}px 0`,
    }}>
      <span style={{ fontSize: 14, color: colors.textSecondary }}>{label}</span>
      <span style={{
        fontFamily: fonts.mono, fontSize: 14, fontWeight: 800,
        color: highlight ? colors.primary : colors.text,
      }}>
        {value}
      </span>
    </div>
  );
}

// Collapsible FAQ row. Closed by default — keeps the page scannable.
// Tap the question to expand the answer.
function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: `1px solid ${colors.border}`,
      padding: `${spacing.md}px 0`,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 0, cursor: 'pointer', textAlign: 'left',
          color: colors.text, fontSize: 15, fontWeight: 600,
          fontFamily: fonts.sans,
        }}
      >
        <span style={{ flex: 1, paddingRight: spacing.md }}>{q}</span>
        <span style={{
          color: colors.muted, fontSize: 18, lineHeight: 1, fontWeight: 400,
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
          flexShrink: 0,
        }}>+</span>
      </button>
      {open && (
        <p style={{
          fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary,
          margin: 0, marginTop: spacing.sm, lineHeight: 1.6,
        }}>
          {children}
        </p>
      )}
    </div>
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
            Each round, two players form Team A, two form Team B, and any extra players sit out and rest.
            Partners and opponents rotate so you don't keep playing with or against the same people.
            The resting role rotates fairly: over the course of a tournament, every player rests a similar number of rounds.
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
            (matches won, then games as tiebreaker). Points scale with tournament size —
            winning a bigger field is worth more. Everyone down to last place gets at least 2 points.
            Your overall ranking uses a day-based decay curve (see below).
          </Text>
          <Text>
            The table below shows the points at N=8 players (our reference size). At other sizes
            every position scales up or down: winning at 5 players = 35 points, at 8 = 50, at 12 = 70.
            Each extra player is worth +5 points to the winner.
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

        {/* Betting — gated behind BETTING_ENABLED. */}
        {BETTING_ENABLED && (
        <Section title="Betting Bonus">
          <Text>
            When you're resting (not playing a round), you can predict which team will win.
            If your prediction is correct, you receive 2× your stake (your stake back, plus an equal profit).
            If the match is a draw, your stake is refunded. If you lose, the stake is gone.
          </Text>
          <Text>
            At the end of the tournament, the players with the highest betting profit earn bonus ranking points
            on top of their placement points.
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
        )}

        {/* Crown */}
        <Section title="The Crown">
          <Text>
            The crown belongs to the player who currently holds the most consecutive tournament wins.
            It changes hands when someone else takes 1st place in a tournament.
            It's a status marker — no extra ranking points attached.
          </Text>
        </Section>

        {/* Decay model */}
        <Section title="Decay over time">
          <Text>
            Your ranking score is the weighted sum of every tournament you've played. A win
            keeps its full value for 21 days, then fades gradually. After 90 days it drops out
            entirely.
          </Text>
          <div style={{
            background: colors.surface, borderRadius: radius.lg,
            border: `1px solid ${colors.border}`, overflow: 'hidden',
            marginBottom: spacing.md,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.muted, textTransform: 'uppercase' }}>Age</span>
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', textAlign: 'right' }}>Weight</span>
            </div>
            {[
              { age: '0–21 days', weight: '100%', color: colors.primary, muted: false },
              { age: '30 days',   weight: '87%',  color: colors.text,    muted: false },
              { age: '45 days',   weight: '65%',  color: colors.text,    muted: false },
              { age: '60 days',   weight: '43%',  color: colors.text,    muted: false },
              { age: '75 days',   weight: '22%',  color: colors.text,    muted: false },
              { age: '90+ days',  weight: 'drops out', color: colors.muted, muted: true },
            ].map((row, i, arr) => (
              <div key={row.age} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom: i < arr.length - 1 ? `1px solid ${colors.border}` : 'none',
              }}>
                <span style={{ fontFamily: fonts.sans, fontSize: 15, fontWeight: 600, color: row.muted ? colors.muted : colors.text }}>{row.age}</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 15, fontWeight: 700, color: row.color, textAlign: 'right' }}>{row.weight}</span>
              </div>
            ))}
          </div>
          <Text>
            Example: a 1st place at 8 players is worth 50 points. In the first three weeks it stays
            at 50. At 30 days it counts as 44 (50 × 0.87). At 60 days it's down to 22. At 90 days it
            drops out entirely.
          </Text>
        </Section>

        {/* Rivalry */}
        <Section title="Rivalry">
          <Text>
            On the standings page, tap a player to see their head-to-head record against the player
            ranked just above them — wins, losses, and current streak.
          </Text>
          <Text>
            A "win" means you finished above your rival in a tournament you both played.
            Ties (shared placement) don't count either way.
          </Text>
        </Section>

        {/* Worked example */}
        <Section title="A worked example">
          <Text>
            8 players, 7 rounds. Two of you sit out each round, so every player
            ends up playing 5 matches and resting 2.
          </Text>
          <div style={{
            background: colors.surface, borderRadius: radius.lg,
            border: `1px solid ${colors.border}`, padding: spacing.lg,
            marginBottom: spacing.md,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: colors.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: spacing.sm,
            }}>
              Anna's tournament
            </div>
            <ExampleRow label="Matches played" value="5" />
            <ExampleRow label="Wins" value="3" />
            <ExampleRow label="Draws" value="1 (= 0.5 win)" />
            <ExampleRow label="Losses" value="1" />
            <ExampleRow label="Match score" value="3.5" highlight />
            <div style={{ height: 1, background: colors.border, margin: `${spacing.md}px 0` }} />
            <ExampleRow label="Final placement" value="3rd" />
            <ExampleRow label="Placement points" value="+22" highlight />
          </div>
          {BETTING_ENABLED && (
            <Text>
              Anna also placed 4 bets while resting: 3 won, 1 lost. Her betting
              profit is +2 (she gained 3 stakes and lost 1). If that's the
              second-best betting result of the tournament, she earns an extra
              +5 betting bonus.
            </Text>
          )}
          <div style={{
            background: colors.primaryMuted, borderRadius: radius.md,
            border: `1px solid rgba(34,197,94,0.25)`, padding: spacing.md,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                Total ranking points earned
              </span>
              <span style={{
                fontFamily: fonts.mono, fontSize: 20, fontWeight: 900,
                color: colors.primary,
              }}>
                +{BETTING_ENABLED ? 27 : 22}
              </span>
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section title="FAQ">
          <FAQ q="What if I tie with another player in placement?">
            You share the spot. If two players are tied for 2nd after the
            tiebreaker (matches won, then games won), both get the 2nd-place
            points (35) and the next player drops to 4th — there is no 3rd.
          </FAQ>
          <FAQ q="Can I edit a score after submitting?">
            Yes. While the tournament is live anyone in the pool can correct a
            score on the Standings tab. After the tournament finishes you have
            a 10-minute window to fix mistakes — after that, scores are locked.
          </FAQ>
          <FAQ q="Who can enter the score for a round?">
            Anyone in the tournament pool — including the players who were
            resting that round. Whoever submits first wins the race; the other
            devices update automatically.
          </FAQ>
          {BETTING_ENABLED && (
            <FAQ q="My bet shows as cancelled — what happened?">
              You have 60 seconds to cancel a bet after placing it. After that, or
              once the round ends, the bet is locked. If a round ends in a draw,
              your stake is refunded automatically.
            </FAQ>
          )}
          <FAQ q="Why are the top 2 ranked players never on the same team?">
            We try (not always possible) to put the two highest-ranked players
            in the pool on opposite teams. Keeps matches close and the
            competition meaningful. It's a soft rule — if the schedule can't
            satisfy it, fairness wins.
          </FAQ>
          <FAQ q="What's the difference between balance and ranking points?">
            {BETTING_ENABLED
              ? 'Balance is the in-tournament currency you use for betting. It resets every tournament. Ranking points are the long-term score you earn for placement and betting performance, summed across tournaments.'
              : 'Balance is your in-tournament score, reset every tournament. Ranking points are the long-term score you earn for placement across tournaments.'}
          </FAQ>
          <FAQ q="What does 'Save the date' mean?">
            A tournament announced ahead of time, with date and location but
            no players locked in yet. You can see it in your home before the
            host opens setup. The host then configures players when it's time
            to play.
          </FAQ>
        </Section>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
