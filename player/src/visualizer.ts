import { html } from 'lit';

export function renderVisualizer(playing: boolean): unknown {
  return html`
    <div class="viz${playing ? ' viz--active' : ''}" aria-hidden="true">
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
    </div>
  `;
}
