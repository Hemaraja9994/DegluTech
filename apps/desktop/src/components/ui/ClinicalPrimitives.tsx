import React from 'react';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'high' | 'moderate' | 'low';

const badgeTones: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: '#eef2ef', fg: '#3e5852', border: '#dce5df' },
  info: { bg: '#e4eee7', fg: '#075985', border: '#bae6fd' },
  success: { bg: '#ddefe5', fg: '#1f5c43', border: '#c9ddd0' },
  warning: { bg: '#fbefd6', fg: '#7a4e00', border: '#f3dda8' },
  danger: { bg: '#fbe4dd', fg: '#8e3420', border: '#f5cdbf' },
  high: { bg: '#fbe4dd', fg: '#8e3420', border: '#f5cdbf' },
  moderate: { bg: '#fbefd6', fg: '#7a4e00', border: '#f3dda8' },
  low: { bg: '#ddefe5', fg: '#1f5c43', border: '#c9ddd0' },
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
        fontSize: 14,
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
  accent = '#204a6b',
  action,
  className,
}) => (
  <section
    className={['clinical-section-header deglutech-section-intro', className].filter(Boolean).join(' ')}
    style={{
      background: '#ffffff',
      border: '1px solid #dce5df',
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
              color: '#4d6660',
              fontSize: 13,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0,
            }}
          >
            {eyebrow}
          </p>
        )}
        <h3 style={{ margin: 0, color: '#15302a', fontSize: 24, lineHeight: 1.2, fontWeight: 850 }}>
          {title}
        </h3>
        {description && (
          <p style={{ margin: '7px 0 0', color: '#3e5852', fontSize: 16, lineHeight: 1.5, maxWidth: 860 }}>
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
      color: '#4d6660',
      margin: '2px 0',
    }}
  >
    <span style={{ borderTop: '1px dashed #c9d7ce' }} />
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        border: '1px solid #dce5df',
        borderRadius: 999,
        background: '#ffffff',
        padding: '5px 11px',
        fontSize: 14,
        fontWeight: 800,
      }}
    >
      {icon}
      {label}
    </span>
    <span style={{ borderTop: '1px dashed #c9d7ce' }} />
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
  accent = '#204a6b',
  active = false,
  children,
  onClick,
  ariaPressed,
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    width: '100%',
      border: `1px solid ${active ? accent : '#dce5df'}`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 8,
      background: active ? '#f5f8f5' : '#ffffff',
      boxShadow: active ? '0 0 0 3px rgba(31, 92, 74, 0.10)' : 'none',
      padding: '14px 16px',
    display: 'grid',
    gap: 12,
    color: '#15302a',
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
