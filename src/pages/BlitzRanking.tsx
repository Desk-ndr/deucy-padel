import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { getRanking, RankedPlayer } from '@/services/rankingService';
import { supabase } from '@/integrations/supabase/client';

const FORM_ICONS: Record<string, { symbol: string; color: string; label: string }> = {
  hot:    { symbol: '▲▲', color: colors.primary,     label: 'On fire' },
  up:     { symbol: '▲',  color: colors.primary,     label: 'Rising' },
  down:   { symbol: '▼',  color: colors.destructive, label: 'Dropping' },
  stable: { symbol: '—',  color: colors.textSecondary, label: 'Stable' },
  new:    { symbol: '●',  color: colors.info,        label: 'New' },
};

export default function BlitzRanking() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminVerified, setAdminVerified] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<{ id: string; display_name: string; access_token: string }[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAllPlayers = async () => {
    const { data } = await supabase.from('players').select('id, display_name, access_token').order('display_name');
    setAllPlayers(data || []);
  };

  const handleAdminVerify = () => {
    if (adminCode === 'Valencia2026') {
      setAdminVerified(true);
      fetchAllPlayers();
    } else {
      setAddError('Wrong code');
      setTimeout(() => setAddError(null), 2000);
    }
  };

  const handleAddPlayer = async () => {
    if (!newName.trim()) return;
    const insert: any = { display_name: newName.trim() };
    if (newPhone.trim()) insert.phone = newPhone.trim();
    const { data, error } = await supabase.from('players').insert(insert).select('id, display_name, access_token').single();
    if (error) { setAddError(error.message); return; }
    if (data) {
      const link = window.location.origin + '/p/' + data.access_token;
      navigator.clipboard.writeText(link);
      setCopiedLink(data.display_name);
      setTimeout(() => setCopiedLink(null), 3000);
      setNewName('');
      setNewPhone('');
      fetchAllPlayers();
    }
  };

  const handleCopyLink = (token: string, name: string) => {
    const link = window.location.origin + '/p/' + token;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(name);
      setTimeout(() => setCopiedLink(null), 2000);
    }).catch(() => {
      // Fallback: select text for manual copy
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedLink(name);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const handleDeletePlayer = async (id: string) => {
    setDeleting(true);
    const { error } = await supabase.from('players').delete().eq('id', id);
    setDeleting(false);
    setDeleteConfirm(null);
    if (error) {
      setAddError(error.message);
      setTimeout(() => setAddError(null), 3000);
    } else {
      fetchAllPlayers();
    }
  };

  useEffect(() => {
    getRanking().then(({ data }) => {
      setRanking(data);
      setLoading(false);
    });
  }, []);


  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: `${spacing.xl}px ${spacing.lg}px` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs }}>
        <button
          onClick={() => navigate('/blitz')}
          aria-label="Back"
          style={{
            background: 'none', border: 'none', color: colors.text,
            fontSize: 20, lineHeight: 1, cursor: 'pointer',
            padding: 0, width: 23, height: 23, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ←
        </button>
        <h1 style={{
          flex: 1, minWidth: 0,
          fontFamily: fonts.sans, fontSize: 18, fontWeight: 700,
          color: colors.text, margin: 0, lineHeight: 1.1,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Deucy Ranking
        </h1>
        <button
          onClick={() => navigate('/blitz/how-it-works')}
          aria-label="How it works"
          title="How it works"
          style={{
            width: 23, height: 23, borderRadius: '50%',
            background: 'transparent',
            border: '1px solid #75d4e6',
            color: '#75d4e6',
            cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontFamily: fonts.sans,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ?
        </button>
        <button
          onClick={() => setShowManage(!showManage)}
          style={{
            background: 'none', border: `1px solid ${colors.border}`,
            borderRadius: radius.sm, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.2s',
          }}
          title="Manage players"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </button>
      </div>

      {/* Subtitle on its own row, indented to roughly sit under the title */}
      <p style={{
        fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted,
        margin: `0 0 ${spacing.xl}px`,
        marginLeft: 23 + 16, // back-button width + gap, so it lines up under the H1
      }}>
        best 4 of 6
      </p>

      {/* Manage Players Panel */}
      {showManage && (
        <div style={{
          position: 'relative',
          background: colors.surface, border: '1px solid ' + colors.border,
          borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl,
        }}>
          {/* Close (top-right) — also clears the admin gate so reopening
              requires the code again. */}
          <button
            onClick={() => {
              setShowManage(false);
              setAdminCode('');
              setAdminVerified(false);
              setAddError(null);
            }}
            aria-label="Close"
            title="Close"
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              width: 24, height: 24, borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {!adminVerified ? (
            <div>
              <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, margin: 0, marginBottom: spacing.md }}>
                Add or manage players in the pool. Enter admin code to continue.
              </p>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <input
                  type="password"
                  placeholder="Admin code"
                  value={adminCode}
                  onChange={e => setAdminCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminVerify()}
                  style={{
                    flex: 1, padding: spacing.md, background: colors.bg, border: '1px solid ' + colors.border,
                    borderRadius: radius.sm, color: colors.text, fontFamily: fonts.sans, fontSize: 14,
                  }}
                />
                <button onClick={handleAdminVerify} style={{
                  padding: spacing.md + 'px ' + spacing.lg + 'px', background: colors.primary,
                  border: 'none', borderRadius: radius.sm, color: '#000', fontWeight: 700,
                  fontFamily: fonts.sans, fontSize: 14, cursor: 'pointer',
                }}>
                  Unlock
                </button>
              </div>
              {addError && <p style={{ color: colors.destructive, fontSize: 14, marginTop: spacing.sm, margin: 0 }}>{addError}</p>}
            </div>
          ) : (
            <div>
              {/* Add new player form */}
              <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.primary, fontWeight: 600, margin: 0, marginBottom: spacing.md }}>
                Add Player
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.md }}>
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  <input
                    placeholder="Name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    style={{
                      flex: 1, padding: spacing.md, background: colors.bg, border: '1px solid ' + colors.border,
                      borderRadius: radius.sm, color: colors.text, fontFamily: fonts.sans, fontSize: 14,
                      boxSizing: 'border-box' as const, minWidth: 0,
                    }}
                  />
                  <input
                    placeholder="Phone (opt.)"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    style={{
                      flex: 1, padding: spacing.md, background: colors.bg, border: '1px solid ' + colors.border,
                      borderRadius: radius.sm, color: colors.text, fontFamily: fonts.sans, fontSize: 14,
                      boxSizing: 'border-box' as const, minWidth: 0,
                    }}
                  />
                </div>
                <button onClick={handleAddPlayer} style={{
                  width: '100%', padding: spacing.md + 'px', background: colors.primary,
                  border: 'none', borderRadius: radius.sm, color: '#000', fontWeight: 700,
                  fontFamily: fonts.sans, fontSize: 14, cursor: 'pointer',
                }}>
                  Add Player
                </button>
              </div>
              {addError && <p style={{ color: colors.destructive, fontSize: 14, margin: 0, marginBottom: spacing.sm }}>{addError}</p>}
              {copiedLink && <p style={{ color: colors.primary, fontSize: 14, margin: 0, marginBottom: spacing.sm }}>Link copied for {copiedLink}!</p>}

              {/* Player pool list */}
              <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, fontWeight: 600, margin: 0, marginTop: spacing.lg, marginBottom: spacing.sm }}>
                Pool ({allPlayers.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                {allPlayers.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: spacing.sm + 'px ' + spacing.md + 'px',
                    background: colors.bg, borderRadius: radius.sm, border: '1px solid ' + colors.border,
                  }}>
                    <span style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.text, flex: 1 }}>{p.display_name}</span>
                    <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
                      <button
                        onClick={() => handleCopyLink(p.access_token, p.display_name)}
                        style={{
                          background: copiedLink === p.display_name ? colors.primaryMuted : 'none',
                          border: '1px solid ' + (copiedLink === p.display_name ? colors.primary : colors.border),
                          borderRadius: radius.sm,
                          padding: spacing.xs + 'px ' + spacing.sm + 'px', cursor: 'pointer',
                          fontFamily: fonts.sans, fontSize: 14,
                          color: copiedLink === p.display_name ? colors.primary : colors.textSecondary,
                          fontWeight: copiedLink === p.display_name ? 700 : 400,
                          transition: 'all 0.2s',
                          minWidth: 80, textAlign: 'center' as const,
                        }}
                      >
                        {copiedLink === p.display_name ? 'Copied!' : 'Copy Link'}
                      </button>
                      {deleteConfirm === p.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleDeletePlayer(p.id)}
                            disabled={deleting}
                            style={{
                              background: colors.destructive, border: 'none', borderRadius: radius.sm,
                              padding: spacing.xs + 'px ' + spacing.sm + 'px', cursor: 'pointer',
                              fontFamily: fonts.sans, fontSize: 14, color: '#fff', fontWeight: 700,
                              opacity: deleting ? 0.5 : 1,
                            }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            style={{
                              background: 'none', border: '1px solid ' + colors.border, borderRadius: radius.sm,
                              padding: spacing.xs + 'px ' + spacing.sm + 'px', cursor: 'pointer',
                              fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary,
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: spacing.xs + 'px', display: 'flex', alignItems: 'center',
                            color: colors.muted, opacity: 0.5,
                          }}
                          title={'Remove ' + p.display_name}
                        >
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ color: colors.textSecondary, textAlign: 'center', fontFamily: fonts.sans }}>
          Loading...
        </p>
      )}

      {/* Empty */}
      {!loading && ranking.length === 0 && (
        <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.textSecondary }}>
          <p style={{ fontFamily: fonts.sans, fontSize: typeScale.body.fontSize }}>No ranking yet.</p>
          <p style={{ fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, marginTop: spacing.sm }}>Complete a tournament to get started!</p>
        </div>
      )}

      {/* Table Header */}
      {!loading && ranking.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 56px 44px 44px 28px',
          gap: spacing.sm,
          padding: `0 ${spacing.lg}px ${spacing.sm}px`,
          alignItems: 'center',
        }}>
          <span style={{ ...headerStyle, textAlign: 'center' }}>#</span>
          <span style={headerStyle}>Player</span>
          <span style={{ ...headerStyle, textAlign: 'right' }}>Pts</span>
          <span style={{ ...headerStyle, textAlign: 'center' }}>+/-</span>
          <span style={{ ...headerStyle, textAlign: 'center' }}>W%</span>
          <span style={{ ...headerStyle, textAlign: 'center' }}>Form</span>
        </div>
      )}

      {/* Ranking Rows */}
      {!loading && ranking.map((player, index) => {
        const isExpanded = expanded === player.playerId;
        const isFirst = index === 0;
        const posColor = index === 0 ? colors.gold : index === 1 ? colors.silver : index === 2 ? colors.bronze : colors.textSecondary;
        const formInfo = FORM_ICONS[player.form] || FORM_ICONS.new;

        return (
          <div
            key={player.playerId}
            onClick={() => setExpanded(isExpanded ? null : player.playerId)}
            style={{
              background: isFirst ? colors.primaryMuted : (index % 2 === 0 ? colors.surface : colors.bg),
              border: `1px solid ${isFirst ? colors.primary : colors.border}`,
              borderRadius: radius.lg,
              padding: `${spacing.md}px ${spacing.lg}px`,
              marginBottom: spacing.xs,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Main row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 56px 44px 44px 28px',
              gap: spacing.sm,
              alignItems: 'center',
            }}>
              {/* Position */}
              <div style={{
                width: 25, height: 25, borderRadius: '50%',
                background: isFirst ? colors.primary : 'transparent',
                border: isFirst ? 'none' : `1.5px solid ${posColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fonts.mono, fontSize: 14, fontWeight: 700,
                color: isFirst ? '#000' : posColor,
              }}>
                {index + 1}
              </div>

              {/* Name + tournaments count */}
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <p style={{
                  fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, fontWeight: 600,
                  color: colors.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'flex', alignItems: 'center', gap: spacing.xs,
                }}>
                  {player.displayName}
                  {player.isCrownHolder && <svg width={14} height={14} viewBox="0 0 24 24" fill={colors.accent} stroke="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}><path d="M2 20h20l-2-8-4 4-4-8-4 8-4-4z" /></svg>}
                </p>
                <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.muted, margin: 0, marginTop: 1 }}>
                  {player.tournamentsPlayed}T
                </p>
              </div>

              {/* Points — hero stat */}
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontFamily: fonts.mono, fontSize: 18, fontWeight: 900,
                  color: isFirst ? colors.primary : colors.text,
                }}>
                  {player.rankingScore}
                </span>
              </div>

              {/* Delta */}
              <div style={{ textAlign: 'center' }}>
                {player.pointsDelta !== null && player.pointsDelta !== 0 ? (
                  <span style={{
                    fontFamily: fonts.mono, fontSize: 14, fontWeight: 700,
                    color: player.pointsDelta > 0 ? colors.primary : colors.destructive,
                  }}>
                    {player.pointsDelta > 0 ? '+' : ''}{player.pointsDelta}
                  </span>
                ) : (
                  <span style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.muted }}>—</span>
                )}
              </div>

              {/* Win Rate — secondary */}
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontFamily: fonts.mono, fontSize: 14, fontWeight: 500,
                  color: colors.muted,
                }}>
                  {player.winRate}%
                </span>
              </div>

              {/* Form */}
              <div style={{ textAlign: 'center' }} title={formInfo.label}>
                <span style={{
                  fontFamily: fonts.mono, fontSize: 14, fontWeight: 800,
                  color: formInfo.color,
                }}>
                  {formInfo.symbol}
                </span>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
                <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, margin: 0, marginBottom: spacing.sm }}>
                  Best 4 results:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  {player.bestResults.map((br, i) => {
                    const dateStr = br.date
                      ? new Date(br.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '';
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: spacing.sm,
                        background: colors.surfaceElevated,
                        borderRadius: radius.sm,
                        padding: `${spacing.xs}px ${spacing.md}px`,
                      }}>
                        <span style={{
                          fontFamily: fonts.mono, fontSize: 14, fontWeight: 700,
                          color: colors.primary, minWidth: 28,
                        }}>
                          {br.points}
                        </span>
                        <span style={{
                          flex: 1, fontFamily: fonts.sans, fontSize: 14,
                          color: colors.text, fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {br.tournamentName}
                        </span>
                        <span style={{
                          fontFamily: fonts.sans, fontSize: 12, color: colors.muted,
                        }}>
                          {dateStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Form legend */}
      {!loading && ranking.length > 0 && (
        <div style={{
          marginTop: spacing.lg, padding: spacing.md,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'center', gap: spacing.md,
        }}>
          {Object.entries(FORM_ICONS).map(([key, info]) => (
            <span key={key} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: fonts.sans, fontSize: 13,
              color: colors.textSecondary,
            }}>
              <span style={{
                fontFamily: fonts.mono, fontWeight: 800,
                color: info.color, minWidth: 18, textAlign: 'center',
              }}>
                {info.symbol}
              </span>
              {info.label}
            </span>
          ))}
        </div>
      )}

      {/* Bottom spacer for nav */}
      <div style={{ height: 80 }} />
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 14,
  fontWeight: 600,
  color: colors.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};
