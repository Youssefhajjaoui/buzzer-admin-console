import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @switch (name()) {
        @case ('dashboard') {
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
        }
        @case ('matches') {
          <path d="M4 7h16M4 12h16M4 17h10" />
        }
        @case ('competitions') {
          <path d="M7 4h10v3a5 5 0 0 1-10 0zM8 20h8M12 12v8M6 6H4a4 4 0 0 0 4 4M18 6h2a4 4 0 0 1-4 4" />
        }
        @case ('sports') {
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4c2 2.5 2 13.5 0 16M12 4c-2 2.5-2 13.5 0 16M4.5 9h15M4.5 15h15" />
        }
        @case ('venues') {
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.2" />
        }
        @case ('articles') {
          <path d="M6 4h9l3 3v13H6zM15 4v3h3M8 11h8M8 15h6" />
        }
        @case ('media') {
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="m8 15 2.5-3 2 2.2L16 10l2 5" />
        }
        @case ('notifications') {
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5zM10 19a2 2 0 0 0 4 0" />
        }
        @case ('payments') {
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        }
        @case ('invoices') {
          <path d="M7 3h10v18l-2-1.4L13 21l-2-1.4L9 21l-2-1.4zM9 8h6M9 12h6" />
        }
        @case ('reports') {
          <path d="M4 19V5M4 19h16" />
          <path d="M8 16v-4M12 16V8M16 16v-6" />
        }
        @case ('users') {
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0M17 11a2.5 2.5 0 1 0-1.5-4.5M16.5 19a5 5 0 0 0-2-3.5" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 3.5v2.2M12 18.3v2.2M4.8 6.6l1.6 1.6M17.6 15.8l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.4l1.6-1.6M17.6 8.2l1.6-1.6"
          />
        }
        @case ('audit') {
          <path d="M8 4h8v16H8zM10 8h4M10 12h4M10 16h2" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6 6 18" />
        }
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('collapse') {
          <path d="M15 6 9 12l6 6" />
        }
        @case ('expand') {
          <path d="m9 6 6 6-6 6" />
        }
        @case ('logout') {
          <path d="M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2" />
          <path d="M14 12H3m0 0 3-3M3 12l3 3" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
}
