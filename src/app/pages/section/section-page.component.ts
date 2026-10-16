import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-section-page',
  template: `
    <section class="section">
      <p class="section__group">{{ group() }}</p>
      <div class="section__panel">
        <h2>{{ title() }}</h2>
        <p>No records yet.</p>
      </div>
    </section>
  `,
  styles: `
    .section__group {
      margin: 0 0 12px;
      color: var(--color-accent);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .section__panel {
      padding: 24px;
      border: 1px solid var(--color-border);
      border-radius: 14px;
      background: var(--color-surface-2);
    }

    h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    p {
      margin: 0;
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data);

  readonly title = computed(() => String(this.data()?.['title'] ?? ''));
  readonly group = computed(() => String(this.data()?.['group'] ?? ''));
}
