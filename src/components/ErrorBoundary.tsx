import { Component, ReactNode } from 'react';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

interface Props {
  children: ReactNode;
  /** Optional label printed in the console alongside the error. */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
  stack: string;
}

/**
 * Catches runtime errors anywhere below it in the React tree.
 * Without this, a crash inside a child component (e.g. accessing a
 * property on a null / undefined value) blanks out the whole page
 * because React unmounts the entire subtree on a render error.
 *
 * Console logging is intentionally aggressive so we can debug from a
 * user screenshot of DevTools.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', stack: '' };
  // Track whether we've already attempted an auto-recovery for transient
  // errors (React #300 max-update-depth, etc). One shot — if it crashes
  // again after the auto-reset, show the fallback for real.
  private autoRecoverAttempted = false;
  private recoverTimerId: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(err: Error): State {
    return {
      hasError: true,
      message: err.message ?? 'Unknown error',
      stack: err.stack ?? '',
    };
  }

  componentWillUnmount() {
    if (this.recoverTimerId) clearTimeout(this.recoverTimerId);
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.label ? ' · ' + this.props.label : ''}] caught render error`,
      '\n  message:', err.message,
      '\n  stack:', err.stack,
      '\n  componentStack:', info.componentStack,
    );

    // Auto-recovery for transient bursts (React #300 = max update depth,
    // "rendering a different component" warnings, etc). One attempt only
    // — if the second render also crashes the user sees the fallback.
    const looksTransient =
      /invariant=300|Maximum update depth|while rendering a different component/i.test(
        err.message ?? '',
      );
    if (looksTransient && !this.autoRecoverAttempted) {
      this.autoRecoverAttempted = true;
      console.info(
        `[ErrorBoundary${this.props.label ? ' · ' + this.props.label : ''}] attempting auto-recover in 500ms`,
      );
      this.recoverTimerId = setTimeout(() => {
        this.setState({ hasError: false, message: '', stack: '' });
      }, 500);
    }
  }

  reset = () => {
    this.setState({ hasError: false, message: '', stack: '' });
  };

  reload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', background: colors.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: spacing.xl, gap: spacing.lg, textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: colors.destructiveMuted, border: `2px solid ${colors.destructive}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.destructive}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={{
          ...typeScale.headline, color: colors.text, margin: 0,
        }}>
          Something went wrong
        </h1>
        <p style={{
          ...typeScale.body, color: colors.textSecondary, margin: 0,
          maxWidth: 400, lineHeight: 1.5,
        }}>
          The app hit an unexpected error. Try reloading. If it keeps
          happening, send a screenshot of the DevTools console to the admin.
        </p>
        {/* Error detail — collapsible so we can debug from screenshots */}
        <details style={{
          maxWidth: 480, width: '100%',
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: radius.md, padding: spacing.md,
          textAlign: 'left',
        }}>
          <summary style={{
            ...typeScale.caption, color: colors.muted,
            cursor: 'pointer', userSelect: 'none',
          }}>
            Error detail
          </summary>
          <p style={{
            fontFamily: fonts.mono, fontSize: 13, color: colors.destructive,
            margin: `${spacing.sm}px 0 0`, wordBreak: 'break-word',
          }}>
            {this.state.message}
          </p>
          {this.state.stack && (
            <pre style={{
              fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary,
              margin: `${spacing.sm}px 0 0`,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 200, overflow: 'auto',
            }}>
              {this.state.stack.split('\n').slice(0, 10).join('\n')}
            </pre>
          )}
        </details>
        <div style={{ display: 'flex', gap: spacing.md }}>
          <button onClick={this.reset} style={{
            padding: `${spacing.md}px ${spacing.lg}px`,
            background: 'transparent', border: `1px solid ${colors.border}`,
            borderRadius: radius.sm, color: colors.text,
            fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Try again
          </button>
          <button onClick={this.reload} style={{
            padding: `${spacing.md}px ${spacing.lg}px`,
            background: colors.primary, border: 'none',
            borderRadius: radius.sm, color: '#000',
            fontFamily: fonts.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
