window.IFMVariantCountdown=(days,saved)=>`
<style>
.count{margin:0 16px;border-radius:20px;background:#15121c;border:1px solid #3f3946;overflow:hidden}
.count-top{display:flex;align-items:center;gap:22px;padding:22px 24px;border-bottom:1px solid var(--line)}
.count-figure{color:var(--gold);font-size:clamp(56px,20vw,86px);line-height:.95;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.06em}
.count-label{max-width:160px;font-size:16px;line-height:1.25;color:white}.count-label small{display:block;margin-top:8px;color:var(--muted);font-size:13px}
.count-event{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:16px 24px}
.count-event strong{display:block;font-size:17px}.count-event span{display:block;color:var(--muted);font-size:13px;margin-top:3px}.count-actions{display:flex;gap:8px;align-items:center}
.count-actions button{min-height:44px;padding:8px 12px;border:1px solid #706275;border-radius:12px;background:none;color:white;font-size:14px}.count-actions button[aria-pressed=true]{border-color:var(--lime);color:var(--lime)}
@media(max-width:400px){.count-event{grid-template-columns:1fr}.count-actions{width:100%}.count-actions button{flex:1}}
</style>
<section class="count" aria-label="Отсчёт до начала форума">
 <div class="count-top"><div class="count-figure">${days}</div><div class="count-label">${days?'дней до начала форума':'начало форума'}<small>19 января 2027 · Санкт-Петербург</small></div></div>
 <div class="count-event"><div><strong>Регистрация участников</strong><span>19 января · 09:00–10:00</span></div><div class="count-actions"><button type="button" data-action="open" data-id="a1">Подробнее</button><button type="button" data-action="save" data-id="a1" aria-pressed="${saved.has('a1')}">${saved.has('a1')?'Сохранено':'Сохранить'}</button></div></div>
</section>`;
