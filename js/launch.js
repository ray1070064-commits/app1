import { escapeHtml, formatMoney } from './ui.js';

function optionList(jobs = []) {
  if (!jobs.length) return '<option value="">等待後端載入工作清單</option>';
  return jobs.map(job => `
    <option value="${escapeHtml(job.key)}">
      ${escapeHtml(job.name)}｜日薪 ${escapeHtml(formatMoney(job.daily_salary))}
    </option>
  `).join('');
}

export function renderLaunchScreen(state) {
  const config = state.ui.startup || {};
  const balance = config.balance || {};
  const age = config.age || {};
  const jobs = Array.isArray(config.jobs) ? config.jobs : [];
  const ready = Boolean(state.connected && jobs.length);

  return `
    <section class="launch-screen">
      <div class="launch-orb launch-orb-a"></div>
      <div class="launch-orb launch-orb-b"></div>

      <header class="launch-header">
        <div class="launch-brand">
          <div class="launch-logo">CL</div>
          <div>
            <strong>資本人生</strong>
            <span>Capital Life</span>
          </div>
        </div>
        <div class="launch-status ${state.connected ? 'is-online' : 'is-offline'}">
          <i></i>${state.connected ? '遊戲核心已連線' : '等待遊戲核心連線'}
        </div>
      </header>

      <div class="launch-layout">
        <section class="launch-copy">
          <div class="launch-kicker">LIFE × CAPITAL × MARKET</div>
          <h1>在市場累積資本，<br>在人生承擔選擇。</h1>
          <p>股票是核心，但每一次時間推進都會牽動職涯、家庭、公司與政治世界。你的資產只是結果之一。</p>
          <div class="launch-features">
            <span>股票與多空交易</span>
            <span>職涯與人生事件</span>
            <span>公司與 IPO</span>
            <span>家庭與傳承</span>
          </div>
        </section>

        <section class="launch-card">
          <div class="launch-card-head">
            <div>
              <span>NEW GAME</span>
              <h2>開始新人生</h2>
            </div>
            <div class="launch-step">01</div>
          </div>

          <div class="launch-form-grid">
            <label class="launch-field">
              <span>起始資金</span>
              <input id="start-balance" class="input" type="number"
                min="${escapeHtml(balance.min ?? 10000)}"
                max="${escapeHtml(balance.max ?? 5000000)}"
                step="${escapeHtml(balance.step ?? 10000)}"
                value="${escapeHtml(balance.default ?? 100000)}" />
            </label>

            <label class="launch-field">
              <span>起始年齡</span>
              <input id="start-age" class="input" type="number"
                min="${escapeHtml(age.min ?? 18)}"
                max="${escapeHtml(age.max ?? 60)}"
                step="1"
                value="${escapeHtml(age.default ?? 25)}" />
            </label>

            <label class="launch-field launch-field-wide">
              <span>開局工作</span>
              <select id="start-job" class="select">${optionList(jobs)}</select>
            </label>

            <label class="launch-field launch-field-wide">
              <span>世界 Seed <small>可留空隨機</small></span>
              <input id="start-seed" class="input" type="text"
                maxlength="${escapeHtml(config.seed?.max_length ?? 64)}"
                placeholder="例如 CAPITAL-2026" autocomplete="off" />
            </label>
          </div>

          <label class="launch-tutorial">
            <input id="start-tutorial" type="checkbox" ${config.tutorial_default === false ? '' : 'checked'} />
            <span><strong>啟用股票核心教學</strong><small>第一次遊玩建議開啟</small></span>
          </label>

          <button class="launch-start-button" data-game-action="new_game" ${ready ? '' : 'disabled'}>
            <span>開始遊戲</span><b>→</b>
          </button>
          <button class="launch-load-button" data-game-action="load_save" ${state.connected ? '' : 'disabled'}>
            載入這台瀏覽器的加密存檔
          </button>

          <p class="launch-note">所有市場生成、事件機率與遊戲規則都在 Private Backend 執行；公開前端不保存核心公式。</p>
        </section>
      </div>

      <footer class="launch-footer">CAPITAL LIFE · PRIVATE GAME CORE · WEB CLIENT</footer>
    </section>
  `;
}
