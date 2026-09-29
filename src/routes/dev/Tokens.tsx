// /dev/tokens — every design token on one page, for reviewing the design
// system by eye. Hidden (not linked from the app); removed in Milestone 9.

import { useState } from 'react';
import {
  contrastRatio,
  durations,
  habitColorKeys,
  radii,
  spacing,
  themes,
  typeScale,
  vars,
  type DurationKey,
  type Theme,
} from '../../theme/index.ts';
import styles from './Tokens.module.css';

const colorVar = vars.color as Record<string, string>;

function ThemePanel({ theme }: { theme: Theme }) {
  return (
    <div data-theme={theme.name} className={styles.panel}>
      <h3 className={styles.panelTitle}>{theme.name}</h3>

      <div className={styles.swatches}>
        {Object.entries(theme.color).map(([key, hex]) => {
          const isText = key.startsWith('text') || key === 'accent' || key === 'danger';
          return (
            <div key={key} className={styles.swatch}>
              <div className={styles.chip} style={{ background: colorVar[key] }} />
              <div>
                <div className={styles.name}>{key}</div>
                <div className={styles.meta}>
                  {hex}
                  {isText && ` · ${contrastRatio(hex, theme.color.background).toFixed(1)}:1`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h4 className={styles.subTitle}>Habit colours</h4>
      <div className={styles.habitRow}>
        {habitColorKeys.map((key) => (
          <div key={key} className={styles.habit}>
            <div className={styles.dot} style={{ background: vars.habit[key] }} />
            <span className={styles.meta}>{key}</span>
          </div>
        ))}
      </div>

      <h4 className={styles.subTitle}>Sample card</h4>
      <div className={styles.sampleCard}>
        <div className={styles.dot} style={{ background: vars.habit.teal }} />
        <div className={styles.sampleText}>
          <div>Meditate</div>
          <div className={styles.meta}>12-day streak</div>
        </div>
        <button className={styles.sampleButton}>Done</button>
      </div>
    </div>
  );
}

function DurationDemo({ name }: { name: DurationKey }) {
  const [moved, setMoved] = useState(false);
  return (
    <div className={styles.durationRow}>
      <button className={styles.play} onClick={() => setMoved((m) => !m)}>
        {name} · {durations[name]} ms
      </button>
      <div className={styles.track}>
        <div
          className={styles.runner}
          style={{
            transitionDuration: vars.duration[name],
            transform: moved ? 'translateX(calc(var(--track) - 100%))' : 'none',
          }}
        />
      </div>
    </div>
  );
}

export function Tokens() {
  return (
    <main className={styles.page}>
      <header>
        <h1 className={styles.title}>Design tokens</h1>
        <p className={styles.lead}>
          Everything in <code>src/theme/</code>. Contrast ratios are against the background; text
          needs at least 4.5:1.
        </p>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>Colour</h2>
        <div className={styles.panels}>
          <ThemePanel theme={themes.light} />
          <ThemePanel theme={themes.dark} />
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Type scale</h2>
        <div className={styles.stack}>
          {Object.entries(typeScale).map(([key, t]) => (
            <div key={key} className={styles.typeRow}>
              <span className={styles.meta}>
                {key} · {t.size}px / {t.weight} / {t.lineHeight}
              </span>
              <span
                style={{
                  fontSize: `var(--font-size-${key})`,
                  fontWeight: `var(--font-weight-${key})`,
                  lineHeight: `var(--line-height-${key})`,
                  letterSpacing: `var(--letter-spacing-${key})`,
                }}
              >
                Small steps, every day
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Spacing</h2>
        <div className={styles.stack}>
          {Object.entries(spacing).map(([key, px]) => (
            <div key={key} className={styles.spaceRow}>
              <span className={styles.meta}>
                {key} · {px}
              </span>
              <div
                className={styles.bar}
                style={{ width: vars.space[key as keyof typeof spacing] }}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Radii &amp; shadows</h2>
        <div className={styles.boxes}>
          {Object.entries(radii).map(([key, px]) => (
            <div
              key={key}
              className={styles.box}
              style={{ borderRadius: vars.radius[key as keyof typeof radii] }}
            >
              <span className={styles.meta}>
                radius {key}
                <br />
                {px}
              </span>
            </div>
          ))}
          {(['sm', 'md'] as const).map((key) => (
            <div key={key} className={styles.box} style={{ boxShadow: vars.shadow[key] }}>
              <span className={styles.meta}>shadow {key}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Motion</h2>
        <p className={styles.lead}>Tap a duration to play it.</p>
        <div className={styles.stack}>
          {(Object.keys(durations) as DurationKey[]).map((key) => (
            <DurationDemo key={key} name={key} />
          ))}
        </div>
      </section>
    </main>
  );
}
