import React from 'react';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'high' | 'moderate' | 'low';

const badgeTones: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: '#f1f5f9', fg: '#334155', border: '#d7e3ea' },
  info: { bg: '#e0f2fe', fg: '#075985', border: '#bae6fd' },
  success: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
  warning: { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' },
  danger: { bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' },
  high: { bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' },
  moderate: { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' },
  low: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
};

interface FloatingBadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const FloatingBadge: React.FC<FloatingBadgeProps> = ({
  children,
  tone = 'neutral',
  icon,
  style,
}) => {
  const palette = badgeTones[tone];

  return (
    <span
      className="clinical-floating-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        width: 'fit-content',
        borderRadius: 999,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.fg,
        padding: '5px 10px',
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
};

interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  description,
  icon,
  accent = '#0f8ea8',
  action,
  className,
}) => (
  <section
    className={['clinical-section-header deglutech-section-intro', className].filter(Boolean).join(' ')}
    style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${accent}`,
      borderRadius: 8,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 18,
      boxShadow: 'none',
    }}
  >
    <div style={{ display: 'grid', gridTemplateColumns: icon ? '40px minmax(0, 1fr)' : '1fr', gap: 12, minWidth: 0 }}>
      {icon && (
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            background: `${accent}12`,
            color: accent,
            boxShadow: `inset 0 0 0 1px ${accent}20`,
          }}
        >
          {icon}
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <p
            style={{
              margin: '0 0 4px',
              color: '#64748b',
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0,
            }}
          >
            {eyebrow}
          </p>
        )}
        <h3 style={{ margin: 0, color: '#10202f', fontSize: 22, lineHeight: 1.2, fontWeight: 850 }}>
          {title}
        </h3>
        {description && (
          <p style={{ margin: '7px 0 0', color: '#425466', fontSize: 14, lineHeight: 1.5, maxWidth: 860 }}>
            {description}
          </p>
        )}
      </div>
    </div>
    {action && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{action}</div>}
  </section>
);

interface HeaderSeparatorProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export const HeaderSeparator: React.FC<HeaderSeparatorProps> = ({ label, icon }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(16px, 1fr) auto minmax(16px, 1fr)',
      gap: 12,
      alignItems: 'center',
      color: '#64748b',
      margin: '2px 0',
    }}
  >
    <span style={{ borderTop: '1px dashed #cbd5e1' }} />
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        border: '1px solid #d7e3ea',
        borderRadius: 999,
        background: '#ffffff',
        padding: '5px 11px',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {icon}
      {label}
    </span>
    <span style={{ borderTop: '1px dashed #cbd5e1' }} />
  </div>
);

interface TicketBarProps {
  accent?: string;
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  ariaPressed?: boolean;
  style?: React.CSSProperties;
}

export const TicketBar: React.FC<TicketBarProps> = ({
  accent = '#0f8ea8',
  active = false,
  children,
  onClick,
  ariaPressed,
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    width: '100%',
      border: `1px solid ${active ? accent : '#e2e8f0'}`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 8,
      background: active ? '#f7fbfd' : '#ffffff',
      boxShadow: active ? '0 0 0 3px rgba(17, 138, 163, 0.10)' : 'none',
      padding: '14px 16px',
    display: 'grid',
    gap: 12,
    color: '#10202f',
    textAlign: 'left',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  if (onClick) {
    return (
      <button
        type="button"
        className="clinical-ticket-bar"
        onClick={onClick}
        aria-pressed={ariaPressed}
        style={baseStyle}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="clinical-ticket-bar" style={baseStyle}>
      {children}
    </div>
  );
};
